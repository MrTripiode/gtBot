"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.qnaItemData = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _lodash = _interopRequireDefault(require("lodash"));

var _ms = _interopRequireDefault(require("ms"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Handles QnA Maker API downcasing all key-values in metadata
const markUpperCase = str => str.replace(/([A-Z])/g, 'a-a-a-a-a$1a-a-a-a-a');

const restoreUpperCase = str => str.replace(/a-a-a-a-a([a-zA-Z])a-a-a-a-a/g, (_, c) => c.toUpperCase());

const keysToRestore = {
  redirectflow: 'redirectFlow',
  redirectnode: 'redirectNode'
};

const qnaItemData = ({
  questions,
  answer,
  metadata
}) => ({
  questions,
  answer,
  ..._lodash.default.fromPairs(metadata.map(({
    name,
    value
  }) => [keysToRestore[name] || name, restoreUpperCase(value)])),
  enabled: (metadata.find(({
    name
  }) => name === 'enabled') || {}).value === 'true'
});

exports.qnaItemData = qnaItemData;

const prepareMeta = data => _lodash.default.chain(data).pick(['enabled', 'action', 'redirectFlow', 'redirectNode', 'category']).toPairs().map(([name, value]) => ({
  name,
  value: _lodash.default.isString(value) ? markUpperCase(value) : value
})).filter(({
  value
}) => !_lodash.default.isUndefined(value) && value !== '').value();

const getFieldFromMetadata = (metadata, field) => metadata.find(({
  name
}) => name === field);

class MicrosoftQnaMakerStorage {
  constructor(bp, config) {
    _defineProperty(this, "bp", void 0);

    _defineProperty(this, "client", void 0);

    _defineProperty(this, "knowledgebase", void 0);

    _defineProperty(this, "endpointKey", void 0);

    _defineProperty(this, "knowledgebaseName", void 0);

    _defineProperty(this, "questions", void 0);

    _defineProperty(this, "categories", void 0);

    _defineProperty(this, "publish", () => this.client.post(`/knowledgebases/${this.knowledgebase.id}`));

    _defineProperty(this, "patchKb", params => this.client.patch(`/knowledgebases/${this.knowledgebase.id}`, params));

    _defineProperty(this, "invalidateCache", () => this.questions = undefined);

    _defineProperty(this, "waitForOperationToFinish", async (operationId, description) => {
      await Promise.delay(200);

      while (true) {
        const {
          data,
          headers: {
            'retry-after': timeout
          }
        } = await this.client.get(`/operations/${operationId}`);
        this.bp.logger.info(`[QNA] QnA Maker ${description} #${operationId} ${data.operationState}`);

        if (data.operationState === 'Failed') {
          this.bp.logger.error(data.errorResponse.error);
        }

        if (!['Running', 'NotStarted'].includes(data.operationState)) {
          return;
        }

        this.bp.logger.info(`[QNA] Waiting 3s for ${data.operationState} QnA Maker's #${operationId} operation to finish...`);
        await Promise.delay((0, _ms.default)('3s'));
      }
    });

    this.bp = bp;
    const baseURL = 'https://westus.api.cognitive.microsoft.com/qnamaker/v4.0';
    const headers = {
      'Ocp-Apim-Subscription-Key': config.qnaMakerApiKey
    };
    Object.assign(this, {
      client: _axios.default.create({
        baseURL,
        headers
      }),
      knowledgebaseName: config.qnaMakerKnowledgebase
    });

    if (config.qnaCategories && config.qnaCategories.length > 0) {
      this.categories = config.qnaCategories.split(',');
    }
  }

  async initialize() {
    const isBpKnowledgbase = ({
      name
    }) => name === this.knowledgebaseName;

    const {
      data: {
        knowledgebases: initialKnowledgebases
      }
    } = await this.client.get('/knowledgebases/');
    const existingKb = initialKnowledgebases.find(isBpKnowledgbase);

    if (existingKb) {
      this.knowledgebase = existingKb;
    } else {
      const {
        data: {
          operationId
        }
      } = await this.client.post('/knowledgebases/create', {
        name: this.knowledgebaseName
      });
      await this.waitForOperationToFinish(operationId, 'creating KB');
      const {
        data: {
          knowledgebases
        }
      } = await this.client.get('/knowledgebases/');
      this.knowledgebase = knowledgebases.find(isBpKnowledgbase);
    }

    this.endpointKey = (await this.client.get('/endpointkeys')).data.primaryEndpointKey;
  }

  async update(data, id) {
    const prevData = await this.getQuestion(id);

    const questionsChanged = _lodash.default.isEqual(data.questions, prevData.questions);

    const questionsToAdd = _lodash.default.difference(data.questions, prevData.questions);

    const questionsToDelete = _lodash.default.difference(prevData.questions, data.questions);

    const {
      data: {
        operationId
      }
    } = await this.patchKb({
      update: {
        qnaList: [{
          id,
          answer: data.answer,
          ...(questionsChanged ? {} : {
            questions: {
              add: questionsToAdd,
              delete: questionsToDelete
            }
          }),
          metadata: {
            delete: prevData['metadata'],
            add: prepareMeta(data)
          }
        }]
      }
    });
    await this.waitForOperationToFinish(operationId, 'Updating QNA Items');
    this.invalidateCache();
    await this.publish();
    return id;
  }

  async insert(qna) {
    const qnas = _lodash.default.isArray(qna) ? qna : [qna];
    const {
      data: {
        operationId
      }
    } = await this.patchKb({
      add: {
        qnaList: qnas.map(qna => ({
          answer: qna.answer,
          questions: qna.questions.reverse(),
          // To be able to prepend questions
          metadata: prepareMeta(qna)
        }))
      }
    });
    await this.waitForOperationToFinish(operationId, 'inserting qnaItems');
    this.invalidateCache();
    await this.publish(); // TODO: should return ids (for consistency)
  }

  async fetchAllQuestions() {
    if (!this.questions) {
      const {
        data: {
          qnaDocuments
        }
      } = await this.client.get(`/knowledgebases/${this.knowledgebase.id}/test/qna/`); // Showing latest items first

      this.questions = qnaDocuments.reverse().map(doc => ({ ...doc,
        questions: doc.questions.reverse()
      }));
    }

    return this.questions;
  }

  async fetchQuestionsWithPaging(paging) {
    let questions = await this.fetchAllQuestions();

    if (paging && paging.start && paging.count) {
      questions = questions.slice(paging.start, paging.start + paging.count);
    }

    return questions.map(qna => ({
      id: qna.id,
      data: qnaItemData(qna)
    }));
  }

  async filterByCategoryAndQuestion({
    question,
    categories
  }) {
    const allQuestions = await this.fetchAllQuestions();
    const filteredQuestions = allQuestions.filter(({
      questions,
      metadata
    }) => {
      const category = getFieldFromMetadata(metadata, 'category');
      const isRightId = questions.join('\n').toLowerCase().indexOf(question.toLowerCase()) !== -1;

      if (!categories.length) {
        return isRightId;
      }

      if (!question) {
        return category && categories.indexOf(category.value) !== -1;
      }

      return isRightId && category && categories.indexOf(category.value) !== -1;
    });
    const questions = filteredQuestions.reverse().map(qna => ({
      id: qna.id,
      data: qnaItemData(qna)
    }));
    return questions;
  }

  async getQuestions({
    question = '',
    categories = []
  }, {
    limit = 50,
    offset = 0
  }) {
    let items = [];
    let count = 0;

    if (!(question || categories.length)) {
      items = await this.fetchQuestionsWithPaging({
        start: offset ? parseInt(offset) : undefined,
        count: limit ? parseInt(limit) : undefined
      });
      count = await this.count();
    } else {
      const tmpQuestions = await this.filterByCategoryAndQuestion({
        question,
        categories
      });
      items = tmpQuestions.slice(offset, offset + limit);
      count = tmpQuestions.length;
    }

    return {
      items,
      count
    };
  }

  async getQuestion(id) {
    const question = (await this.fetchAllQuestions()).find(({
      id: qnaId
    }) => qnaId == id);
    return question && qnaItemData(question);
  }

  async count() {
    const questions = await this.fetchAllQuestions();
    return questions.length;
  }

  async answersOn(question, category = undefined) {
    const metadataFilters = category ? [{
      name: 'category',
      value: category
    }] : [];
    const resp = await _axios.default.post(`/qnamaker/knowledgebases/${this.knowledgebase.id}/generateAnswer`, {
      question,
      top: 10,
      strictFilters: [{
        name: 'enabled',
        value: true
      }, ...metadataFilters]
    }, {
      baseURL: this.knowledgebase.hostName,
      headers: {
        Authorization: `EndpointKey ${this.endpointKey}`
      }
    });
    const {
      data: {
        answers
      }
    } = resp;
    return _lodash.default.orderBy(answers, ['score'], ['desc']).map(answer => ({ ..._lodash.default.pick(answer, ['questions', 'answer', 'id', 'metadata', 'enabled']),
      confidence: answer.score / 100,
      ...qnaItemData(answer)
    }));
  }

  async delete(id, statusCb) {
    const ids = _lodash.default.isArray(id) ? id : [id];

    if (ids.length === 0) {
      return;
    }

    const maxQuestionsToDeletePerRequest = 300;
    await Promise.each(_lodash.default.chunk(ids, maxQuestionsToDeletePerRequest), async (idsChunk, i) => {
      const {
        data: {
          operationId
        }
      } = await this.client.patch(`/knowledgebases/${this.knowledgebase.id}`, {
        delete: {
          ids: idsChunk
        }
      });
      await this.waitForOperationToFinish(operationId, 'deleting qnaItems');
      statusCb && statusCb(Math.min((i + 1) * maxQuestionsToDeletePerRequest, ids.length));
    });
    this.invalidateCache();
    await this.publish();
  }

  getCategories() {
    return this.categories;
  }

  hasCategories() {
    return this.categories && this.categories.length > 0;
  }

}

exports.default = MicrosoftQnaMakerStorage;