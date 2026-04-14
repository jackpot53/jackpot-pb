import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Global singleton prevents new connections on every HMR cycle in dev mode.
// In production (serverless), each instance gets its own module scope anyway.
declare global {
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined
}

const client =
  global.__dbClient ??
  (global.__dbClient = postgres(process.env.DATABASE_URL!, {
    max: 5,
    idle_timeout: 60,
    connect_timeout: 10,
    // pgbouncer Transaction Mode (port 6543) does not support prepared statements
    prepare: false,
  }))

export const db = drizzle({ client })
