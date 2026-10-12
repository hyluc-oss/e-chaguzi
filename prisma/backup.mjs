import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required to back up the database')

  const url = new URL(connectionString)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol')
  }
  if (!url.pathname || url.pathname === '/') {
    throw new Error('DATABASE_URL must include a database name')
  }

  const sslmode = url.searchParams.get('sslmode')
  const sslrootcert = url.searchParams.get('sslrootcert')
  const sslcert = url.searchParams.get('sslcert')
  const sslkey = url.searchParams.get('sslkey')
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    ...(sslmode && { PGSSLMODE: sslmode }),
    ...(sslrootcert && { PGSSLROOTCERT: sslrootcert }),
    ...(sslcert && { PGSSLCERT: sslcert }),
    ...(sslkey && { PGSSLKEY: sslkey }),
  }
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const defaultPath = join(process.cwd(), 'backups', `echaguzi-${timestamp}.dump`)
const requestedPath = process.argv[2] ?? defaultPath
const outputPath = isAbsolute(requestedPath) ? requestedPath : resolve(requestedPath)
const outputDirectory = dirname(outputPath)
const databaseConnection = getDatabaseConnection()

mkdirSync(outputDirectory, { recursive: true })

let fileDescriptor
try {
  fileDescriptor = openSync(outputPath, 'wx', 0o600)
  closeSync(fileDescriptor)
  fileDescriptor = undefined
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
    throw new Error(`Backup file already exists; refusing to overwrite: ${outputPath}`)
  }
  throw error
}

try {
  const result = spawnSync(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-acl', '--file', outputPath],
    {
      encoding: 'utf8',
      env: { ...process.env, ...databaseConnection, DATABASE_URL: '' },
      maxBuffer: 1024 * 1024,
    },
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `pg_dump exited with status ${result.status}`)
  }

  const bytes = statSync(outputPath).size
  if (bytes === 0) throw new Error('pg_dump produced an empty backup file')
  console.log(`Database backup created: ${outputPath} (${bytes} bytes)`)
} catch (error) {
  unlinkSync(outputPath)
  throw error
}
