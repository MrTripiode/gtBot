"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

var _util = require("../util.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Storage {
  constructor(config, botId) {
    this.botId = botId;

    _defineProperty(this, "ghost", void 0);

    _defineProperty(this, "intentsDir", void 0);

    _defineProperty(this, "entitiesDir", void 0);

    _defineProperty(this, "modelsDir", void 0);

    _defineProperty(this, "config", void 0);

    this.config = config;
    this.intentsDir = config.intentsDir;
    this.entitiesDir = config.entitiesDir;
    this.modelsDir = config.modelsDir;
    this.ghost = Storage.ghostProvider(this.botId);
  }

  async saveIntent(intent, content) {
    intent = (0, _util.sanitizeFilenameNoExt)(intent);
    const entities = await this.getAvailableEntities();

    if (content.slots) {
      await Promise.map(content.slots, async slot => {
        if (!entities.find(e => e.name === slot.entity)) {
          throw Error(`"${slot.entity}" is neither a system entity nor a custom entity`);
        }
      });
    }

    if (intent.length < 1) {
      throw new Error('Invalid intent name, expected at least one character');
    }

    await this.ghost.upsertFile(this.intentsDir, `${intent}.json`, JSON.stringify(content, undefined, 2));
  }

  async deleteIntent(intent) {
    intent = (0, _util.sanitizeFilenameNoExt)(intent);

    if (intent.length < 1) {
      throw new Error('Invalid intent name, expected at least one character');
    }

    try {
      await this.ghost.deleteFile(this.intentsDir, `${intent}.json`);
    } catch (e) {
      if (e.code !== 'ENOENT' && !e.message.includes("couldn't find")) {
        throw e;
      }
    }
  }

  async getIntents() {
    const intents = await this.ghost.directoryListing(this.intentsDir, '*.json');
    return Promise.mapSeries(intents, intent => this.getIntent(intent));
  }

  async getIntent(intent) {
    intent = (0, _util.sanitizeFilenameNoExt)(intent);

    if (intent.length < 1) {
      throw new Error('Invalid intent name, expected at least one character');
    }

    const filename = `${intent}.json`;
    const propertiesContent = await this.ghost.readFileAsString(this.intentsDir, filename);
    const properties = JSON.parse(propertiesContent);
    const obj = {
      name: intent,
      filename: filename,
      ...properties
    }; // @deprecated remove in 12+

    if (!properties.utterances) {
      await this._legacyAppendIntentUtterances(obj, intent);
      console.log('Resaving intent', intent);
      await this.saveIntent(intent, obj);
    }

    return obj;
  }
  /** @deprecated remove in 12.0+
   * utterances used to be defined in a separate .txt file
   * this is not the case anymore since 11.2
   * we added this method for backward compatibility
   */


  async _legacyAppendIntentUtterances(intent, intentName) {
    const filename = `${intentName}.utterances.txt`;
    const utterancesContent = await this.ghost.readFileAsString(this.intentsDir, filename);
    intent.utterances = _lodash.default.split(utterancesContent, /\r|\r\n|\n/i).filter(x => x.length);
    await this.ghost.deleteFile(this.intentsDir, filename);
  }

  async getAvailableEntities() {
    return [...this.getSystemEntities(), ...(await this.getCustomEntities())];
  }

  getSystemEntities() {
    // TODO move this array as static method in DucklingExtractor
    const sysEntNames = !this.config.ducklingEnabled ? [] : ['amountOfMoney', 'distance', 'duration', 'email', 'numeral', 'ordinal', 'phoneNumber', 'quantity', 'temperature', 'time', 'url', 'volume'];
    sysEntNames.unshift('any');
    return sysEntNames.map(e => ({
      name: e,
      type: 'system'
    }));
  }

  async getCustomEntities() {
    const files = await this.ghost.directoryListing(this.entitiesDir, '*.json');
    return Promise.mapSeries(files, async fileName => {
      const body = await this.ghost.readFileAsObject(this.entitiesDir, fileName);
      return { ...body,
        id: (0, _util.sanitizeFilenameNoExt)(fileName)
      };
    });
  }

  async saveEntity(entity) {
    const obj = _lodash.default.omit(entity, ['id']);

    return this.ghost.upsertFile(this.entitiesDir, `${entity.id}.json`, JSON.stringify(obj, undefined, 2));
  }

  async deleteEntity(entityId) {
    return this.ghost.deleteFile(this.entitiesDir, `${entityId}.json`);
  }

  async persistModel(modelBuffer, modelName) {
    // TODO Ghost to support streams?
    return this.ghost.upsertFile(this.modelsDir, modelName, modelBuffer);
  }

  async getAvailableModels() {
    const models = await this.ghost.directoryListing(this.modelsDir, '*.bin');
    return models.map(x => {
      const fileName = _path.default.basename(x, '.bin');

      const parts = fileName.split('__');
      return {
        created_on: new Date(parts[0]),
        hash: parts[1]
      };
    });
  }

  async modelExists(modelHash) {
    const models = await this.getAvailableModels();
    return !!_lodash.default.find(models, m => m.hash === modelHash);
  }

  async getModelAsBuffer(modelHash) {
    const models = await this.ghost.directoryListing(this.modelsDir, '*.bin');

    const modelFn = _lodash.default.find(models, m => m.indexOf(modelHash) !== -1);

    return this.ghost.readFileAsBuffer(this.modelsDir, modelFn);
  }

}

exports.default = Storage;

_defineProperty(Storage, "ghostProvider", void 0);