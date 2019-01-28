var crypto = self.crypto || self.msCrypto

/*
 * This alphabet uses a-z A-Z 0-9 _~ symbols.
 * Symbols order was changed for better gzip compression.
 */
var url = 'ModuleSymbhasOwnPr0123456789ABCDEFGHIJKLNQRTUVWXYZ_cfgijkpqtvxz~'

module.exports = function (size) {
  size = size || 21
  var id = ''
  var bytes = crypto.getRandomValues(new Uint8Array(size))
  while (0 < size--) {
    id += url[bytes[size] & 63]
  }
  return Promise.resolve(id)
}
