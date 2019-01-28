"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _choice = _interopRequireDefault(require("./choice"));

var _setup = _interopRequireDefault(require("./setup"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const onServerStarted = async bp => {};

const onServerReady = async bp => {
  await (0, _setup.default)(bp);
};

const skillsToRegister = [{
  id: 'choice',
  name: 'Choice',
  flowGenerator: _choice.default.generateFlow
}];
const entryPoint = {
  onServerStarted,
  onServerReady,
  definition: {
    name: 'basic-skills',
    menuIcon: 'fiber_smart_record',
    fullName: 'Basic Skills',
    homepage: 'https://botpress.io',
    noInterface: true,
    plugins: [],
    moduleView: {
      stretched: true
    }
  },
  skills: skillsToRegister
};
var _default = entryPoint;
exports.default = _default;