import { buildPoseidon, type Poseidon } from "circomlibjs";
import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree";

// We use depth 20 which supports 2^20 = 1,048,576 leaves
export const TREE_DEPTH = 20;

// Default zero value for empty leaves
export const ZERO_VALUE = BigInt(0);

let poseidonInstance: Poseidon | null = null;

async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Custom hash function using Poseidon that matches the circom implementation.
 */
export async function poseidonHash(nodes: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  const hash = poseidon(nodes.map(n => n.toString()));
  return BigInt(poseidon.F.toString(hash));
}

/**
 * Creates an empty Incremental Merkle Tree configured for e-Chaguzi.
 * Note: since poseidonHash is async, you need to use an async wrapper or pre-compute the hash function,
 * but @zk-kit/incremental-merkle-tree supports synchronous hash functions.
 * In a real implementation, you'd load Poseidon first, then construct the tree with the sync F.toString(hash)
 */
export async function createEmptyTree(): Promise<IncrementalMerkleTree> {
  const poseidon = await getPoseidon();
  const syncHash = (nodes: (bigint | number | string)[]) =>
    BigInt(poseidon.F.toString(poseidon(nodes.map(n => n.toString()))));
  return new IncrementalMerkleTree(syncHash, TREE_DEPTH, ZERO_VALUE, 2);
}

/**
 * Rebuilds a Merkle tree from a list of leaves (e.g. from the database).
 */
export async function buildTreeFromLeaves(leaves: string[]): Promise<IncrementalMerkleTree> {
  const tree = await createEmptyTree();
  for (const leaf of leaves) {
    tree.insert(BigInt(leaf));
  }
  return tree;
}
