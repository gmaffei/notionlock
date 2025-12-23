const crypto = require('crypto');
const slugAlphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateSlug(length = 8) {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    // Map each byte to a character in our 62-char alphabet
    result += slugAlphabet[bytes[i] % slugAlphabet.length];
  }
  return result;
}

module.exports = { generateSlug };