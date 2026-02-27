import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { Session, User } from '@supabase/supabase-js'
import { useUnreadMessagesStore } from './useUnreadMessagesStore'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string, recaptchaToken: string, displayName: string) => Promise<{ success: boolean }>
  resetPassword: (email: string, recaptchaToken: string) => Promise<{ success: boolean }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null })
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ initialized: true })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      set({ session: data.session, user: data.user })
    } catch (error) {
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email: string, password: string, username: string, recaptchaToken: string, displayName: string) => {
    try {
      set({ loading: true })
      
      // Call the edge function for user registration
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/register-new-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.toLowerCase(),
          displayName: displayName.trim(),
          recaptchaToken,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Registration successful - user will need to verify email
        return { success: true };
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false })
    }
  },

  resetPassword: async (email: string, recaptchaToken: string) => {
    try {
      set({ loading: true })
      
      // Call the edge function for password reset
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          recaptchaToken,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Password reset email sent successfully
        return { success: true };
      } else {
        throw new Error(result.message || 'Password reset failed');
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear unread counts when user logs out
      useUnreadMessagesStore.getState().clearAllUnreadCounts()
      
      set({ session: null, user: null })
    } catch (error) {
      throw error
    } finally {
      set({ loading: false })
    }
  },
})) 