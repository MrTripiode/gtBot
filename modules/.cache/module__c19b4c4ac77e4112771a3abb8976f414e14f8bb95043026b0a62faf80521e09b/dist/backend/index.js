"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

const onServerStarted = async bp => {};

const onServerReady = async bp => {};

const botTemplates = [{
  id: 'welcome-bot',
  name: 'Welcome Bot',
  desc: `Basic bot that showcases some of the bot's functionality`
}, {
  id: 'small-talk',
  name: 'Small Talk',
  desc: `Includes basic smalltalk examples`
}];
const entryPoint = {
  onServerStarted,
  onServerReady,
  botTemplates,
  definition: {
    name: 'builtin',
    menuIcon: 'fiber_smart_record',
    fullName: 'Botpress Builtins',
    homepage: 'https://botpress.io',
    noInterface: true
  }
};
var _default = entryPoint;
exports.default = _default;