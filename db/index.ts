import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Limit pool size for serverless: each function instance gets at most 1 connection.
// Use a connection string with pgbouncer=true if Supabase Transaction Mode is enabled.
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle({ client })
