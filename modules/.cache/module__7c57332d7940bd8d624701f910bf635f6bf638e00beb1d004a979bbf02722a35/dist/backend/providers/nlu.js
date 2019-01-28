"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.NLU_PREFIX = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _lodash = _interopRequireDefault(require("lodash"));

var _generate = _interopRequireDefault(require("nanoid/generate"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const safeId = (length = 10) => (0, _generate.default)('1234567890abcdefghijklmnopqrsuvwxyz', length);

const slugify = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

const getQuestionId = ({
  questions
}) => `${safeId()}_${slugify(questions[0]).replace(/^_+/, '').substring(0, 50).replace(/_+$/, '')}`;

const NLU_PREFIX = '__qna__';
exports.NLU_PREFIX = NLU_PREFIX;

const getIntentId = id => `${NLU_PREFIX}${id}`;

const normalizeQuestions = questions => questions.map(q => q.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

class Storage {
  constructor(bp, config, botId) {
    _defineProperty(this, "bp", void 0);

    _defineProperty(this, "config", void 0);

    _defineProperty(this, "botId", void 0);

    _defineProperty(this, "axiosConfig", void 0);

    _defineProperty(this, "categories", void 0);

    this.bp = bp;
    this.config = config;
    this.botId = botId;

    if (config.qnaCategories && config.qnaCategories.length > 0) {
      this.categories = config.qnaCategories.split(',');
    }
  }

  async initialize() {
    this.axiosConfig = await this.bp.http.getAxiosConfigForBot(this.botId);
    this.syncQnaToNlu();
  }

  async syncNlu() {
    const {
      data: isNeeded
    } = await _axios.default.get('/mod/nlu/sync/check', this.axiosConfig);

    if (isNeeded) {
      await _axios.default.post('/mod/nlu/sync', {}, this.axiosConfig);
    }
  } // TODO Find better way to implement. When manually copying QNA, intents are not created.
  // Manual edit & save of each one is required for the intent to be created.


  async syncQnaToNlu() {
    const allQuestions = await this.fetchAllQuestions();
    const {
      data: allIntents
    } = await _axios.default.get(`/mod/nlu/intents`, this.axiosConfig);

    for (const question of allQuestions) {
      const found = _lodash.default.find(allIntents, intent => intent.name === getIntentId(question.id).toLowerCase());

      if (question.data.enabled && !found) {
        const intent = {
          entities: [],
          utterances: normalizeQuestions(question.data.questions)
        };
        await _axios.default.post(`/mod/nlu/intents/${getIntentId(question.id)}`, intent, this.axiosConfig);
        this.bp.logger.info(`Created NLU intent for QNA ${question.id}`);
      }
    }

    await this.syncNlu();
  }

  async update(data, id) {
    id = id || getQuestionId(data);

    if (data.enabled) {
      const intent = {
        entities: [],
        utterances: normalizeQuestions(data.questions)
      };

      _axios.default.post(`/mod/nlu/intents/${getIntentId(id)}`, intent, this.axiosConfig);
    } else {
      await _axios.default.delete(`/mod/nlu/intents/${getIntentId(id)}`, this.axiosConfig);
    }

    await this.syncNlu();
    await this.bp.ghost.forBot(this.botId).upsertFile(this.config.qnaDir, `${id}.json`, JSON.stringify({
      id,
      data
    }, undefined, 2));
    return id;
  }

  async insert(qna, statusCb) {
    const ids = await Promise.each(_lodash.default.isArray(qna) ? qna : [qna], async (data, i) => {
      const id = getQuestionId(data);

      if (data.enabled) {
        const intent = {
          entities: [],
          utterances: normalizeQuestions(data.questions)
        };
        await _axios.default.post(`/mod/nlu/intents/${getIntentId(id)}`, intent, this.axiosConfig);
      }

      await this.bp.ghost.forBot(this.botId).upsertFile(this.config.qnaDir, `${id}.json`, JSON.stringify({
        id,
        data
      }, undefined, 2));
      statusCb && statusCb(i + 1);
    });
    await this.syncNlu();
    return ids;
  }
  /**
   * This will migrate questions to the new format.
   * @deprecated Questions support multiple answers since v11.3
   */


  migrate_11_2_to_11_3(question) {
    if (!question.data.answers) {
      question.data.answers = [question.data.answer];
    }

    return question;
  }

  async getQuestion(opts) {
    let filename;

    if (typeof opts === 'string') {
      filename = `${opts}.json`;
    } else {
      // opts object
      filename = opts.filename;
    }

    const data = await this.bp.ghost.forBot(this.botId).readFileAsString(this.config.qnaDir, filename);
    return this.migrate_11_2_to_11_3(JSON.parse(data));
  }

  async fetchAllQuestions(opts) {
    try {
      let questions = await this.bp.ghost.forBot(this.botId).directoryListing(this.config.qnaDir, '*.json');

      if (opts && opts.start && opts.count) {
        questions = questions.slice(opts.start, opts.start + opts.count);
      }

      return Promise.map(questions, question => this.getQuestion({
        filename: question
      }));
    } catch (err) {
      this.bp.logger.warn(`Error while reading questions. ${err}`);
      return [];
    }
  }

  async filterByCategoryAndQuestion({
    question,
    categories
  }) {
    const allQuestions = await this.fetchAllQuestions();
    const filteredQuestions = allQuestions.filter(q => {
      const {
        questions,
        category
      } = q.data;
      const isRightId = questions.join('\n').toLowerCase().indexOf(question.toLowerCase()) !== -1;

      if (!categories.length) {
        return isRightId;
      }

      if (!question) {
        return category && categories.indexOf(category) !== -1;
      }

      return isRightId && category && categories.indexOf(category) !== -1;
    });
    return filteredQuestions.reverse();
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
      items = await this.fetchAllQuestions({
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

  async count() {
    const questions = await this.fetchAllQuestions();
    return questions.length;
  }

  async delete(qnaId) {
    const ids = _lodash.default.isArray(qnaId) ? qnaId : [qnaId];

    if (ids.length === 0) {
      return;
    }

    const deletePromise = async id => {
      const data = await this.getQuestion(id);

      if (data.data.enabled) {
        await _axios.default.delete(`/mod/nlu/intents/${getIntentId(id)}`, this.axiosConfig);
      }

      return this.bp.ghost.forBot(this.botId).deleteFile(this.config.qnaDir, `${id}.json`);
    };

    await Promise.all(ids.map(deletePromise));
    await this.syncNlu();
  }

  async answersOn(text) {
    const extract = await _axios.default.post('/mod/nlu/extract', {
      text
    }, this.axiosConfig);

    const intents = _lodash.default.chain([extract.data['intent'], ...extract.data['intents']]).uniqBy('name').filter(({
      name
    }) => name.startsWith('__qna__')).orderBy(['confidence'], ['desc']).value();

    return Promise.all(intents.map(async ({
      name,
      confidence
    }) => {
      const {
        data: {
          questions,
          answer
        }
      } = await this.getQuestion(name.replace('__qna__', ''));
      return {
        questions,
        answer,
        confidence,
        id: name,
        metadata: []
      };
    }));
  }

  getCategories() {
    return this.categories;
  }

  hasCategories() {
    return this.categories && this.categories.length > 0;
  }

}

exports.default = Storage;