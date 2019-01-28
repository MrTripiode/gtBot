"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerMiddleware = void 0;

require("bluebird-global");

const EVENTS_TO_IGNORE = ['session_reset', 'bp_dialog_timeout', 'visit'];

const registerMiddleware = async (bp, botScopedNlu) => {
  bp.events.registerMiddleware({
    name: 'nlu.incoming',
    direction: 'incoming',
    order: 10,
    description: 'Process natural language in the form of text. Structured data with an action and parameters for that action is injected in the incoming message event.',
    handler: async (event, next) => {
      const botCtx = botScopedNlu[event.botId];

      if (!botCtx || EVENTS_TO_IGNORE.includes(event.type) || event.hasFlag(bp.IO.WellKnownFlags.SKIP_NATIVE_NLU)) {
        return next();
      }

      try {
        const metadata = await botCtx.extract(event);
        Object.assign(event, {
          nlu: metadata
        });
      } catch (err) {
        bp.logger.warn('Error extracting metadata for incoming text: ' + err.message);
      } finally {
        next();
      }
    }
  });
};

exports.registerMiddleware = registerMiddleware;