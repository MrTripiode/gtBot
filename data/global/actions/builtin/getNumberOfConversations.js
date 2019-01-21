//CHECKSUM:b4fd7b3e75495e5689a103229c82d1a060dc467883136915ad9535c4c2c3b230
"use strict";

/**
 * Get number of conversations
 * @title Get number of conversations
 * @category Storage
 * @author Botpress, Inc.
 * @param {string} output - The state variable to output the count to
 */
const getNumberOfConversations = async output => {
  const userId = event.target;
  const botId = event.botId;
  const key = bp.kvs.getUserStorageKey(userId, 'numberOfConversations');
  const value = await bp.kvs.getStorageWithExpiry(botId, key);
  temp[output] = value;
};

return getNumberOfConversations();