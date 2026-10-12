#!/bin/bash
set -e

# NOTE: This script requires 'circom' and 'snarkjs' to be installed globally or available in PATH.
# npm install -g snarkjs

echo "1. Compiling Circuit..."
mkdir -p build/circuits
cd circuits
circom vote.circom --r1cs --wasm --sym --c -o ../build/circuits

cd ../build/circuits
echo "2. Setting up dev Powers of Tau (NOT FOR PRODUCTION)..."
# In a real scenario, use a large enough powers of tau (e.g. 21 for 2^21 constraints)
snarkjs powersoftau new bn128 21 pot21_0000.ptau -v
snarkjs powersoftau contribute pot21_0000.ptau pot21_0001.ptau --name="First contribution" -v -e="some random text"

echo "3. Phase 2 (Circuit Specific Setup)..."
snarkjs powersoftau prepare phase2 pot21_0001.ptau pot21_final.ptau -v
snarkjs groth16 setup vote.r1cs pot21_final.ptau vote_0000.zkey
snarkjs zkey contribute vote_0000.zkey vote_final.zkey --name="Second contribution" -v -e="another random text"
snarkjs zkey export verificationkey vote_final.zkey verification_key.json

echo "4. Exporting Solidity Verifier..."
snarkjs zkey export solidityverifier vote_final.zkey ../../contracts/Groth16Verifier.sol

echo "5. Copying WASM and zkey to public directory..."
mkdir -p ../../public/circuits
cp vote_js/vote.wasm ../../public/circuits/
cp vote_final.zkey ../../public/circuits/

echo "Done! The Verifier contract is in 'contracts/' and the circuit assets are in 'public/circuits/'."
