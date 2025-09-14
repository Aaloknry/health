import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// User types
export interface User {
  id: string
  email: string
  password: string
  full_name: string
  user_type: 'user' | 'clinician' | 'admin'
  organization?: string
  created_at: string
  updated_at: string
  last_login?: string
  is_active: boolean
}

export interface UserSession {
  user: Omit<User, 'password'>
  isAuthenticated: boolean
}

// Authentication functions
export async function signUp(userData: {
  email: string
  password: string
  full_name: string
  user_type: 'user' | 'clinician' | 'admin'
  organization?: string
}): Promise<{ user: User | null; error: string | null }> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      return { user: null, error: 'User with this email already exists' }
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email,
        password: userData.password, // In production, hash this password
        full_name: userData.full_name,
        user_type: userData.user_type,
        organization: userData.organization,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      return { user: null, error: error.message }
    }

    return { user: data, error: null }
  } catch (error) {
    return { user: null, error: 'Failed to create user' }
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password) // In production, compare hashed passwords
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return { user: null, error: 'Invalid email or password' }
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)

    return { user: data, error: null }
  } catch (error) {
    return { user: null, error: 'Login failed' }
  }
}

export async function getCurrentUser(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    return null
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { user: null, error: error.message }
    }

    return { user: data, error: null }
  } catch (error) {
    return { user: null, error: 'Failed to update user' }
  }
}