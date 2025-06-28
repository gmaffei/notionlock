const crypto = require('crypto');

function generateSlug(length = 8) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length)
    .toLowerCase();
}

module.exports = { generateSlug };