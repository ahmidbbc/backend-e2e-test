const crypto = require('crypto');

const DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';
const VALID_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

function base64urlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function verifyIdToken(idToken, audience) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const [headerEnc, payloadEnc, sigEnc] = parts;
  const header = JSON.parse(base64urlDecode(headerEnc));
  const payload = JSON.parse(base64urlDecode(payloadEnc));

  if (header.alg !== 'RS256') throw new Error(`Unsupported algorithm: ${header.alg}`);

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) throw new Error('Token expired');
  if (!VALID_ISSUERS.has(payload.iss)) throw new Error(`Invalid issuer: ${payload.iss}`);

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(audience)) throw new Error('Invalid audience');

  const { jwks_uri } = await fetchJson(DISCOVERY_URL);
  const { keys } = await fetchJson(jwks_uri);

  const jwk = keys.find(k => k.kid === header.kid && k.use === 'sig');
  if (!jwk) throw new Error(`No key found for kid=${header.kid}`);

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signingInput = Buffer.from(`${headerEnc}.${payloadEnc}`);
  const signature = base64urlDecode(sigEnc);

  if (!crypto.verify('RSA-SHA256', signingInput, publicKey, signature)) {
    throw new Error('Signature verification failed');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

module.exports = { verifyIdToken };
