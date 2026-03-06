import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const onChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const onSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const data = await login(form);
            navigate(data.user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🏥</div>
                    <h1 className="auth-title">MediBook</h1>
                    <p className="auth-subtitle">Your health, seamlessly managed</p>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={onChange} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-wrapper">
                            <input className="form-input" type={showPw ? 'text' : 'password'} name="password" placeholder="Enter your password" value={form.password} onChange={onChange} required style={{ paddingRight: '44px' }} />
                            <button type="button" className="password-toggle" onClick={() => setShowPw(p => !p)}>{showPw ? '🙈' : '👁️'}</button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span> Signing In...</> : '🔐 Sign In'}
                    </button>
                </form>

                <div className="auth-link" style={{ marginTop: '20px' }}>
                    Don't have an account? <Link to="/register">Create Account</Link>
                </div>

                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Credentials</p>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.8' }}>
                        <div>👤 Patient: <span style={{ color: '#a78bfa' }}>john.doe@email.com</span></div>
                        <div>🩺 Doctor: <span style={{ color: '#67e8f9' }}>sarah.kumar@hospital.com</span></div>
                        <div>🔑 Password: <span style={{ color: '#6ee7b7' }}>password123</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
