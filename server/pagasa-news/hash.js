const crypto = require('crypto');

function normalizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function contentHash(title, content) {
  const payload = `${normalizeText(title)}|${normalizeText(content)}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { contentHash, normalizeText };
