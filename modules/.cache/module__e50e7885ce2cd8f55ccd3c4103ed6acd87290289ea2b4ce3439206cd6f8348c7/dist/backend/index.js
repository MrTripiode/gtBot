"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _api = _interopRequireDefault(require("./api"));

var _middleware = require("./middleware");

var _fastText = _interopRequireDefault(require("./tools/fastText"));

var _engine = _interopRequireDefault(require("./engine"));

var _duckling_extractor = require("./pipelines/entities/duckling_extractor");

var _storage = _interopRequireDefault(require("./storage"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const nluByBot = {};

const onServerStarted = async bp => {
  _storage.default.ghostProvider = botId => bp.ghost.forBot(botId);

  const globalConfig = await bp.config.getModuleConfig('nlu');
  globalConfig.fastTextPath && _fastText.default.configure(globalConfig.fastTextPath);

  _duckling_extractor.DucklingEntityExtractor.configure(globalConfig.ducklingEnabled, globalConfig.ducklingURL);

  await (0, _middleware.registerMiddleware)(bp, nluByBot);
};

const onServerReady = async bp => {
  await (0, _api.default)(bp, nluByBot);
};

const onBotMount = async (bp, botId) => {
  const moduleBotConfig = await bp.config.getModuleConfigForBot('nlu', botId);
  const scoped = new _engine.default(bp.logger, botId, moduleBotConfig, bp.MLToolkit);
  await scoped.init();
  nluByBot[botId] = scoped;
};

const onBotUnmount = async (bp, botId) => {
  delete nluByBot[botId];
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  definition: {
    name: 'nlu',
    moduleView: {
      stretched: true
    },
    menuIcon: 'fiber_smart_record',
    menuText: 'NLU',
    fullName: 'NLU',
    homepage: 'https://botpress.io'
  }
};
var _default = entryPoint;
exports.default = _default;