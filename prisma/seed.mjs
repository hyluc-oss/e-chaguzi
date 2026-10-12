import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const electionData = {
  id: 'elec-2026-usrc',
  name: '2026/2027 General Student Government Election',
  status: 'SCHEDULED',
  startTime: '2026-11-15T06:00:00.000Z',
  endTime: '2026-11-15T18:00:00.000Z',
  races: [
    {
      id: 'scope-01',
      position: 'USRC_EXECUTIVE',
      scope: 'All-University',
      scopeKey: 'ALL',
      candidates: [
        {
          id: 'cand-101',
          name: 'Baraka Joseph Mwakitalu',
          runningMateName: 'Aisha Suleiman Rashid',
          manifesto: 'Digitalization of student welfare, zero clearance delays, and expanded Wi-Fi bandwidth.',
        },
        {
          id: 'cand-102',
          name: 'Emmanuel Godfrey Kimaro',
          runningMateName: 'Neema John Mwangi',
          manifesto: 'Transparent fund allocation, enhanced cafeteria hygiene standards, and 24/7 library access.',
        },
      ],
    },
    {
      id: 'scope-02',
      position: 'FACULTY_REPRESENTATIVE',
      scope: 'Faculty COICT',
      scopeKey: 'FACULTY_COICT',
      candidates: [
        {
          id: 'cand-201',
          name: 'Frank Juvenal Mahende',
          runningMateName: null,
          manifesto: 'Upgrading laboratory computing resources and securing software dev sponsorships.',
        },
        {
          id: 'cand-202',
          name: 'Linah Richard Ndosi',
          runningMateName: null,
          manifesto: 'Peer-to-peer academic mentoring networks and extended timetable flexibility.',
        },
      ],
    },
    {
      id: 'scope-03',
      position: 'FLOOR_DELEGATE',
      scope: 'Hall 1 Block B',
      scopeKey: 'HALL_1_BLOCK_B',
      candidates: [
        {
          id: 'cand-301',
          name: 'Jastin Norbert Mtega',
          runningMateName: null,
          manifesto: 'Immediate maintenance of block plumbing, hot water availability, and room repairs.',
        },
        {
          id: 'cand-302',
          name: 'Eunice John Kachundwa',
          runningMateName: null,
          manifesto: 'Enhanced block security, communal study room refurbishments, and noise protocols.',
        },
      ],
    },
    {
      id: 'scope-04',
      position: 'CLASS_REPRESENTATIVE',
      scope: 'CS Year 2',
      scopeKey: 'CS_YEAR_2',
      candidates: [
        {
          id: 'cand-401',
          name: 'Goodluck James Peter',
          runningMateName: null,
          manifesto: 'Streamlined assignment submission channels and direct lecturer liaison.',
        },
        {
          id: 'cand-402',
          name: 'Sarah Muyanga Kamoga',
          runningMateName: null,
          manifesto: 'Equal distribution of exam revision materials and accessible lecture recording archives.',
        },
      ],
    },
  ],
}

function assertMatchesSeed(existing) {
  const sameElection =
    existing.name === electionData.name &&
    existing.status === electionData.status &&
    existing.startTime.toISOString() === electionData.startTime &&
    existing.endTime.toISOString() === electionData.endTime
  const actualRaces = [...existing.races].sort((a, b) => a.id.localeCompare(b.id))
  const expectedRaces = [...electionData.races].sort((a, b) => a.id.localeCompare(b.id))
  const sameRaces = actualRaces.length === expectedRaces.length &&
    actualRaces.every((race, index) => {
      const expected = expectedRaces[index]
      const actualCandidates = [...race.candidates].sort((a, b) => a.id.localeCompare(b.id))
      const expectedCandidates = [...expected.candidates].sort((a, b) => a.id.localeCompare(b.id))
      return race.id === expected.id &&
        race.position === expected.position &&
        race.scope === expected.scope &&
        race.scopeKey === expected.scopeKey &&
        actualCandidates.length === expectedCandidates.length &&
        actualCandidates.every((candidate, candidateIndex) => {
          const expectedCandidate = expectedCandidates[candidateIndex]
          return candidate.id === expectedCandidate.id &&
            candidate.name === expectedCandidate.name &&
            candidate.runningMateName === expectedCandidate.runningMateName &&
            candidate.manifesto === expectedCandidate.manifesto
        })
    })

  if (!sameElection || !sameRaces) {
    throw new Error(
      `Election "${electionData.id}" already exists but differs from this seed. ` +
      'No records were changed; review the database before seeding.',
    )
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed election data')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

try {
  const existing = await prisma.election.findUnique({
    where: { id: electionData.id },
    include: { races: { include: { candidates: true } } },
  })

  if (existing) {
    assertMatchesSeed(existing)
    console.log('Election seed already matches the database; no changes made.')
  } else {
    const raceIds = electionData.races.map(race => race.id)
    const candidateIds = electionData.races.flatMap(race => race.candidates.map(candidate => candidate.id))
    const [racesWithConflictingIds, candidatesWithConflictingIds] = await Promise.all([
      prisma.electionRace.findMany({ where: { id: { in: raceIds } }, select: { id: true } }),
      prisma.candidate.findMany({ where: { id: { in: candidateIds } }, select: { id: true } }),
    ])
    if (racesWithConflictingIds.length || candidatesWithConflictingIds.length) {
      throw new Error('A seed scope or candidate ID is already in use; no records were changed.')
    }

    const candidateCount = electionData.races.reduce((total, race) => total + race.candidates.length, 0)
    await prisma.$transaction(async tx => {
      await tx.election.create({
        data: {
          id: electionData.id,
          name: electionData.name,
          status: electionData.status,
          startTime: new Date(electionData.startTime),
          endTime: new Date(electionData.endTime),
          races: {
            create: electionData.races.map(race => ({
              id: race.id,
              position: race.position,
              scope: race.scope,
              scopeKey: race.scopeKey,
              candidates: { create: race.candidates },
            })),
          },
        },
      })
      await tx.auditLog.create({
        data: {
          electionId: electionData.id,
          action: 'ELECTION_DATA_IMPORTED',
          subjectType: 'Election',
          subjectId: electionData.id,
          details: {
            sourceStatus: 'UPCOMING',
            scopeCount: electionData.races.length,
            candidateCount,
          },
        },
      })
    })
    console.log(
      `Seeded election ${electionData.id}: ${electionData.races.length} scopes, ${candidateCount} candidates.`,
    )
  }
} finally {
  await prisma.$disconnect()
}
