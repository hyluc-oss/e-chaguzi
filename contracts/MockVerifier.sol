// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVerifier {
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[3] memory
    ) external pure returns (bool) {
        // Always returns true for testing purposes
        return true;
    }
}
