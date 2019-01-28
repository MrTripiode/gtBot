"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FiveFolder = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FiveFolder {
  constructor(dataset) {
    this.dataset = dataset;

    _defineProperty(this, "results", {});

    _defineProperty(this, "_record", suiteName => (expected, actual) => {
      const {
        tp,
        fp,
        fn
      } = this.results[suiteName];

      if (expected === actual) {
        tp[expected] = (tp[expected] || 0) + 1;
      } else {
        fp[actual] = (fp[actual] || 0) + 1;
        fn[expected] = (fn[expected] || 0) + 1;
      }
    });
  }

  async fold(suiteName, trainFn, evaluateFn) {
    this.results[suiteName] = {
      fp: {},
      tp: {},
      fn: {}
    };

    const shuffled = _lodash.default.shuffle(this.dataset);

    const chunks = _lodash.default.chunk(shuffled, Math.ceil(shuffled.length / 2));

    await Promise.mapSeries(chunks, async testSet => {
      const trainSet = _lodash.default.flatten(chunks.filter(c => c !== testSet));

      await trainFn([...trainSet]);
      await evaluateFn([...testSet], this._record(suiteName));
    });
  }

  getResults() {
    const ret = {};

    for (const suite in this.results) {
      const classes = _lodash.default.uniq([..._lodash.default.keys(this.results[suite].fp), ..._lodash.default.keys(this.results[suite].tp), ..._lodash.default.keys(this.results[suite].fn)]);

      const result = {};

      for (const cls of classes) {
        const precision = (this.results[suite].tp[cls] || 0) / ((this.results[suite].tp[cls] || 0) + (this.results[suite].fp[cls] || 0));
        const recall = (this.results[suite].tp[cls] || 0) / ((this.results[suite].tp[cls] || 0) + (this.results[suite].fn[cls] || 0));
        const f1 = 2 * (precision * recall / (precision + recall));

        if (this.results[suite].tp[cls] + this.results[suite].fn[cls] >= 5) {
          result[cls] = {
            tp: this.results[suite].tp[cls],
            fp: this.results[suite].fp[cls],
            fn: this.results[suite].fn[cls],
            precision,
            recall,
            f1
          };
        }
      }

      const v = _lodash.default.values(result);

      result['all'] = {
        f1: _lodash.default.meanBy(v, 'f1'),
        precision: _lodash.default.meanBy(v, 'precision'),
        recall: _lodash.default.meanBy(v, 'recall'),
        tp: 0,
        fp: 0,
        fn: 0
      };
      ret[suite] = result;
    }

    return ret;
  }

}

exports.FiveFolder = FiveFolder;