"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _api = _interopRequireDefault(require("./api"));

var _db = _interopRequireDefault(require("./db"));

var _socket = _interopRequireDefault(require("./socket"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const onServerStarted = async bp => {
  const db = new _db.default(bp);
  await db.initialize();
  await (0, _api.default)(bp, db);
  await (0, _socket.default)(bp, db);
};

const onServerReady = async bp => {};

const entryPoint = {
  onServerStarted,
  onServerReady,
  definition: {
    name: 'channel-web',
    menuIcon: 'chrome_reader_mode',
    fullName: 'Web Chat',
    homepage: 'https://botpress.io',
    noInterface: true,
    plugins: [{
      entry: 'WebBotpressUIInjection',
      position: 'overlay'
    }]
  }
};
var _default = entryPoint;
exports.default = _default;