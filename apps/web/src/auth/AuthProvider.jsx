import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../lib/api.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    apiRequest('/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (active && error.status !== 401) console.error(error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiRequest('/auth/login', {
      body: credentials,
      method: 'POST',
    });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (registration) => {
    const data = await apiRequest('/auth/register', {
      body: registration,
      method: 'POST',
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const data = await apiRequest('/me', { body: updates, method: 'PATCH' });
    setUser(data.user);
    return data.user;
  }, []);

  const deleteAccount = useCallback(async (input) => {
    await apiRequest('/me', { body: input, method: 'DELETE' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      deleteAccount,
      isLoading,
      login,
      logout,
      register,
      updateProfile,
      user,
    }),
    [deleteAccount, isLoading, login, logout, register, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
