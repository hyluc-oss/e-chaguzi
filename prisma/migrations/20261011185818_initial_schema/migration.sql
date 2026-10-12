-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VOTER', 'ADMIN', 'TRUSTEE');

-- CreateEnum
CREATE TYPE "ElectionPosition" AS ENUM ('USRC_EXECUTIVE', 'FACULTY_REPRESENTATIVE', 'FLOOR_DELEGATE', 'CLASS_REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "NominationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "institutionSubject" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VOTER',
    "facultyKey" TEXT,
    "residenceKey" TEXT,
    "classKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "chainElectionId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contractAddress" TEXT,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "trusteeThreshold" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionRace" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "position" "ElectionPosition" NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,

    CONSTRAINT "ElectionRace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionTrustee" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "trusteeId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionTrustee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "nominationId" TEXT,
    "name" TEXT NOT NULL,
    "runningMateName" TEXT,
    "manifesto" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominationRequest" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "position" "ElectionPosition" NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "runningMateName" TEXT,
    "manifesto" TEXT NOT NULL,
    "status" "NominationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "NominationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterMerkleRoot" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterMerkleRoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterCommitment" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "leafIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nullifier" (
    "hash" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nullifier_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "electionId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "details" JSONB,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SamlRequest" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SamlRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_institutionSubject_key" ON "User"("institutionSubject");

-- CreateIndex
CREATE UNIQUE INDEX "Election_chainElectionId_key" ON "Election"("chainElectionId");

-- CreateIndex
CREATE INDEX "ElectionRace_electionId_position_idx" ON "ElectionRace"("electionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionRace_electionId_position_scopeKey_key" ON "ElectionRace"("electionId", "position", "scopeKey");

-- CreateIndex
CREATE INDEX "ElectionTrustee_trusteeId_idx" ON "ElectionTrustee"("trusteeId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionTrustee_electionId_trusteeId_key" ON "ElectionTrustee"("electionId", "trusteeId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionTrustee_electionId_seatIndex_key" ON "ElectionTrustee"("electionId", "seatIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_nominationId_key" ON "Candidate"("nominationId");

-- CreateIndex
CREATE INDEX "Candidate_raceId_idx" ON "Candidate"("raceId");

-- CreateIndex
CREATE INDEX "NominationRequest_electionId_status_createdAt_idx" ON "NominationRequest"("electionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "NominationRequest_applicantId_electionId_idx" ON "NominationRequest"("applicantId", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "NominationRequest_applicantId_raceId_key" ON "NominationRequest"("applicantId", "raceId");

-- CreateIndex
CREATE INDEX "VoterMerkleRoot_electionId_createdAt_idx" ON "VoterMerkleRoot"("electionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoterMerkleRoot_electionId_root_key" ON "VoterMerkleRoot"("electionId", "root");

-- CreateIndex
CREATE INDEX "VoterCommitment_electionId_idx" ON "VoterCommitment"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "VoterCommitment_electionId_commitment_key" ON "VoterCommitment"("electionId", "commitment");

-- CreateIndex
CREATE UNIQUE INDEX "VoterCommitment_electionId_leafIndex_key" ON "VoterCommitment"("electionId", "leafIndex");

-- CreateIndex
CREATE INDEX "Nullifier_electionId_createdAt_idx" ON "Nullifier"("electionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_electionId_createdAt_idx" ON "AuditLog"("electionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "SamlRequest_createdAt_idx" ON "SamlRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "ElectionRace" ADD CONSTRAINT "ElectionRace_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionTrustee" ADD CONSTRAINT "ElectionTrustee_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionTrustee" ADD CONSTRAINT "ElectionTrustee_trusteeId_fkey" FOREIGN KEY ("trusteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "ElectionRace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "NominationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominationRequest" ADD CONSTRAINT "NominationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominationRequest" ADD CONSTRAINT "NominationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominationRequest" ADD CONSTRAINT "NominationRequest_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominationRequest" ADD CONSTRAINT "NominationRequest_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "ElectionRace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterMerkleRoot" ADD CONSTRAINT "VoterMerkleRoot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterCommitment" ADD CONSTRAINT "VoterCommitment_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nullifier" ADD CONSTRAINT "Nullifier_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
