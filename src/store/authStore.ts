import { create } from 'zustand'
import type { AuthResponse, AuthUser } from '../types'

const AUTH_STORAGE_KEY = 'btmd_auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (payload: AuthResponse) => void
  logout: () => void
}

function readStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

const storedAuth = readStoredAuth()

export const useAuthStore = create<AuthState>((set) => ({
  token: storedAuth?.token ?? null,
  user: storedAuth?.user ?? null,

  setAuth: (payload) => {
    // Backend sends { access_token, token_type, user }
    // We store as { token, user } for simplicity
    const stored: StoredAuth = {
      token: payload.access_token,
      user: {
        ...payload.user,
        // Derive an avatar URL from the user's name
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.user.name)}&background=0f766e&color=fff`,
      },
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored))
    set({ token: stored.token, user: stored.user })
  },

  logout: () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    set({ token: null, user: null })
  },
}))
