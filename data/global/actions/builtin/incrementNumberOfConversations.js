//CHECKSUM:1fab03b305623e9f1b4035651cfbec96715a9bc29bc5b08cb57ad440c0d6112e
"use strict";

/**
 * Increment the number of conversations
 * @title Increment number of conversations
 * @category Storage
 * @author Botpress, Inc.
 * @param {string} output - The state variable to output the count to
 */
const incrementNumberOfConversations = async output => {
  const userId = event.target;
  const botId = event.botId;
  const key = bp.kvs.getUserStorageKey(userId, 'numberOfConversations');
  let value = await bp.kvs.getStorageWithExpiry(botId, key); // Value could be 0

  if (value === undefined) {
    value = 0;
  } else {
    value++;
  }

  await bp.kvs.setStorageWithExpiry(botId, key, value);
  temp[output] = value;
};

return incrementNumberOfConversations(args.output);