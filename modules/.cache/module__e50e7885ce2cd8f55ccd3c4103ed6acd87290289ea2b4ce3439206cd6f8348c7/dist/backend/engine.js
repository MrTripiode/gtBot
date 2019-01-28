"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findMostConfidentPredictionMeanStd = findMostConfidentPredictionMeanStd;
exports.NonePrediction = exports.default = void 0;

var _bluebirdRetry = _interopRequireDefault(require("bluebird-retry"));

var _crypto = _interopRequireDefault(require("crypto"));

var _fs = _interopRequireDefault(require("fs"));

var _lodash = _interopRequireWildcard(require("lodash"));

var _duckling_extractor = require("./pipelines/entities/duckling_extractor");

var _pattern_extractor = require("./pipelines/entities/pattern_extractor");

var _ft_classifier = _interopRequireDefault(require("./pipelines/intents/ft_classifier"));

var _matcher = require("./pipelines/intents/matcher");

var _ft_lid = require("./pipelines/language/ft_lid");

var _crf_extractor = _interopRequireDefault(require("./pipelines/slots/crf_extractor"));

var _preProcessor = require("./pipelines/slots/pre-processor");

var _storage = _interopRequireDefault(require("./storage"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class ScopedEngine {
  constructor(logger, botId, config, toolkit) {
    this.logger = logger;
    this.botId = botId;
    this.config = config;
    this.toolkit = toolkit;

    _defineProperty(this, "storage", void 0);

    _defineProperty(this, "confidenceTreshold", 0.7);

    _defineProperty(this, "intentClassifier", void 0);

    _defineProperty(this, "langDetector", void 0);

    _defineProperty(this, "systemEntityExtractor", void 0);

    _defineProperty(this, "slotExtractor", void 0);

    _defineProperty(this, "retryPolicy", {
      interval: 100,
      max_interval: 500,
      timeout: 5000,
      max_tries: 3
    });

    this.storage = new _storage.default(config, this.botId);
    this.intentClassifier = new _ft_classifier.default(this.logger);
    this.langDetector = new _ft_lid.FastTextLanguageId(this.logger);
    this.systemEntityExtractor = new _duckling_extractor.DucklingEntityExtractor(this.logger);
    this.slotExtractor = new _crf_extractor.default(toolkit);
  }

  async init() {
    this.confidenceTreshold = this.config.confidenceTreshold;

    if (isNaN(this.confidenceTreshold) || this.confidenceTreshold < 0 || this.confidenceTreshold > 1) {
      this.confidenceTreshold = 0.7;
    }

    if (await this.checkSyncNeeded()) {
      await this.sync();
    }
  }

  async sync() {
    const intents = await this.storage.getIntents();

    const modelHash = this._getIntentsHash(intents); // this is only good for intents model at the moment. soon we'll store crf, skipgram an kmeans model necessary for crf extractor


    if (await this.storage.modelExists(modelHash)) {
      await this._loadModel(modelHash);
    } else {
      await this._trainModel(intents, modelHash);
    } // TODO try to load model if saved(we don't save at the moment)


    try {
      const trainingSet = (0, _lodash.flatMap)(intents, intent => {
        return intent.utterances.map(utterance => (0, _preProcessor.generateTrainingSequence)(utterance, intent.slots, intent.name));
      });
      await this.slotExtractor.train(trainingSet);
    } catch (err) {
      this.logger.error('Error training slot tagger', err);
    }
  }

  async extract(incomingEvent) {
    return (0, _bluebirdRetry.default)(() => this._extract(incomingEvent), this.retryPolicy);
  }

  async checkSyncNeeded() {
    const intents = await this.storage.getIntents();

    if (intents.length) {
      const intentsHash = this._getIntentsHash(intents);

      return this.intentClassifier.currentModelId !== intentsHash;
    }

    return false;
  }

  async _loadModel(modelHash) {
    this.logger.debug(`Restoring intents model '${modelHash}' from storage`);
    const modelBuffer = await this.storage.getModelAsBuffer(modelHash);
    this.intentClassifier.loadModel(modelBuffer, modelHash);
  }

  async _trainModel(intents, modelHash) {
    try {
      this.logger.debug('The intents model needs to be updated, training model ...');
      const intentModelPath = await this.intentClassifier.train(intents, modelHash);

      const intentModelBuffer = _fs.default.readFileSync(intentModelPath);

      const intentModelName = `${Date.now()}__${modelHash}.bin`;
      await this.storage.persistModel(intentModelBuffer, intentModelName);
      this.logger.debug('Intents done training');
    } catch (err) {
      return this.logger.attachError(err).error('Error training intents');
    }
  }

  _getIntentsHash(intents) {
    return _crypto.default.createHash('md5').update(JSON.stringify(intents)).digest('hex');
  }

  async _extractEntities(text, lang) {
    const customEntityDefs = await this.storage.getCustomEntities();
    const patternEntities = (0, _pattern_extractor.extractPatternEntities)(text, customEntityDefs.filter(ent => ent.type === 'pattern'));
    const listEntities = (0, _pattern_extractor.extractListEntities)(text, customEntityDefs.filter(ent => ent.type === 'list'));
    const systemEntities = await this.systemEntityExtractor.extract(text, lang);
    return [...systemEntities, ...patternEntities, ...listEntities];
  }

  async _extract(incomingEvent) {
    const ret = {
      errored: true
    };

    try {
      const text = incomingEvent.preview;
      ret.language = await this.langDetector.identify(text);
      ret.intents = await this.intentClassifier.predict(text);
      const intent = findMostConfidentPredictionMeanStd(ret.intents, this.confidenceTreshold);
      ret.intent = { ...intent,
        matches: (0, _matcher.createIntentMatcher)(intent.name)
      };
      ret.entities = await this._extractEntities(text, ret.language);
      const intentDef = await this.storage.getIntent(intent.name);
      ret.slots = await this.slotExtractor.extract(text, intentDef, ret.entities);
      ret.errored = false;
    } catch (error) {
      this.logger.warn(`Could not extract whole NLU data, ${error}`);
    } finally {
      return ret;
    }
  }

}

exports.default = ScopedEngine;
const NonePrediction = {
  confidence: 1.0,
  name: 'none'
  /**
   * Finds the most confident intent, either by the intent being above a fixed threshold, or else if an intent is more than {@param std} standard deviation (outlier method).
   * @param intents
   * @param fixedThreshold
   * @param std number of standard deviation away. normally between 2 and 5
   */

};
exports.NonePrediction = NonePrediction;

function findMostConfidentPredictionMeanStd(intents, fixedThreshold, std = 3) {
  if (!intents.length) {
    return NonePrediction;
  }

  const best = intents.find(x => x.confidence >= fixedThreshold);

  if (best) {
    return best;
  }

  const mean = _lodash.default.meanBy(intents, 'confidence');

  const stdErr = Math.sqrt(intents.reduce((a, c) => a + Math.pow(c.confidence - mean, 2), 0) / intents.length) / Math.sqrt(intents.length);
  const dominant = intents.find(x => x.confidence >= stdErr * std + mean);
  return dominant || NonePrediction;
}