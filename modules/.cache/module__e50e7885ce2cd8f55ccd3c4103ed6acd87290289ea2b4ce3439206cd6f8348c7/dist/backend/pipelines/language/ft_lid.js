"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FastTextLanguageId = void 0;

var _path = require("path");

var _fs = require("fs");

var _tmp = _interopRequireDefault(require("tmp"));

var _fastText = _interopRequireDefault(require("../../tools/fastText"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const PRETRAINED_LID_176 = (0, _path.join)(__dirname, '../../tools/pretrained/lid.176.ftz');

class FastTextLanguageId {
  constructor(logger) {
    this.logger = logger;

    if (!FastTextLanguageId.model) {
      FastTextLanguageId.initializeModel();
    }
  }

  static initializeModel() {
    const tmpFn = _tmp.default.tmpNameSync();

    const modelBuff = (0, _fs.readFileSync)(PRETRAINED_LID_176);
    (0, _fs.writeFileSync)(tmpFn, modelBuff);
    this.model = new _fastText.default(tmpFn);
  }

  async identify(text) {
    const res = await FastTextLanguageId.model.predict(text, 1);
    return res[0].name;
  }

}

exports.FastTextLanguageId = FastTextLanguageId;

_defineProperty(FastTextLanguageId, "model", void 0);