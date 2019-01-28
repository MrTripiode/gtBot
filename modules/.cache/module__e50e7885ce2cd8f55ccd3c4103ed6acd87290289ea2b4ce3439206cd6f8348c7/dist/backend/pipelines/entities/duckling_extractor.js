"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DucklingEntityExtractor = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class DucklingEntityExtractor {
  constructor(logger) {
    this.logger = logger;
  }

  static configure(enabled, url) {
    this.enabled = enabled;

    if (enabled) {
      this.client = _axios.default.create({
        baseURL: url,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }
  }

  async extract(text, lang) {
    if (!DucklingEntityExtractor.enabled) return [];

    try {
      const tz = this._getTz();

      const {
        data
      } = await DucklingEntityExtractor.client.post('/parse', `lang=${lang}&text=${text}&reftime=${Date.now()}&tz=${tz}`);

      if (!_lodash.default.isArray(data)) {
        throw new Error('Unexpected response from Duckling. Expected an array.');
      }

      return data.map(ent => ({
        name: ent.dim,
        type: 'system',
        meta: this._mapMeta(ent),
        data: this._mapBody(ent.dim, ent.value)
      }));
    } catch (err) {
      const error = err.response ? err.response.data : err;
      this.logger && this.logger.attachError(error).warn('[Native] error extracting duckling entities');
      return [];
    }
  }

  _getTz() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  _mapMeta(DEntity) {
    return {
      confidence: 1,
      // rule based extraction
      provider: 'native',
      source: DEntity.body,
      start: DEntity.start,
      end: DEntity.end,
      raw: DEntity
    };
  }

  _mapBody(dimension, rawVal) {
    switch (dimension) {
      case 'duration':
        const normalized = rawVal.normalized;
        delete rawVal['normalized'];
        return { ...normalized,
          extras: rawVal
        };

      case 'quantity':
        return {
          value: rawVal.value,
          unit: rawVal.unit,
          extras: {
            product: rawVal.product
          }
        };

      case 'time':
        return {
          value: rawVal.value,
          unit: rawVal.grain,
          extras: rawVal.values.length ? rawVal.values : {}
        };

      default:
        return {
          extras: {},
          value: rawVal.value,
          unit: rawVal.unit
        };
    }
  }

}

exports.DucklingEntityExtractor = DucklingEntityExtractor;

_defineProperty(DucklingEntityExtractor, "enabled", void 0);

_defineProperty(DucklingEntityExtractor, "client", void 0);