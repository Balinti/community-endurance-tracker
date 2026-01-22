# Community Endurance Tracker

A fair-play, season-based endurance league layer that lets anyone try a weekly 20-minute effort challenge instantly (no signup), then optionally sign in with Google to save progress and unlock verified scoring + Pro.

## Features

- **Anonymous Try-it-Now Mode**: Start tracking immediately with no signup required
- **20-Minute Effort Challenges**: Log your weekly effort times and compete
- **Fair Scoring System**: Points based on improvement from your baseline, not absolute speed
- **League Competition**: Create or join leagues to compete with friends
- **Verification System**: Simulated verification with credits for free users, unlimited for Pro
- **Cloud Sync**: Sign in with Google to sync your progress across devices

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase (database and auth)
- Stripe (Pro subscriptions)
- Vercel (hosting)

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Landing page
│   ├── app/page.tsx         # Core demo experience
│   ├── leagues/page.tsx     # Browse/create leagues
│   ├── league/[code]/page.tsx  # League details
│   ├── account/page.tsx     # User account & billing
│   ├── commissioner/[leagueId]/page.tsx  # Review queue
│   └── api/
│       ├── stripe/          # Checkout, portal, webhook
│       ├── sync/            # Local data migration
│       ├── leagues/         # Create, join, list, get
│       ├── efforts/         # Submit, verify, review
│       ├── account/         # Status
│       └── commissioner/    # Data
├── components/
│   ├── GoogleAuth.tsx       # Google OAuth with shared Supabase
│   ├── Header.tsx           # Navigation header
│   ├── TryNowButton.tsx     # CTA button
│   ├── EffortForm.tsx       # Effort logging form
│   ├── StandingsTable.tsx   # League standings display
│   └── SoftSavePrompt.tsx   # Sign-in prompt
├── lib/
│   ├── localStore.ts        # localStorage management
│   ├── scoring.ts           # Scoring algorithm
│   ├── utils.ts             # Helper utilities
│   ├── stripe.ts            # Stripe configuration
│   └── supabaseApp/
│       ├── client.ts        # Client-side Supabase
│       └── server.ts        # Server-side Supabase
└── supabase/
    └── migrations/
        ├── schema.sql       # Database schema
        └── rls.sql          # Row-level security policies
```

## Database Schema

### Tables

- **profiles**: User display names
- **leagues**: League configuration (code, name, sport, etc.)
- **seasons**: 12-week seasons per league
- **rounds**: Weekly rounds within seasons
- **memberships**: User-league relationships
- **efforts**: Logged workout efforts
- **submissions**: Round submissions with status
- **verification_results**: Verification check results
- **entitlements**: User plan and credit limits
- **verification_credits_ledger**: Credit usage tracking
- **subscriptions**: Stripe subscription records

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/leagues/list` | GET | List public leagues |
| `/api/leagues/create` | POST | Create a new league |
| `/api/leagues/join` | POST | Join a league by code |
| `/api/leagues/get` | GET | Get league details |
| `/api/efforts/submit` | POST | Submit an effort |
| `/api/efforts/verify` | POST | Request verification |
| `/api/efforts/review` | POST | Commissioner review |
| `/api/sync/migrate-local` | POST | Migrate local data |
| `/api/account/status` | GET | Get account status |
| `/api/commissioner/data` | GET | Get flagged submissions |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Create portal session |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks |

## UI Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with value prop and CTAs |
| `/app` | Core demo experience with local storage |
| `/leagues` | Browse public leagues, create/join |
| `/league/[code]` | League standings and effort submission |
| `/account` | Plan status and billing management |
| `/commissioner/[leagueId]` | Review flagged submissions |

## Environment Variables

### Required (from shared config)

- `NEXT_PUBLIC_SUPABASE_URL` - App database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - App database anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side database access
- `STRIPE_SECRET_KEY` - Stripe API key (server-side)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

### Project-Specific

- `NEXT_PUBLIC_APP_URL` = `https://community-endurance-tracker.vercel.app`

### Optional (Pro features)

- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY` - Monthly Pro price ID
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL` - Annual Pro price ID

If Stripe price IDs are not configured, upgrade buttons are hidden.

## Anonymous Mode

1. User visits `/app` without signing in
2. Data stored in localStorage under `community_endurance_tracker` key
3. Demo league created with bot competitors
4. User can log efforts and view standings
5. After meaningful engagement, soft prompt appears
6. On sign-in, user can migrate local data to cloud

## Scoring System

```
Score = clamp((baseline - current) / baseline, -0.05, 0.10) x 1000
```

- Improve by 10% = +100 points (maximum)
- Improve by 5% = +50 points
- Match baseline = 0 points
- Slower by 5% = -50 points (minimum)

Baseline is set from first effort in the league/season.

## Verification System

- Free users: 4 verification credits per month
- Pro users: Unlimited verifications
- Verification checks time plausibility and HR data
- Status: verified (counts toward standings), unverified (score=0), flagged (needs review)

## Development

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run build
npx vercel --prod
```

## Database Setup

Run migrations against your Supabase database:

```bash
# Using psql with DATABASE_URL
psql $DATABASE_URL -f supabase/migrations/schema.sql
psql $DATABASE_URL -f supabase/migrations/rls.sql
```
