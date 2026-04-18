import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function migrate() {
  const sql = postgres(process.env.DATABASE_URL!, {
    prepare: false,
  })

  console.log('Adding compound_type to insurance_details...')
  try {
    await sql`ALTER TABLE insurance_details ADD COLUMN IF NOT EXISTS compound_type varchar(10) NOT NULL DEFAULT 'simple'`
    console.log('Success!')
  } catch (err) {
    console.error('Failed to add column:', err)
  } finally {
    await sql.end()
  }
}

migrate()
