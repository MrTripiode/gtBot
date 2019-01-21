//CHECKSUM:ef47f816fd553b2506bd639e792e017c525219ea048923a14d20fff0e648fd6c
"use strict";

/**
 * Reset a variable globally
 * @title Reset global variable
 * @category Storage
 * @author Botpress, Inc.
 * @param {string} name - The name of the variable
 */
const resetGlobalVariable = async name => {
  const key = bp.kvs.getGlobalStorageKey(name);
  await bp.kvs.removeStorageKeysStartingWith(key);
};

return resetGlobalVariable(args.name);