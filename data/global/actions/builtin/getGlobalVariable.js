//CHECKSUM:3c94ad00dc499576c320aa38239199fb8ffd9c2941d053ff3498ad4b2b7c588f
"use strict";

/**
 * Get a variable globally
 * @title Get global variable
 * @category Storage
 * @author Botpress, Inc.
 * @param {string} name - The name of the variable
 * @param {string} output - The state variable to ouput to
 */
const getGlobalVariable = async (name, output) => {
  const key = bp.kvs.getGlobalStorageKey(name);
  const result = await bp.kvs.getStorageWithExpiry(event.botId, key);
  temp[output] = result;
};

return getGlobalVariable(args.name, args.output);