"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initModule = exports.initBot = void 0;

var _nlu = _interopRequireWildcard(require("./providers/nlu"));

var _qnaMaker = _interopRequireDefault(require("./providers/qnaMaker"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

const initBot = async (bp, botScopedStorage, botId) => {
  const config = await bp.config.getModuleConfigForBot('qna', botId);
  let storage = undefined;

  if (config.qnaMakerApiKey) {
    storage = new _qnaMaker.default(bp, config);
  } else {
    storage = new _nlu.default(bp, config, botId);
  }

  await storage.initialize();
  botScopedStorage.set(botId, storage);
};

exports.initBot = initBot;

const initModule = async (bp, botScopedStorage) => {
  bp.events.registerMiddleware({
    name: 'qna.incoming',
    direction: 'incoming',
    handler: async (event, next) => {
      if (!event.hasFlag(bp.IO.WellKnownFlags.SKIP_QNA_PROCESSING)) {
        const config = await bp.config.getModuleConfigForBot('qna', event.botId);
        const storage = botScopedStorage.get(event.botId);
        await processEvent(event, {
          bp,
          storage,
          config
        });
        next();
      }
    },
    order: 11,
    // must be after the NLU middleware and before the dialog middleware
    description: 'Listen for predefined questions and send canned responses.'
  });

  const getAlternativeAnswer = question => {
    const randomIndex = Math.floor(Math.random() * question.answers.length);
    return question.answers[randomIndex];
  };

  const buildSuggestedReply = async (event, question, confidence, intent, renderer) => {
    const payloads = [];

    if (question.action.includes('text')) {
      const element = await bp.cms.renderElement(renderer, {
        text: getAlternativeAnswer(question),
        typing: true
      }, {
        botId: event.botId,
        channel: event.channel,
        target: event.target,
        threadId: event.threadId
      });
      payloads.push(...element);
    }

    if (question.action.includes('redirect')) {
      payloads.push({
        type: 'redirect',
        flow: question.redirectFlow,
        node: question.redirectNode
      });
    }

    return {
      confidence,
      payloads,
      intent
    };
  };

  const getQuestionForIntent = async (storage, intentName) => {
    if (intentName && intentName.startsWith(_nlu.NLU_PREFIX)) {
      const qnaId = intentName.substring(_nlu.NLU_PREFIX.length);
      return (await storage.getQuestion(qnaId)).data;
    }
  };

  const processEvent = async (event, {
    bp,
    storage,
    config
  }) => {
    if (config.qnaMakerApiKey) {
      const qnaQuestion = (await storage.answersOn(event.preview)).pop();

      if (qnaQuestion && qnaQuestion.enabled) {
        event.suggestedReplies.push((await buildSuggestedReply(event, qnaQuestion, qnaQuestion.confidence, undefined, config.textRenderer)));
      }

      return;
    }

    if (!event.nlu || !event.nlu.intents) {
      return;
    }

    for (const intent of event.nlu.intents) {
      const question = await getQuestionForIntent(storage, intent.name);

      if (question && question.enabled) {
        event.suggestedReplies.push((await buildSuggestedReply(event, question, intent.confidence, intent.name, config.textRenderer)));
      }
    }
  };
};

exports.initModule = initModule;