"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var sdk = _interopRequireWildcard(require("botpress/sdk"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

const generateFlow = data => {
  let onInvalidText = undefined;

  if (data.config.invalidText && data.config.invalidText.length) {
    onInvalidText = data.config.invalidText;
  }

  const maxAttempts = data.config.nbMaxRetries;
  const nodes = [{
    name: 'entry',
    onEnter: [{
      type: sdk.NodeActionType.RenderElement,
      name: `#!${data.contentId}`,
      args: {
        skill: 'choice'
      }
    }],
    next: [{
      condition: 'true',
      node: 'parse'
    }]
  }, {
    name: 'parse',
    onReceive: [{
      type: sdk.NodeActionType.RunAction,
      name: 'basic-skills/choice_parse_answer',
      args: data
    }],
    next: [{
      condition: `temp['skill-choice-valid'] === true`,
      node: '#'
    }, {
      condition: 'true',
      node: 'invalid'
    }]
  }, {
    name: 'invalid',
    onEnter: [{
      type: sdk.NodeActionType.RunAction,
      name: 'basic-skills/choice_invalid_answer'
    }],
    next: [{
      condition: `temp['skill-choice-invalid-count'] <= ${maxAttempts}`,
      node: 'sorry'
    }, {
      condition: 'true',
      node: '#'
    }]
  }, {
    name: 'sorry',
    onEnter: [{
      type: sdk.NodeActionType.RenderElement,
      name: `#!${data.contentId}`,
      args: { ...{
          skill: 'choice'
        },
        ...(onInvalidText ? {
          text: onInvalidText
        } : {})
      }
    }],
    next: [{
      condition: 'true',
      node: 'parse'
    }]
  }];
  return {
    transitions: createTransitions(data),
    flow: {
      nodes: nodes,
      catchAll: {
        next: []
      }
    }
  };
};

const createTransitions = data => {
  const transitions = Object.keys(data.keywords).map(choice => {
    const choiceShort = choice.length > 8 ? choice.substr(0, 7) + '...' : choice;
    return {
      caption: `User picked [${choiceShort}]`,
      condition: `temp['skill-choice-ret'] == "${choice}"`,
      node: ''
    };
  });
  transitions.push({
    caption: 'On failure',
    condition: 'true',
    node: ''
  });
  return transitions;
};

var _default = {
  generateFlow
};
exports.default = _default;