/**
 * cryptoUtils.ts
 *
 * Client-side deterministic key derivation for e-Chaguzi.
 * All operations run in-browser using Web Crypto API.
 * NO secrets are ever transmitted to the server.
 */

const BN254_R = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

async function hmacSHA256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return new Uint8Array(sig);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (const b of bytes) {
    result = (result << BigInt(8)) | BigInt(b);
  }
  return result;
}

function reduceMod(value: bigint): bigint {
  return value % BN254_R;
}

export interface IdentitySecrets {
  s: bigint;
  n: bigint;
  sHex: string;
  nHex: string;
}

export async function deriveIdentitySecrets(ssoToken: string): Promise<IdentitySecrets> {
  const [sBytes, nBytes] = await Promise.all([
    hmacSHA256(ssoToken, 'e-Chaguzi-Identity-Secret'),
    hmacSHA256(ssoToken, 'e-Chaguzi-Identity-Nullifier'),
  ]);

  const s = reduceMod(bytesToBigInt(sBytes));
  const n = reduceMod(bytesToBigInt(nBytes));

  return {
    s,
    n,
    sHex: '0x' + s.toString(16).padStart(64, '0'),
    nHex: '0x' + n.toString(16).padStart(64, '0'),
  };
}

export function buildCircuitInputs(
  secrets: IdentitySecrets,
  pathElements: string[],
  pathIndices: number[],
  root: string,
  electionId: string,
  candidateId: string,
): Record<string, any> {
  return {
    secret: secrets.s.toString(),
    nullifier: secrets.n.toString(),
    pathElements,
    pathIndices,
    root,
    electionId,
    candidateId,
  };
}

export async function previewNullifierHash(n: bigint, electionId: bigint): Promise<string> {
  const raw = (n ^ electionId) % BN254_R;
  return '0x' + raw.toString(16).padStart(64, '0');
}

export function formatProofForSolidity(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
} {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
  };
}
