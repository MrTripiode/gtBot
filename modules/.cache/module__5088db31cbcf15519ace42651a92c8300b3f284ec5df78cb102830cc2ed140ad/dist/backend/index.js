"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _analytics = _interopRequireDefault(require("./analytics"));

var _api = _interopRequireDefault(require("./api"));

var _customAnalytics = _interopRequireDefault(require("./custom-analytics"));

var _setup = _interopRequireDefault(require("./setup"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const scopedAnalytics = new Map();
const interactionsToTrack = ['message', 'text', 'button', 'template', 'quick_reply', 'postback'];

const onServerStarted = async bp => {
  bp.analytics = {
    custom: (0, _customAnalytics.default)({
      bp
    })
  };
  await (0, _setup.default)(bp, interactionsToTrack);
};

const onServerReady = async bp => {};

const onBotMount = async (bp, botId) => {
  const analytics = new _analytics.default(bp, botId);
  scopedAnalytics.set(botId, analytics);
  await (0, _api.default)(bp, analytics);
  await analytics.start();
};

const onBotUnmount = async (bp, botId) => {
  const analytics = scopedAnalytics.get(botId);
  await analytics.stop();
  scopedAnalytics.delete(botId);
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  definition: {
    name: 'analytics',
    fullName: 'Analytics',
    homepage: 'https://botpress.io',
    menuIcon: 'timeline',
    menuText: 'Analytics'
  }
};
var _default = entryPoint;
exports.default = _default;