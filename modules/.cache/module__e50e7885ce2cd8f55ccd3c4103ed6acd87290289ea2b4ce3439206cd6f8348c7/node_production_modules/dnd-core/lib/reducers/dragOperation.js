"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var without_1 = __importDefault(require("lodash/without"));
var dragDrop_1 = require("../actions/dragDrop");
var registry_1 = require("../actions/registry");
var initialState = {
    itemType: null,
    item: null,
    sourceId: null,
    targetIds: [],
    dropResult: null,
    didDrop: false,
    isSourcePublic: null,
};
function dragOperation(state, action) {
    if (state === void 0) { state = initialState; }
    var payload = action.payload;
    switch (action.type) {
        case dragDrop_1.BEGIN_DRAG:
            return __assign({}, state, { itemType: payload.itemType, item: payload.item, sourceId: payload.sourceId, isSourcePublic: payload.isSourcePublic, dropResult: null, didDrop: false });
        case dragDrop_1.PUBLISH_DRAG_SOURCE:
            return __assign({}, state, { isSourcePublic: true });
        case dragDrop_1.HOVER:
            return __assign({}, state, { targetIds: payload.targetIds });
        case registry_1.REMOVE_TARGET:
            if (state.targetIds.indexOf(payload.targetId) === -1) {
                return state;
            }
            return __assign({}, state, { targetIds: without_1.default(state.targetIds, payload.targetId) });
        case dragDrop_1.DROP:
            return __assign({}, state, { dropResult: payload.dropResult, didDrop: true, targetIds: [] });
        case dragDrop_1.END_DRAG:
            return __assign({}, state, { itemType: null, item: null, sourceId: null, dropResult: null, didDrop: false, isSourcePublic: null, targetIds: [] });
        default:
            return state;
    }
}
exports.default = dragOperation;
//# sourceMappingURL=dragOperation.js.map