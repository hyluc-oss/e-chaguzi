pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    signal totalPath[levels + 1];
    totalPath[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        selectors[i] = Mux1();
        selectors[i].c[0] <== totalPath[i];
        selectors[i].c[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].out;
        hashers[i].inputs[1] <== totalPath[i] + pathElements[i] - selectors[i].out;

        totalPath[i + 1] <== hashers[i].out;
    }

    root === totalPath[levels];
}

template VoteVerification(treeLevels) {
    // Private Inputs
    signal input secret;
    signal input nullifier;
    signal input pathElements[treeLevels];
    signal input pathIndices[treeLevels];

    // Public Inputs
    signal input root;
    signal input electionId;
    signal input candidateId;

    // Public Output
    signal output nullifierHash;

    // 1. Calculate Commitment = Poseidon(secret, nullifier)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== nullifier;

    // 2. Verify Membership via Merkle Path
    component treeChecker = MerkleTreeChecker(treeLevels);
    treeChecker.leaf <== leafHasher.out;
    treeChecker.root <== root;
    for (var i = 0; i < treeLevels; i++) {
        treeChecker.pathElements[i] <== pathElements[i];
        treeChecker.pathIndices[i] <== pathIndices[i];
    }

    // 3. Compute Nullifier Hash = Poseidon(nullifier, electionId)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHasher.inputs[1] <== electionId;

    nullifierHash <== nullifierHasher.out;

    // Dummy constraint to bind candidateId to the proof payload
    signal candidateSquare;
    candidateSquare <== candidateId * candidateId;
}

component main {public [root, electionId, candidateId]} = VoteVerification(20);
