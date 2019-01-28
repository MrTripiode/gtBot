"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sanitizeFilenameNoExt = void 0;

const sanitizeFilenameNoExt = name => name.toLowerCase().replace('.json', '').replace(/[^a-z0-9-_]/gi, '_');

exports.sanitizeFilenameNoExt = sanitizeFilenameNoExt;