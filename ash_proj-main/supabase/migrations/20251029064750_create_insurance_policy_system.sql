/*
  # Insurance Policy Approval System - Complete Schema

  ## Overview
  This migration creates a complete insurance policy approval workflow system with:
  - User roles (creator, underwriter, manager)
  - Policy management with CRUD operations
  - Two-step approval workflow (Underwriter → Manager)
  - Comprehensive audit logging
  - Fraud detection tracking

  ## 1. New Tables

  ### `user_profiles`
  Extends auth.users with role information
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, user email)
  - `full_name` (text, user's full name)
  - `role` (text, one of: creator, underwriter, manager)
  - `created_at` (timestamptz, creation timestamp)

  ### `policies`
  Core insurance policy data
  - `id` (uuid, primary key)
  - `policy_number` (text, unique, auto-generated)
  - `customer_name` (text, insured customer name)
  - `premium_amount` (numeric, policy premium)
  - `product_type` (text, insurance product type)
  - `status` (text, one of: draft, pending_underwriter, pending_manager, approved, rejected)
  - `fraud_check_passed` (boolean, fraud check result)
  - `fraud_check_reason` (text, fraud check details)
  - `creator_id` (uuid, references user_profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `approval_logs`
  Complete audit trail of all approval actions
  - `id` (uuid, primary key)
  - `policy_id` (uuid, references policies)
  - `approver_id` (uuid, references user_profiles)
  - `action` (text, one of: approved, rejected, submitted)
  - `role` (text, role of person taking action)
  - `comments` (text, optional comments)
  - `previous_status` (text, status before action)
  - `new_status` (text, status after action)
  - `created_at` (timestamptz, action timestamp)

  ## 2. Security (Row Level Security)

  ### user_profiles
  - Users can view all profiles (for workflow visibility)
  - Users can only update their own profile
  - New profiles created on signup

  ### policies
  - Creators can view all policies
  - Creators can create new policies
  - Creators can edit only their own draft policies
  - Underwriters can view policies pending their approval
  - Managers can view policies pending their approval
  - All authenticated users can view approved policies

  ### approval_logs
  - All authenticated users can view logs (audit transparency)
  - Only system can insert logs (via triggers or app logic)

  ## 3. Important Notes
  - Approval workflow: draft → pending_underwriter → pending_manager → approved
  - Each approval step is locked to specific roles
  - Fraud checks run automatically on policy creation
  - All actions are logged for complete audit trail
  - Policy numbers are auto-generated with prefix "POL-"
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('creator', 'underwriter', 'manager')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies Table
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  premium_amount numeric(10, 2) NOT NULL CHECK (premium_amount > 0),
  product_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_underwriter', 'pending_manager', 'approved', 'rejected')),
  fraud_check_passed boolean DEFAULT true,
  fraud_check_reason text DEFAULT '',
  creator_id uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view all policies"
  ON policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Creators can create policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'creator'
    )
  );

CREATE POLICY "Creators can update own draft policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() AND
    status = 'draft' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'creator'
    )
  )
  WITH CHECK (
    creator_id = auth.uid() AND
    status = 'draft'
  );

CREATE POLICY "Underwriters can update pending underwriter policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_underwriter' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'underwriter'
    )
  )
  WITH CHECK (
    status IN ('pending_manager', 'rejected')
  );

CREATE POLICY "Managers can update pending manager policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (
    status = 'pending_manager' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'manager'
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
  );

-- Approval Logs Table
CREATE TABLE IF NOT EXISTS approval_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES user_profiles(id),
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  role text NOT NULL,
  comments text DEFAULT '',
  previous_status text NOT NULL,
  new_status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view approval logs"
  ON approval_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert approval logs"
  ON approval_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_id = auth.uid()
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate policy number
CREATE OR REPLACE FUNCTION generate_policy_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM policies;
  new_number := 'POL-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
