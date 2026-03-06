import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Auth.css';

const INITIAL_PATIENT = { email: '', password: '', firstName: '', lastName: '', phone: '', dateOfBirth: '', gender: '', address: { street: '', city: '', state: '', zipCode: '', country: 'India' } };
const INITIAL_DOCTOR = { email: '', password: '', firstName: '', lastName: '', phone: '', specialization: '', qualification: '', experience: '', licenseNumber: '', consultationFee: '', bio: '', diseasesExpertise: '' };

const Register = () => {
    const [role, setRole] = useState('patient');
    const [form, setForm] = useState(INITIAL_PATIENT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const switchRole = (r) => { setRole(r); setForm(r === 'patient' ? INITIAL_PATIENT : INITIAL_DOCTOR); setError(''); };

    const onChange = e => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const key = name.split('.')[1];
            setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const onSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            const payload = { ...form };
            if (role === 'doctor') {
                payload.diseasesExpertise = form.diseasesExpertise.split(',').map(s => s.trim()).filter(Boolean);
                payload.experience = Number(payload.experience) || 0;
                payload.consultationFee = Number(payload.consultationFee) || 500;
            }
            if (role === 'patient') { await authAPI.registerPatient(payload); }
            else { await authAPI.registerDoctor(payload); }
            setSuccess('Account created successfully! Redirecting...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page" style={{ paddingTop: '24px', paddingBottom: '24px' }}>
            <div className="auth-card" style={{ maxWidth: '600px' }}>
                <div className="auth-logo">
                    <div className="auth-logo-icon">✨</div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join MediBook today</p>
                </div>

                <div className="role-tabs">
                    <button className={`role-tab${role === 'patient' ? ' active' : ''}`} onClick={() => switchRole('patient')}>👤 Patient</button>
                    <button className={`role-tab${role === 'doctor' ? ' active' : ''}`} onClick={() => switchRole('doctor')}>🩺 Doctor</button>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}
                {success && <div className="alert alert-success">✅ {success}</div>}

                <form onSubmit={onSubmit}>
                    <p className="form-section-title">Account Details</p>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input className="form-input" name="firstName" placeholder="John" value={form.firstName} onChange={onChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input className="form-input" name="lastName" placeholder="Doe" value={form.lastName} onChange={onChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={onChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone *</label>
                            <input className="form-input" name="phone" placeholder="9876543210" value={form.phone} onChange={onChange} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input className="form-input" type="password" name="password" placeholder="Min 6 characters" value={form.password} onChange={onChange} required minLength={6} />
                    </div>

                    {role === 'patient' && (
                        <>
                            <p className="form-section-title">Personal Information</p>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input className="form-input" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select className="form-input form-select" name="gender" value={form.gender} onChange={onChange}>
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <p className="form-section-title">Address</p>
                            <div className="form-group">
                                <label className="form-label">Street</label>
                                <input className="form-input" name="address.street" placeholder="123 Main Street" value={form.address?.street || ''} onChange={onChange} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-input" name="address.city" placeholder="Chennai" value={form.address?.city || ''} onChange={onChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    <input className="form-input" name="address.state" placeholder="Tamil Nadu" value={form.address?.state || ''} onChange={onChange} />
                                </div>
                            </div>
                        </>
                    )}

                    {role === 'doctor' && (
                        <>
                            <p className="form-section-title">Professional Details</p>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Specialization *</label>
                                    <input className="form-input" name="specialization" placeholder="Cardiology" value={form.specialization} onChange={onChange} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Qualification *</label>
                                    <input className="form-input" name="qualification" placeholder="MBBS, MD" value={form.qualification} onChange={onChange} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Experience (years)</label>
                                    <input className="form-input" type="number" name="experience" placeholder="5" value={form.experience} onChange={onChange} min="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">License Number *</label>
                                    <input className="form-input" name="licenseNumber" placeholder="MCI12345" value={form.licenseNumber} onChange={onChange} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Consultation Fee (₹)</label>
                                    <input className="form-input" type="number" name="consultationFee" placeholder="500" value={form.consultationFee} onChange={onChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Diseases Expertise (comma-separated)</label>
                                <input className="form-input" name="diseasesExpertise" placeholder="Heart Disease, Hypertension, Arrhythmia" value={form.diseasesExpertise} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bio</label>
                                <textarea className="form-input form-textarea" name="bio" placeholder="Brief description of your experience..." value={form.bio} onChange={onChange} rows={3} />
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
                    </button>
                </form>
                <div className="auth-link">Already have an account? <Link to="/login">Sign In</Link></div>
            </div>
        </div>
    );
};

export default Register;
