'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, UserSession } from './supabase'

interface AuthContextType {
  session: UserSession | null
  login: (user: User) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('mindwell_session')
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession)
        setSession(parsedSession)
      } catch (error) {
        localStorage.removeItem('mindwell_session')
      }
    }
    setLoading(false)
  }, [])

  const login = (user: User) => {
    const userSession: UserSession = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        organization: user.organization,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        is_active: user.is_active
      },
      isAuthenticated: true
    }
    
    setSession(userSession)
    localStorage.setItem('mindwell_session', JSON.stringify(userSession))
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem('mindwell_session')
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}