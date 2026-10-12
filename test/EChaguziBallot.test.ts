import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("EChaguziBallot", function () {
  let verifier: any;
  let ballot: any;
  let forwarder: any;
  let owner: any;
  let relayer: any;

  const electionId = 1;
  const root = "123456789"; // Mock root
  const nullifierHash = ethers.zeroPadValue(ethers.toBeHex(1), 32); // Mock bytes32

  beforeEach(async function () {
    [owner, relayer] = await ethers.getSigners();

    // Deploy Mock Verifier (returns true for testing)
    const VerifierFactory = await ethers.getContractFactory("MockVerifier");
    verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();

    // Deploy Forwarder
    const ForwarderFactory = await ethers.getContractFactory("MinimalForwarder");
    forwarder = await ForwarderFactory.deploy("EChaguziForwarder");
    await forwarder.waitForDeployment();

    // Deploy Ballot
    const BallotFactory = await ethers.getContractFactory("EChaguziBallot");
    ballot = await BallotFactory.deploy(
      await forwarder.getAddress(),
      await verifier.getAddress(),
      electionId
    );
    await ballot.waitForDeployment();
  });

  it("Should accept valid vote and prevent double voting", async function () {
    // Add valid Merkle root
    await ballot.addMerkleRoot(root);

    const a: [string, string] = ["0", "0"];
    const b: [[string, string], [string, string]] = [["0", "0"], ["0", "0"]];
    const c: [string, string] = ["0", "0"];
    const candidateId = 42;

    // First vote
    const tx = await ballot.castVote(a, b, c, root, nullifierHash, candidateId);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
    
    // Tally should increment
    expect(await ballot.candidateVotes(candidateId)).to.equal(1);

    // Second vote with same nullifier should fail
    await expect(
      ballot.castVote(a, b, c, root, nullifierHash, candidateId)
    ).to.be.revertedWithCustomError(ballot, "NullifierAlreadyUsed");
  });

  it("Should reject invalid Merkle root", async function () {
    const invalidRoot = "999";
    const a: [string, string] = ["0", "0"];
    const b: [[string, string], [string, string]] = [["0", "0"], ["0", "0"]];
    const c: [string, string] = ["0", "0"];
    
    await expect(
      ballot.castVote(a, b, c, invalidRoot, nullifierHash, 42)
    ).to.be.revertedWithCustomError(ballot, "InvalidMerkleRoot");
  });
});
