"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _iconvLite = _interopRequireDefault(require("iconv-lite"));

var _json2csv = require("json2csv");

var _moment = _interopRequireDefault(require("moment"));

var _multer = _interopRequireDefault(require("multer"));

var _nanoid = _interopRequireDefault(require("nanoid"));

var _yn = _interopRequireDefault(require("yn"));

var _transfer = require("./transfer");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = async (bp, botScopedStorage) => {
  const csvUploadStatuses = {};
  const router = bp.http.createRouterForBot('qna');
  router.get('/questions', async (req, res) => {
    try {
      const {
        query: {
          question = '',
          categories = [],
          limit,
          offset
        }
      } = req;
      const storage = botScopedStorage.get(req.params.botId);
      const items = await storage.getQuestions({
        question,
        categories
      }, {
        limit,
        offset
      });
      res.send({ ...items
      });
    } catch (e) {
      bp.logger.error('Error while listing: ', e);
      res.status(500).send(e.message || 'Error');
    }
  });
  router.post('/questions', async (req, res) => {
    try {
      const storage = botScopedStorage.get(req.params.botId);
      const id = await storage.insert(req.body);
      res.send(id);
    } catch (e) {
      bp.logger.error('Error while creating: ', e);
      res.status(500).send(e.message || 'Error');
      sendToastError('Save', e.message);
    }
  });
  router.get('/questions/:id', async (req, res) => {
    try {
      const storage = botScopedStorage.get(req.params.botId);
      const question = await storage.getQuestion(req.params.id);
      res.send(question);
    } catch (e) {
      sendToastError('Fetch', e.message);
    }
  });
  router.put('/questions/:id', async (req, res) => {
    const {
      query: {
        limit,
        offset,
        question,
        categories
      }
    } = req;

    try {
      const storage = botScopedStorage.get(req.params.botId);
      await storage.update(req.body, req.params.id);
      const questions = await storage.getQuestions({
        question,
        categories
      }, {
        limit,
        offset
      });
      res.send(questions);
    } catch (e) {
      bp.logger.error('Update error: ', e);
      res.status(500).send(e.message || 'Error');
      sendToastError('Update', e.message);
    }
  });
  router.delete('/questions/:id', async (req, res) => {
    const {
      query: {
        limit,
        offset,
        question,
        categories
      }
    } = req;

    try {
      const storage = botScopedStorage.get(req.params.botId);
      await storage.delete(req.params.id, undefined);
      const questionsData = await storage.getQuestions({
        question,
        categories
      }, {
        limit,
        offset
      });
      res.send(questionsData);
    } catch (e) {
      bp.logger.error('Delete error: ', e);
      res.status(500).send(e.message || 'Error');
      sendToastError('Delete', e.message);
    }
  });
  router.get('/categories', async (req, res) => {
    const storage = botScopedStorage.get(req.params.botId);
    const categories = await storage.getCategories();
    res.send({
      categories
    });
  });
  router.get('/export/:format', async (req, res) => {
    const storage = botScopedStorage.get(req.params.botId);
    const config = await bp.config.getModuleConfigForBot('qna', req.params.botId);
    const data = await (0, _transfer.prepareExport)(storage, {
      flat: true
    });

    if (req.params.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-disposition', `attachment; filename=qna_${(0, _moment.default)().format('DD-MM-YYYY')}.csv`);
      const categoryWrapper = storage.hasCategories() ? ['category'] : [];
      const parseOptions = {
        fields: ['question', 'action', 'answer', 'answer2', ...categoryWrapper],
        header: true
      };
      const json2csvParser = new _json2csv.Parser(parseOptions);
      res.end(_iconvLite.default.encode(json2csvParser.parse(data), config.exportCsvEncoding));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-disposition', `attachment; filename=qna_${(0, _moment.default)().format('DD-MM-YYYY')}.json`);
      res.end(JSON.stringify(data));
    }
  });
  const upload = (0, _multer.default)();
  router.post('/import/csv', upload.single('csv'), async (req, res) => {
    const storage = botScopedStorage.get(req.params.botId);
    const config = await bp.config.getModuleConfigForBot('qna', req.params.botId);
    const uploadStatusId = (0, _nanoid.default)();
    res.end(uploadStatusId);
    updateUploadStatus(uploadStatusId, 'Deleting existing questions');

    if ((0, _yn.default)(req.body.isReplace)) {
      const questions = await storage.fetchAllQuestions();

      const statusCb = processedCount => updateUploadStatus(uploadStatusId, `Deleted ${processedCount}/${questions.length} questions`);

      await storage.delete(questions.map(({
        id
      }) => id), statusCb);
    }

    try {
      const questions = _iconvLite.default.decode(req.file.buffer, config.exportCsvEncoding);

      const params = {
        storage,
        config,
        format: 'csv',
        statusCallback: updateUploadStatus,
        uploadStatusId
      };
      await (0, _transfer.importQuestions)(questions, params);
      updateUploadStatus(uploadStatusId, 'Completed');
    } catch (e) {
      bp.logger.error('Upload error :', e);
      updateUploadStatus(uploadStatusId, `Error: ${e.message}`);
    }
  });
  router.get('/csv-upload-status/:uploadStatusId', async (req, res) => {
    res.end(csvUploadStatuses[req.params.uploadStatusId]);
  });

  const sendToastError = (action, error) => {
    bp.realtime.sendPayload(bp.RealTimePayload.forAdmins('toast.qna-save', {
      text: `QnA ${action} Error: ${error}`,
      type: 'error'
    }));
  };

  const updateUploadStatus = (uploadStatusId, status) => {
    if (!uploadStatusId) {
      return;
    }

    csvUploadStatuses[uploadStatusId] = status;
  };
};

exports.default = _default;