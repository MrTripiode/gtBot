//CHECKSUM:ff1608d85f997fddd7bb21a4a3f29cc83b6bedd53e9ef555f41a0a1de75d1446
"use strict";

/**
 * Store data to desired storage based on the time to live expectation. Read the
 * documentation for more details
 *
 * @title Set Variable
 * @category Storage
 * @author Botpress, Inc.
 * @param {string} type - Pick between: user, session, temp, bot
 * @param {string} name - The name of the variable
 * @param {any} value - Set the value of the variable
 */
const setVariable = async (type, name, value) => {
  if (type === 'bot') {
    const original = await bp.kvs.get(event.botId, 'global');
    await bp.kvs.set(event.botId, 'global', { ...original,
      [name]: value
    });
  } else {
    event.state[type][name] = value !== 'null' ? value : undefined;
  }
};

return setVariable(args.type, args.name, args.value);