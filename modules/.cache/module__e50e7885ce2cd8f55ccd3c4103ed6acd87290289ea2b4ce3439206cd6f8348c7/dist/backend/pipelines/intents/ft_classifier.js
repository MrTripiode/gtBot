"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = require("fs");

var _tmp = _interopRequireDefault(require("tmp"));

var _fastText = _interopRequireDefault(require("../../tools/fastText"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FastTextClassifier {
  constructor(logger) {
    this.logger = logger;

    _defineProperty(this, "fastTextWrapper", void 0);

    _defineProperty(this, "currentModelId", void 0);
  }

  sanitizeText(text) {
    return text.toLowerCase().replace(/[^\w\s]/gi, '');
  }

  _writeTrainingSet(intents, trainingFilePath) {
    const fileStream = (0, _fs.createWriteStream)(trainingFilePath, {
      flags: 'a'
    });

    for (const intent of intents) {
      intent.utterances.forEach(text => {
        const clean = this.sanitizeText(text);
        fileStream.write(`${_fastText.default.LABEL_PREFIX}${intent.name} ${clean}\n`);
      });
    }

    return Promise.fromCallback(cb => fileStream.end(cb));
  }

  async train(intents, modelId) {
    const dataFn = _tmp.default.tmpNameSync();

    await this._writeTrainingSet(intents, dataFn);

    const modelFn = _tmp.default.tmpNameSync();

    const modelPath = `${modelFn}.bin`; // TODO: Add parameters Grid Search logic here

    this.fastTextWrapper = new _fastText.default(modelPath);
    this.fastTextWrapper.train(dataFn, {
      method: 'supervised'
    });
    this.currentModelId = modelId;
    return modelPath;
  }

  loadModel(model, modelId) {
    this.currentModelId = modelId;

    const tmpFn = _tmp.default.tmpNameSync();

    (0, _fs.writeFileSync)(tmpFn, model);
    this.fastTextWrapper = new _fastText.default(tmpFn);
  }

  async predict(input) {
    if (!this.fastTextWrapper) {
      throw new Error('model is not set');
    }

    return this.fastTextWrapper.predict(this.sanitizeText(input), 5);
  }

}

exports.default = FastTextClassifier;