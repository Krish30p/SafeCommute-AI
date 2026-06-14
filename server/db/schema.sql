-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15),
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100),
  phone VARCHAR(15)
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  origin_lat FLOAT,
  origin_lng FLOAT,
  destination_lat FLOAT,
  destination_lng FLOAT,
  origin_name TEXT,
  destination_name TEXT,
  selected_route JSONB,
  safety_score INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  eta TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  share_token VARCHAR(64) UNIQUE
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat FLOAT,
  lng FLOAT,
  type VARCHAR(50),
  description TEXT,
  reported_at TIMESTAMP DEFAULT NOW(),
  weight FLOAT DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS safety_scores_cache (
  route_hash VARCHAR(64) PRIMARY KEY,
  score INTEGER,
  breakdown JSONB,
  cached_at TIMESTAMP DEFAULT NOW()
);
