'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './api-config';

const API_URL = API_ENDPOINTS.BASE_URL;

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

    // Check authentication on mount and when pathname changes
    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');

            const clearSession = () => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                delete axios.defaults.headers.common['Authorization'];
                setToken(null);
                setUser(null);
            };

            if (storedToken && storedUser) {
                // 1. Check JWT expiry client-side before any network call
                if (isTokenExpired(storedToken)) {
                    console.log('Token expired — clearing session');
                    clearSession();
                    setIsLoading(false);
                    return;
                }

                try {
                    // 2. Verify with the server (catches deactivated accounts too)
                    const { data } = await axios.get(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${storedToken}` },
                    });
                    setToken(storedToken);
                    setUser(data);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    console.log('Auth verified with server');
                } catch (err) {
                    console.log('Server rejected token — clearing session');
                    clearSession();
                }
            } else {
                setToken(null);
                setUser(null);
            }

            setIsLoading(false);
        };

        checkAuth();

        // Also listen for storage changes (in case another tab updates it)
        window.addEventListener('storage', () => checkAuth());
        return () => window.removeEventListener('storage', () => checkAuth());
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
