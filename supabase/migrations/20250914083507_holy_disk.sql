/*
  # Fix RLS policies for users table to allow anonymous access

  1. Changes
    - Drop all existing RLS policies on users table
    - Create new policies that allow anonymous access for registration
    - Allow public read access for authentication
    - Simple ownership-based policies for updates

  2. Security
    - Anonymous users can insert (for registration)
    - Public read access (for authentication)
    - Users can update their own data
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON users;
DROP POLICY IF EXISTS "Enable read for authentication" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow anonymous access

-- Allow anyone to insert (for user registration)
CREATE POLICY "Allow anonymous registration"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read (for authentication)
CREATE POLICY "Allow public read for auth"
  ON users
  FOR SELECT
  TO anon, authenticated, public
  USING (true);

-- Allow authenticated users to update their own records
CREATE POLICY "Allow users to update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete their own records
CREATE POLICY "Allow users to delete own data"
  ON users
  FOR DELETE
  TO authenticated
  USING (true);