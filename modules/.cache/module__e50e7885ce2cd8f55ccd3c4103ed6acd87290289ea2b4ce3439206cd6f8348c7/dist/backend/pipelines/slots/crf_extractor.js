"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _lodash = _interopRequireDefault(require("lodash"));

var _mlKmeans = _interopRequireDefault(require("ml-kmeans"));

var _tmp = _interopRequireDefault(require("tmp"));

var _fastText = _interopRequireDefault(require("../../tools/fastText"));

var _typings = require("../../typings");

var _preProcessor = require("./pre-processor");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// TODO grid search / optimization for those hyperparams
const K_CLUSTERS = 15;
const CRF_TRAINER_PARAMS = {
  c1: '0.0001',
  c2: '0.01',
  max_iterations: '500',
  'feature.possible_transitions': '1',
  'feature.possible_states': '1'
};
const FT_PARAMS = {
  method: 'skipgram',
  minCount: 2,
  bucket: 25000,
  dim: 15,
  learningRate: 0.5,
  wordGram: 3,
  maxn: 6,
  minn: 2,
  epoch: 50
};

class CRFExtractor {
  constructor(toolkit) {
    this.toolkit = toolkit;

    _defineProperty(this, "_isTrained", false);

    _defineProperty(this, "_ftModelFn", '');

    _defineProperty(this, "_crfModelFn", '');

    _defineProperty(this, "_ft", void 0);

    _defineProperty(this, "_tagger", void 0);

    _defineProperty(this, "_kmeansModel", void 0);
  }

  async train(trainingSet) {
    this._isTrained = false;

    if (trainingSet.length >= 2) {
      await this._trainLanguageModel(trainingSet);
      await this._trainKmeans(trainingSet);
      await this._trainCrf(trainingSet);
      this._tagger = this.toolkit.CRF.createTagger();
      await this._tagger.open(this._crfModelFn);
      this._isTrained = true;
    }
  }
  /**
   * Returns an object with extracted slots name as keys.
   * Each slots under each keys can either be a single Slot object or Array<Slot>
   * return value example:
   * slots: {
   *   artist: {
   *     name: "artist",
   *     value: "Kanye West",
   *     entity: [Object] // corresponding sdk.NLU.Entity
   *   },
   *   songs : [ multiple slots objects here]
   * }
   */


  async extract(text, intentDef, entitites) {
    const seq = (0, _preProcessor.generatePredictionSequence)(text, intentDef.name, entitites);
    const tags = await this._tag(seq); // notice usage of zip here, we want to loop on tokens and tags at the same index

    return _lodash.default.zip(seq.tokens, tags).filter(([token, tag]) => {
      if (!token || !tag || tag === _typings.BIO.OUT) {
        return false;
      }

      const slotName = tag.slice(2);
      return intentDef.slots.find(slotDef => slotDef.name === slotName) !== undefined;
    }).reduce((slotCollection, [token, tag]) => {
      const slotName = tag.slice(2);

      const slot = this._makeSlot(slotName, token, intentDef.slots, entitites);

      if (tag[0] === _typings.BIO.INSIDE && slotCollection[slotName]) {
        // simply append the source if the tag is inside a slot
        slotCollection[slotName].source += ` ${token.value}`;
      } else if (tag[0] === _typings.BIO.BEGINNING && slotCollection[slotName]) {
        // if the tag is beginning and the slot already exists, we create need a array slot
        if (Array.isArray(slotCollection[slotName])) {
          slotName[slotName].push(slot);
        } else {
          // if no slots exist we assign a slot to the slot key
          slotCollection[slotName] = [slotCollection[slotName], slot];
        }
      } else {
        slotCollection[slotName] = slot;
      }

      return slotCollection;
    }, {});
  } // this is made "protected" to facilitate model validation


  async _tag(seq) {
    if (!this._isTrained) {
      throw new Error('Model not trained, please call train() before');
    }

    const inputVectors = [];

    for (let i = 0; i < seq.tokens.length; i++) {
      const featureVec = await this._vectorize(seq.tokens, seq.intent, i);
      inputVectors.push(featureVec);
    }

    return this._tagger.tag(inputVectors).result;
  }

  _makeSlot(slotName, token, slotDefinitions, entitites) {
    const slotDef = slotDefinitions.find(slotDef => slotDef.name === slotName);
    const entity = slotDef ? entitites.find(e => slotDef.entity === e.name && e.meta.start <= token.start && e.meta.end >= token.end) : undefined;
    const value = entity ? _lodash.default.get(entity, 'data.value', token.value) : token.value;
    const slot = {
      name: slotName,
      value
    };
    if (entity) slot.entity = entity;
    return slot;
  }

  async _trainKmeans(sequences) {
    const tokens = _lodash.default.flatMap(sequences, s => s.tokens);

    const data = await Promise.mapSeries(tokens, async t => await this._ft.wordVectors(t.value));
    const k = data.length > K_CLUSTERS ? K_CLUSTERS : 2;

    try {
      this._kmeansModel = (0, _mlKmeans.default)(data, k);
    } catch (error) {
      throw Error('Error training K-means model');
    }
  }

  async _trainCrf(sequences) {
    this._crfModelFn = _tmp.default.fileSync({
      postfix: '.bin'
    }).name;
    const trainer = this.toolkit.CRF.createTrainer();
    trainer.set_params(CRF_TRAINER_PARAMS);
    trainer.set_callback(str => {
      /* swallow training results */
    });

    for (const seq of sequences) {
      const inputVectors = [];
      const labels = [];

      for (let i = 0; i < seq.tokens.length; i++) {
        const featureVec = await this._vectorize(seq.tokens, seq.intent, i);
        inputVectors.push(featureVec);
        const labelSlot = seq.tokens[i].slot ? `-${seq.tokens[i].slot}` : '';
        labels.push(`${seq.tokens[i].tag}${labelSlot}`);
      }

      trainer.append(inputVectors, labels);
    }

    trainer.train(this._crfModelFn);
  }

  async _trainLanguageModel(samples) {
    this._ftModelFn = _tmp.default.fileSync({
      postfix: '.bin'
    }).name;

    const ftTrainFn = _tmp.default.fileSync({
      postfix: '.txt'
    }).name;

    this._ft = new _fastText.default(this._ftModelFn);
    const trainContent = samples.reduce((corpus, seq) => {
      const cannonicSentence = seq.tokens.map(s => {
        if (s.tag === _typings.BIO.OUT) return s.value;else return s.slot;
      }).join(' ');
      return `${corpus}${cannonicSentence}\n`;
    }, '');

    _fs.default.writeFileSync(ftTrainFn, trainContent, 'utf8');

    this._ft.train(ftTrainFn, FT_PARAMS);
  }

  async _vectorizeToken(token, intentName, featPrefix, includeCluster) {
    const vector = [`${featPrefix}intent=${intentName}`];
    if (token.value === token.value.toLowerCase()) vector.push(`${featPrefix}low`);
    if (token.value === token.value.toUpperCase()) vector.push(`${featPrefix}up`);
    if (token.value.length > 1 && token.value[0] === token.value[0].toUpperCase() && token.value[1] === token.value[1].toLowerCase()) vector.push(`${featPrefix}title`);

    if (includeCluster) {
      const cluster = await this._getWordCluster(token.value);
      vector.push(`${featPrefix}cluster=${cluster.toString()}`);
    }

    const entititesFeatures = (token.matchedEntities.length ? token.matchedEntities : ['none']).map(ent => `${featPrefix}entity=${ent}`);
    return [...vector, ...entititesFeatures];
  } // TODO maybe use a slice instead of the whole token seq ?


  async _vectorize(tokens, intentName, idx) {
    const prev = idx === 0 ? ['w[0]bos'] : await this._vectorizeToken(tokens[idx - 1], intentName, 'w[-1]', true);
    const current = await this._vectorizeToken(tokens[idx], intentName, 'w[0]', false);
    const next = idx === tokens.length - 1 ? ['w[0]eos'] : await this._vectorizeToken(tokens[idx + 1], intentName, 'w[1]', true);
    return [...prev, ...current, ...next];
  }

  async _getWordCluster(word) {
    const vector = await this._ft.wordVectors(word);
    return this._kmeansModel.nearest([vector])[0];
  }

}

exports.default = CRFExtractor;