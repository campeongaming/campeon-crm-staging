'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useAuth } from '@/lib/auth-context';

const API_URL = API_ENDPOINTS.BASE_URL;

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!username || !password) {
                setError('Please enter both username and password');
                setLoading(false);
                return;
            }

            const response = await axios.post(`${API_URL}/auth/login`, {
                username,
                password,
            });

            console.log('Login response:', response.data);

            if (response.data && response.data.access_token) {
                // Update context state — AuthGuard will redirect to /create once isLoggedIn=true
                login(response.data.access_token, response.data.user);
            } else {
                console.log('No access token in response');
                setError('Invalid response from server');
            }
        } catch (err: any) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.status === 401) {
                setError('Invalid username or password');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 overflow-hidden">
            {/* Enhanced animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Purple blob - top left */}
                <div className="absolute w-96 h-96 bg-purple-500/25 rounded-full blur-3xl top-10 left-10 animate-blob-sm"></div>

                {/* Blue blob - bottom right */}
                <div className="absolute w-80 h-80 bg-blue-500/25 rounded-full blur-3xl bottom-10 right-10 animate-blob-md"></div>

                {/* Indigo blob - top right */}
                <div className="absolute w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -top-32 -right-32 animate-blob-lg"></div>

                {/* Additional vibrant blobs */}
                <div className="absolute w-64 h-64 bg-pink-500/15 rounded-full blur-3xl top-1/3 right-1/4 animate-blob-sm" style={{ animationDelay: '1s' }}></div>

                <div className="absolute w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl bottom-1/4 left-1/3 animate-blob-md" style={{ animationDelay: '2s' }}></div>

                <div className="absolute w-96 h-96 bg-purple-600/15 rounded-full blur-3xl -bottom-20 -left-20 animate-blob-lg" style={{ animationDelay: '1.5s' }}></div>
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-700/60 p-8">
                    {/* Logo Section with glow */}
                    <div className="flex flex-col items-center mb-8 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100"></div>
                            <Image
                                src="/Bonuslab_transparent.png"
                                alt="CAMPEON CRM"
                                width={250}
                                height={250}
                                className="object-contain relative transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/15 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm font-medium animate-pulse flex gap-2">
                                <span className="text-lg">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-slate-300 mb-3 transition-colors duration-200">
                                👤 Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/40 rounded-xl text-white placeholder-slate-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-slate-500 focus:bg-slate-800/80 transition-all duration-200 group-hover:border-slate-500/60"
                                    placeholder="Enter your username"
                                    disabled={loading}
                                    autoComplete="username"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200">
                                    <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-slate-300 mb-3 transition-colors duration-200">
                                🔐 Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/40 rounded-xl text-white placeholder-slate-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-slate-500 focus:bg-slate-800/80 transition-all duration-200 group-hover:border-slate-500/60 pr-12"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-pressed={showPassword}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 rounded-lg z-10 cursor-pointer pointer-events-auto"
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                            <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-.001-.001L3.707 2.293a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.181 0 4.322-.559 6.171-1.424z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-7 relative overflow-hidden group"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/10 to-purple-400/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                            {loading ? (
                                <span className="flex items-center justify-center gap-3 relative z-10">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Logging in...</span>
                                </span>
                            ) : (
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <span>🔓</span>
                                    <span>Log In</span>
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-4 h-px bg-slate-700/30"></div>

                    {/* Info Message - Minimal */}
                    <p className="text-slate-500 text-xs text-center">
                        For credentials, contact the administrator
                    </p>
                </div>

                {/* Enhanced Decorative Elements */}
                <div className="absolute -top-8 -left-8 w-40 h-40 bg-purple-600/30 rounded-full blur-3xl opacity-70 animate-blob-bounce"></div>
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-600/30 rounded-full blur-3xl opacity-70 animate-blob-bounce" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 -left-20 w-36 h-36 bg-indigo-600/25 rounded-full blur-3xl opacity-60 animate-blob-bounce" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/3 -right-24 w-44 h-44 bg-pink-600/20 rounded-full blur-3xl opacity-60 animate-blob-bounce" style={{ animationDelay: '3s' }}></div>
            </div>

            {/* Inline animations */}
            <style jsx>{`
                @keyframes blob-sm {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(40px, -60px) scale(1.15);
                    }
                    50% {
                        transform: translate(-30px, 40px) scale(0.95);
                    }
                    75% {
                        transform: translate(50px, 30px) scale(1.1);
                    }
                }
                
                @keyframes blob-md {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(-50px, 40px) scale(1.1);
                    }
                    50% {
                        transform: translate(30px, -50px) scale(1.05);
                    }
                    75% {
                        transform: translate(-40px, -30px) scale(0.9);
                    }
                }
                
                @keyframes blob-lg {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(60px, 20px) scale(1.05);
                    }
                    50% {
                        transform: translate(-40px, 60px) scale(1.15);
                    }
                    75% {
                        transform: translate(30px, -40px) scale(0.95);
                    }
                }
                
                @keyframes blob-bounce {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    20% {
                        transform: translate(30px, 40px) scale(1.2);
                    }
                    40% {
                        transform: translate(-50px, -30px) scale(0.9);
                    }
                    60% {
                        transform: translate(40px, -50px) scale(1.15);
                    }
                    80% {
                        transform: translate(-30px, 50px) scale(1.05);
                    }
                }
                
                .animate-blob-sm {
                    animation: blob-sm 6s ease-in-out infinite;
                }
                
                .animate-blob-md {
                    animation: blob-md 7s ease-in-out infinite;
                }
                
                .animate-blob-lg {
                    animation: blob-lg 8s ease-in-out infinite;
                }
                
                .animate-blob-bounce {
                    animation: blob-bounce 5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
