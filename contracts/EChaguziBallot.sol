// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external view returns (bool r);
}

contract EChaguziBallot is ERC2771Context, Ownable {
    IVerifier public immutable verifier;
    uint256 public immutable electionId;

    mapping(uint256 => bool) public validMerkleRoots;
    // We use bytes32 for gas efficiency with Poseidon nullifier hashes
    mapping(bytes32 => bool) private _nullifiers;
    mapping(uint256 => uint256) public candidateVotes;

    event VoteCast(uint256 indexed candidateId, bytes32 nullifierHash);
    event MerkleRootAdded(uint256 indexed root);

    error InvalidProof();
    error NullifierAlreadyUsed();
    error InvalidMerkleRoot();

    constructor(
        address trustedForwarder,
        address verifierAddress,
        uint256 _electionId
    ) ERC2771Context(trustedForwarder) Ownable(msg.sender) {
        verifier = IVerifier(verifierAddress);
        electionId = _electionId;
    }

    function addMerkleRoot(uint256 root) external onlyOwner {
        validMerkleRoots[root] = true;
        emit MerkleRootAdded(root);
    }

    function castVote(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256 root,
        bytes32 nullifierHash,
        uint256 candidateId
    ) external {
        if (!validMerkleRoots[root]) revert InvalidMerkleRoot();
        if (_nullifiers[nullifierHash]) revert NullifierAlreadyUsed();

        // The input to the circuit is [root, electionId, candidateId]
        uint256[3] memory publicInputs = [root, electionId, candidateId];

        bool isValid = verifier.verifyProof(a, b, c, publicInputs);
        if (!isValid) revert InvalidProof();

        _nullifiers[nullifierHash] = true;
        candidateVotes[candidateId] += 1;

        emit VoteCast(candidateId, nullifierHash);
    }

    function isNullifierSpent(bytes32 nullifierHash) external view returns (bool) {
        return _nullifiers[nullifierHash];
    }
}
