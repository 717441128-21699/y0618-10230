import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole, LoginRequest, LoginResponse } from '../../shared/types';

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (data: LoginRequest) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result: LoginResponse = await response.json();
        if (result.success && result.user && result.token) {
          set({ user: result.user, token: result.token });
        }
        return result;
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
