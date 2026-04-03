'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './api-config';

/** Decode the JWT payload and check the `exp` claim without a crypto library. */
function isTokenExpired(token: string): boolean {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (typeof payload.exp !== 'number') return true;
        // exp is in seconds; add a 10-second clock-skew buffer
        return Date.now() / 1000 > payload.exp - 10;
    } catch {
        return true;
    }
}

interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    isAdmin: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');

            if (storedToken && storedUser) {
                if (isTokenExpired(storedToken)) {
                    // Token expired — clear session
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_user');
                    delete axios.defaults.headers.common['Authorization'];
                    setToken(null);
                    setUser(null);
                } else {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setToken(storedToken);
                        setUser(parsedUser);
                        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    } catch {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('auth_user');
                        setToken(null);
                        setUser(null);
                    }
                }
            } else {
                setToken(null);
                setUser(null);
            }

            setIsLoading(false);
        };

        checkAuth();

        // Listen for storage changes from other tabs
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        delete axios.defaults.headers.common['Authorization'];
    };

    // Global 401 interceptor — if any API call is rejected, clear session
    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error?.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isLoggedIn: !!token && !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
