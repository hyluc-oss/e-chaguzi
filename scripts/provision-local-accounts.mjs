import 'dotenv/config'
import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required to provision local accounts')

function readStudents() {
  let students
  try {
    students = JSON.parse(process.env.LOCAL_STUDENT_ACCOUNTS ?? '')
  } catch {
    throw new Error('LOCAL_STUDENT_ACCOUNTS must be a JSON array')
  }
  if (!Array.isArray(students) || students.length === 0 || students.length > 100) {
    throw new Error('LOCAL_STUDENT_ACCOUNTS must contain between 1 and 100 accounts')
  }

  const ids = new Set()
  const emails = new Set()
  for (const student of students) {
    if (
      !student ||
      typeof student.studentId !== 'string' ||
      typeof student.password !== 'string' ||
      !student.studentId.trim() ||
      student.studentId.trim().length > 100 ||
      !student.password ||
      student.password.length > 256 ||
      (student.gmail && (typeof student.gmail !== 'string' || !/^[^\s@]+@gmail\.com$/i.test(student.gmail.trim())))
    ) {
      throw new Error('Each local student requires a Student ID, password, and optional Gmail address')
    }
    const id = student.studentId.trim()
    const gmail = student.gmail?.trim().toLowerCase() || null
    if (ids.has(id) || (gmail && emails.has(gmail))) {
      throw new Error('Local Student IDs and Gmail addresses must be unique')
    }
    ids.add(id)
    if (gmail) emails.add(gmail)
  }
  return students
}

function passwordHash(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const displayNames = new Map([
  ['CYB/2024/001', 'Amani John Mushi'],
  ['CS/2024/002', 'Neema Peter Charles'],
  ['CE/2024/003', 'Baraka Joseph Mwakalinga'],
  ['IT/2024/004', 'Rehema Daniel Msuya'],
  ['IS/2024/005', 'Kelvin Emmanuel Mollel'],
])

const students = readStudents()
const adminId = process.env.LOCAL_ADMIN_ID?.trim()
const adminPassword = process.env.LOCAL_ADMIN_PASSWORD
if (!adminId || adminId.length > 100 || !adminPassword || adminPassword.length > 256) {
  throw new Error('LOCAL_ADMIN_ID and LOCAL_ADMIN_PASSWORD are required')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
try {
  await prisma.$transaction(async transaction => {
    for (const student of students) {
      const studentId = student.studentId.trim()
      const subject = `local:student:${studentId}`
      const gmail = student.gmail?.trim().toLowerCase() || null
      await transaction.user.upsert({
        where: { institutionSubject: subject },
        create: {
          institutionSubject: subject,
          role: 'VOTER',
          displayName: displayNames.get(studentId) ?? null,
          email: gmail,
          passwordHash: passwordHash(student.password),
          facultyKey: 'FACULTY_COICT',
          residenceKey: 'HALL_1_BLOCK_B',
          classKey: 'CS_YEAR_2',
        },
        update: {
          role: 'VOTER',
          displayName: displayNames.get(studentId) ?? null,
          email: gmail,
          facultyKey: 'FACULTY_COICT',
          residenceKey: 'HALL_1_BLOCK_B',
          classKey: 'CS_YEAR_2',
          passwordHash: undefined,
        },
      })
    }

    const adminSubject = `local:admin:${adminId}`
    await transaction.user.upsert({
      where: { institutionSubject: adminSubject },
      create: {
        institutionSubject: adminSubject,
        role: 'ADMIN',
        displayName: 'Mussa Mhando',
        passwordHash: passwordHash(adminPassword),
      },
      update: {
        role: 'ADMIN',
        displayName: 'Mussa Mhando',
        passwordHash: undefined,
      },
    })
  })
} finally {
  await prisma.$disconnect()
}

console.log(`Provisioned ${students.length} local student account(s) and one administrator account.`)
