// decode-token.js - Educational helper for decoding JWTs without secret verification
// Demonstrates that JWTs are only base64url-encoded and signed, NOT encrypted.

const token = process.argv[2];

if (!token) {
  console.log('Usage: node decode-token.js <jwt_token>');
  process.exit(1);
}

// A JWT consists of three parts separated by dots: header.payload.signature
const parts = token.trim().split('.');

if (parts.length !== 3) {
  console.error('Error: Invalid JWT structure. Expected 3 dot-separated parts.');
  process.exit(1);
}

const [rawHeader, rawPayload, signature] = parts;

// Function to decode base64url string to parsed JSON object
function decodeBase64Url(base64UrlStr) {
  try {
    // Buffer natively supports 'base64url' encoding in modern Node.js
    const jsonStr = Buffer.from(base64UrlStr, 'base64url').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    return { error: 'Failed to decode or parse JSON', raw: base64UrlStr };
  }
}

console.log('=== JWT Decoded Structure ===\n');

// 1. HEADER: Contains metadata such as the signing algorithm (alg) and token type (typ)
console.log('--- 1. HEADER (Algorithm & Token Type) ---');
console.log(JSON.stringify(decodeBase64Url(rawHeader), null, 2));

// 2. PAYLOAD: Contains claims such as username, issued-at (iat), and expiration (exp)
// NOTE: Anyone with the token can read this payload - never put secrets here!
console.log('\n--- 2. PAYLOAD (Claims & Data) ---');
console.log(JSON.stringify(decodeBase64Url(rawPayload), null, 2));

// 3. SIGNATURE: Created by hashing header + payload with the secret key to prevent tampering
console.log('\n--- 3. SIGNATURE (Integrity Verification) ---');
console.log(signature);

console.log('\n=============================');
