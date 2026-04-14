# jackpot-pb
개인 자산 관리를 위한 애플리케이션



## env 설정


```
.env.local.example 을 복사하여 .env.local 파일을 생성하고, 다음을 입력한다.

# Supabase (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-only — NEVER use NEXT_PUBLIC_ prefix for these)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Direct PostgreSQL connection for Drizzle ORM
# Use the "URI" tab in Supabase → Project Settings → Database → Connection String
# NOT the pooler URL — pooler breaks drizzle-kit migrations
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# Cron job secret — shared between Vercel Cron and the /api/cron/snapshot route handler
# Add to Vercel Dashboard → Project → Settings → Environment Variables
# Generate with: openssl rand -hex 32
CRON_SECRET=your-random-secret-here

```


## 실행

``
npm install
npm run dev
```
