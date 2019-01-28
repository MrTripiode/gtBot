"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class AnalyticsDb {
  constructor(bp) {
    _defineProperty(this, "knex", void 0);

    _defineProperty(this, "initializeDb", () => {
      if (!this.knex) {
        throw new Error('you must initialize the database before');
      }

      return this.knex.createTableIfNotExists('analytics_interactions', table => {
        table.increments('id').primary();
        table.timestamp('ts');
        table.string('type');
        table.string('text');
        table.string('channel');
        table.string('user_id');
        table.enu('direction', ['in', 'out']);
      }).then(() => {
        return this.knex.createTableIfNotExists('analytics_runs', table => {
          table.increments('id').primary();
          table.timestamp('ts');
        });
      }).then(() => {
        return this.knex.createTableIfNotExists('analytics_custom', table => {
          table.string('date');
          table.string('name');
          table.integer('count');
          table.unique(['date', 'name']);
        });
      }).then(() => this.knex);
    });

    _defineProperty(this, "saveIncoming", event => {
      const interactionRow = {
        ts: this.knex.date.now(),
        type: event.type,
        text: event.payload.text,
        channel: event.channel,
        user_id: event.target,
        direction: 'in'
      };
      return this.knex('analytics_interactions').insert(interactionRow);
    });

    _defineProperty(this, "saveOutgoing", event => {
      const interactionRow = {
        ts: this.knex.date.now(),
        type: event.type,
        text: event.text,
        channel: event.channel,
        user_id: event.target,
        direction: 'out'
      };
      return this.knex('analytics_interactions').insert(interactionRow);
    });

    this.knex = bp.database;
  }

}

exports.default = AnalyticsDb;