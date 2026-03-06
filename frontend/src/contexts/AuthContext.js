import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('medibook_token');
        if (!token) { setLoading(false); return; }
        try {
            const res = await authAPI.getMe();
            setUser(res.data.data.user);
            setProfile(res.data.data.profile);
        } catch {
            localStorage.removeItem('medibook_token');
            localStorage.removeItem('medibook_user');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    const login = async (credentials) => {
        const res = await authAPI.login(credentials);
        const { user: u, profile: p, token } = res.data.data;
        localStorage.setItem('medibook_token', token);
        localStorage.setItem('medibook_user', JSON.stringify(u));
        setUser(u);
        setProfile(p);
        return res.data.data;
    };

    const logout = () => {
        localStorage.removeItem('medibook_token');
        localStorage.removeItem('medibook_user');
        setUser(null);
        setProfile(null);
    };

    const updateProfile = (newProfile) => setProfile(prev => ({ ...prev, ...newProfile }));

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile, refreshUser: loadUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
