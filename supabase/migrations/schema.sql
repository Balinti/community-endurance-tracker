-- Community Endurance Tracker Schema
-- Run this against your Supabase database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT DEFAULT 'running',
  timezone TEXT DEFAULT 'UTC',
  is_public BOOLEAN DEFAULT true,
  commissioner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leagues_code ON leagues(code);
CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_league ON seasons(league_id);

-- Rounds table (weekly)
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  week_index INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rounds_season ON rounds(season_id);
CREATE INDEX IF NOT EXISTS idx_rounds_dates ON rounds(starts_at, ends_at);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('member', 'commissioner')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- Efforts table
CREATE TABLE IF NOT EXISTS efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_hr INTEGER,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efforts_user ON efforts(user_id);
CREATE INDEX IF NOT EXISTS idx_efforts_occurred ON efforts(occurred_at);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  effort_id UUID REFERENCES efforts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT CHECK (status IN ('pending', 'verified', 'unverified', 'flagged', 'rejected')) DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Verification results table
CREATE TABLE IF NOT EXISTS verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  confidence INTEGER NOT NULL,
  reasons JSONB DEFAULT '[]',
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entitlements table
CREATE TABLE IF NOT EXISTS entitlements (
  user_id UUID PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  verification_credits_monthly INTEGER DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification credits ledger
CREATE TABLE IF NOT EXISTS verification_credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON verification_credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON verification_credits_ledger(created_at);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
