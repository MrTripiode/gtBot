//CHECKSUM:9062cd92851b3a2805af18fa74b22633700ec84759ff4ec4bd2e814e34a4cc83
"use strict";

const messageTypesToDiscard = ['session_reset', 'typing', 'visit'];

if (messageTypesToDiscard.includes(event.type)) {
  event.setFlag(bp.IO.WellKnownFlags.SKIP_DIALOG_ENGINE, true);
}