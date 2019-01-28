"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _api = _interopRequireDefault(require("./api"));

var _setup = require("./setup");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const botScopedStorage = new Map();

const onServerStarted = async bp => {
  await (0, _setup.initModule)(bp, botScopedStorage);
};

const onServerReady = async bp => {
  await (0, _api.default)(bp, botScopedStorage);
};

const onBotMount = async (bp, botId) => {
  await (0, _setup.initBot)(bp, botScopedStorage, botId);
};

const onBotUnmount = async (bp, botId) => {
  botScopedStorage.delete(botId);
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  definition: {
    name: 'qna',
    menuIcon: 'question_answer',
    menuText: 'Q&A',
    fullName: 'QNA',
    homepage: 'https://botpress.io'
  }
};
var _default = entryPoint;
exports.default = _default;