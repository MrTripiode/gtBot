"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var invariant_1 = __importDefault(require("invariant"));
var isArray_1 = __importDefault(require("lodash/isArray"));
var matchesType_1 = __importDefault(require("./utils/matchesType"));
var coords_1 = require("./utils/coords");
var dirtiness_1 = require("./utils/dirtiness");
var DragDropMonitorImpl = /** @class */ (function () {
    function DragDropMonitorImpl(store, registry) {
        this.store = store;
        this.registry = registry;
    }
    DragDropMonitorImpl.prototype.subscribeToStateChange = function (listener, options) {
        var _this = this;
        if (options === void 0) { options = { handlerIds: undefined }; }
        var handlerIds = options.handlerIds;
        invariant_1.default(typeof listener === 'function', 'listener must be a function.');
        invariant_1.default(typeof handlerIds === 'undefined' || isArray_1.default(handlerIds), 'handlerIds, when specified, must be an array of strings.');
        var prevStateId = this.store.getState().stateId;
        var handleChange = function () {
            var state = _this.store.getState();
            var currentStateId = state.stateId;
            try {
                var canSkipListener = currentStateId === prevStateId ||
                    (currentStateId === prevStateId + 1 &&
                        !dirtiness_1.areDirty(state.dirtyHandlerIds, handlerIds));
                if (!canSkipListener) {
                    listener();
                }
            }
            finally {
                prevStateId = currentStateId;
            }
        };
        return this.store.subscribe(handleChange);
    };
    DragDropMonitorImpl.prototype.subscribeToOffsetChange = function (listener) {
        var _this = this;
        invariant_1.default(typeof listener === 'function', 'listener must be a function.');
        var previousState = this.store.getState().dragOffset;
        var handleChange = function () {
            var nextState = _this.store.getState().dragOffset;
            if (nextState === previousState) {
                return;
            }
            previousState = nextState;
            listener();
        };
        return this.store.subscribe(handleChange);
    };
    DragDropMonitorImpl.prototype.canDragSource = function (sourceId) {
        var source = this.registry.getSource(sourceId);
        invariant_1.default(source, 'Expected to find a valid source.');
        if (this.isDragging()) {
            return false;
        }
        return source.canDrag(this, sourceId);
    };
    DragDropMonitorImpl.prototype.canDropOnTarget = function (targetId) {
        var target = this.registry.getTarget(targetId);
        invariant_1.default(target, 'Expected to find a valid target.');
        if (!this.isDragging() || this.didDrop()) {
            return false;
        }
        var targetType = this.registry.getTargetType(targetId);
        var draggedItemType = this.getItemType();
        return (matchesType_1.default(targetType, draggedItemType) && target.canDrop(this, targetId));
    };
    DragDropMonitorImpl.prototype.isDragging = function () {
        return Boolean(this.getItemType());
    };
    DragDropMonitorImpl.prototype.isDraggingSource = function (sourceId) {
        var source = this.registry.getSource(sourceId, true);
        invariant_1.default(source, 'Expected to find a valid source.');
        if (!this.isDragging() || !this.isSourcePublic()) {
            return false;
        }
        var sourceType = this.registry.getSourceType(sourceId);
        var draggedItemType = this.getItemType();
        if (sourceType !== draggedItemType) {
            return false;
        }
        return source.isDragging(this, sourceId);
    };
    DragDropMonitorImpl.prototype.isOverTarget = function (targetId, options) {
        if (options === void 0) { options = { shallow: false }; }
        var shallow = options.shallow;
        if (!this.isDragging()) {
            return false;
        }
        var targetType = this.registry.getTargetType(targetId);
        var draggedItemType = this.getItemType();
        if (draggedItemType && !matchesType_1.default(targetType, draggedItemType)) {
            return false;
        }
        var targetIds = this.getTargetIds();
        if (!targetIds.length) {
            return false;
        }
        var index = targetIds.indexOf(targetId);
        if (shallow) {
            return index === targetIds.length - 1;
        }
        else {
            return index > -1;
        }
    };
    DragDropMonitorImpl.prototype.getItemType = function () {
        return this.store.getState().dragOperation.itemType;
    };
    DragDropMonitorImpl.prototype.getItem = function () {
        return this.store.getState().dragOperation.item;
    };
    DragDropMonitorImpl.prototype.getSourceId = function () {
        return this.store.getState().dragOperation.sourceId;
    };
    DragDropMonitorImpl.prototype.getTargetIds = function () {
        return this.store.getState().dragOperation.targetIds;
    };
    DragDropMonitorImpl.prototype.getDropResult = function () {
        return this.store.getState().dragOperation.dropResult;
    };
    DragDropMonitorImpl.prototype.didDrop = function () {
        return this.store.getState().dragOperation.didDrop;
    };
    DragDropMonitorImpl.prototype.isSourcePublic = function () {
        return this.store.getState().dragOperation.isSourcePublic;
    };
    DragDropMonitorImpl.prototype.getInitialClientOffset = function () {
        return this.store.getState().dragOffset.initialClientOffset;
    };
    DragDropMonitorImpl.prototype.getInitialSourceClientOffset = function () {
        return this.store.getState().dragOffset.initialSourceClientOffset;
    };
    DragDropMonitorImpl.prototype.getClientOffset = function () {
        return this.store.getState().dragOffset.clientOffset;
    };
    DragDropMonitorImpl.prototype.getSourceClientOffset = function () {
        return coords_1.getSourceClientOffset(this.store.getState().dragOffset);
    };
    DragDropMonitorImpl.prototype.getDifferenceFromInitialOffset = function () {
        return coords_1.getDifferenceFromInitialOffset(this.store.getState().dragOffset);
    };
    return DragDropMonitorImpl;
}());
exports.default = DragDropMonitorImpl;
//# sourceMappingURL=DragDropMonitorImpl.js.map