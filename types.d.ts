declare module 'circomlibjs' {
  export interface PoseidonField {
    toString(value: Uint8Array): string;
  }

  export interface Poseidon {
    (inputs: (string | number | bigint)[]): Uint8Array;
    F: PoseidonField;
  }

  export function buildPoseidon(): Promise<Poseidon>;
  export function buildBabyjub(): Promise<unknown>;
}

declare module '@zk-kit/incremental-merkle-tree' {
  export type Node = bigint | number | string;
  export type HashFunction = (values: Node[]) => Node;
  export type MerkleProof = {
    root: Node;
    leaf: Node;
    siblings: Node[][];
    pathIndices: number[];
  };

  export class IncrementalMerkleTree {
    static readonly maxDepth: number;
    constructor(hash: HashFunction, depth: number, zeroValue: Node, arity?: number, leaves?: Node[]);
    readonly root: Node;
    readonly depth: number;
    readonly leaves: Node[];
    readonly zeroes: Node[];
    readonly arity: number;
    indexOf(leaf: Node): number;
    insert(leaf: Node): void;
    delete(index: number): void;
    update(index: number, newLeaf: Node): void;
    createProof(index: number): MerkleProof;
    verifyProof(proof: MerkleProof): boolean;
  }
}

declare module 'snarkjs' {
  export interface Groth16Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export const groth16: {
    fullProve(
      inputSignals: Record<string, string | number | bigint>,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: Groth16Proof; publicSignals: string[] }>;
  };
}
