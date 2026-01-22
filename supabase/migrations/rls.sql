-- Row Level Security Policies for Community Endurance Tracker
-- Run this after schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE efforts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Leagues policies
CREATE POLICY "Anyone can view public leagues"
  ON leagues FOR SELECT
  USING (is_public = true);

CREATE POLICY "Members can view their leagues"
  ON leagues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.league_id = leagues.id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND commissioner_id = auth.uid());

CREATE POLICY "Commissioners can update their leagues"
  ON leagues FOR UPDATE
  USING (commissioner_id = auth.uid());

-- Seasons policies
CREATE POLICY "Anyone can view seasons of public leagues"
  ON seasons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = seasons.league_id
      AND leagues.is_public = true
    )
  );

CREATE POLICY "Members can view seasons of their leagues"
  ON seasons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.league_id = seasons.league_id
      AND memberships.user_id = auth.uid()
    )
  );

-- Rounds policies
CREATE POLICY "Anyone can view rounds of public leagues"
  ON rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seasons
      JOIN leagues ON leagues.id = seasons.league_id
      WHERE seasons.id = rounds.season_id
      AND leagues.is_public = true
    )
  );

CREATE POLICY "Members can view rounds of their leagues"
  ON rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seasons
      JOIN memberships ON memberships.league_id = seasons.league_id
      WHERE seasons.id = rounds.season_id
      AND memberships.user_id = auth.uid()
    )
  );

-- Memberships policies
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships of their leagues"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.league_id = memberships.league_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can join leagues"
  ON memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave leagues"
  ON memberships FOR DELETE
  USING (user_id = auth.uid() AND role != 'commissioner');

-- Efforts policies
CREATE POLICY "Users can view own efforts"
  ON efforts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own efforts"
  ON efforts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own efforts"
  ON efforts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own efforts"
  ON efforts FOR DELETE
  USING (user_id = auth.uid());

-- Submissions policies
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can view verified submissions in their leagues"
  ON submissions FOR SELECT
  USING (
    status = 'verified'
    AND EXISTS (
      SELECT 1 FROM rounds
      JOIN seasons ON seasons.id = rounds.season_id
      JOIN memberships ON memberships.league_id = seasons.league_id
      WHERE rounds.id = submissions.round_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Commissioners can view all submissions in their leagues"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN seasons ON seasons.id = rounds.season_id
      JOIN leagues ON leagues.id = seasons.league_id
      WHERE rounds.id = submissions.round_id
      AND leagues.commissioner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Commissioners can update submissions in their leagues"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN seasons ON seasons.id = rounds.season_id
      JOIN leagues ON leagues.id = seasons.league_id
      WHERE rounds.id = submissions.round_id
      AND leagues.commissioner_id = auth.uid()
    )
  );

-- Verification results policies
CREATE POLICY "Users can view verification results for own submissions"
  ON verification_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = verification_results.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Commissioners can view verification results in their leagues"
  ON verification_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      JOIN rounds ON rounds.id = submissions.round_id
      JOIN seasons ON seasons.id = rounds.season_id
      JOIN leagues ON leagues.id = seasons.league_id
      WHERE submissions.id = verification_results.submission_id
      AND leagues.commissioner_id = auth.uid()
    )
  );

-- Entitlements policies
CREATE POLICY "Users can view own entitlements"
  ON entitlements FOR SELECT
  USING (user_id = auth.uid());

-- Ledger policies
CREATE POLICY "Users can view own ledger"
  ON verification_credits_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());
