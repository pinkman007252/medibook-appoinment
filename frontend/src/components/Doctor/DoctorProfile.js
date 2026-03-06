import React, { useState, useEffect } from 'react';
import { doctorsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Doctor.css';

const DoctorProfile = () => {
    const { profile: authProfile, updateProfile } = useAuth();
    const [form, setForm] = useState({ bio: '', consultationFee: '', diseasesExpertise: [], isAvailable: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [newExpertise, setNewExpertise] = useState('');

    useEffect(() => {
        if (authProfile) {
            setForm({ bio: authProfile.bio || '', consultationFee: authProfile.consultationFee || 500, diseasesExpertise: authProfile.diseasesExpertise || [], isAvailable: authProfile.isAvailable !== false });
            setLoading(false);
        }
    }, [authProfile]);

    const addExpertise = () => {
        if (newExpertise.trim()) { setForm(p => ({ ...p, diseasesExpertise: [...p.diseasesExpertise, newExpertise.trim()] })); setNewExpertise(''); }
    };
    const removeExpertise = (i) => setForm(p => ({ ...p, diseasesExpertise: p.diseasesExpertise.filter((_, idx) => idx !== i) }));

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true); setMessage({ type: '', text: '' });
        try {
            const res = await doctorsAPI.updateProfile({ bio: form.bio, consultationFee: Number(form.consultationFee), diseasesExpertise: form.diseasesExpertise, isAvailable: form.isAvailable });
            updateProfile(res.data.data);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (e) { setMessage({ type: 'error', text: e.response?.data?.message || 'Update failed' }); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const initials = `${authProfile?.firstName?.[0] || ''}${authProfile?.lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="container page-enter">
            <div className="page-header">
                <div className="profile-header">
                    <div className="profile-avatar-lg" style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>{initials}</div>
                    <div>
                        <div className="profile-name">Dr. {authProfile?.firstName} {authProfile?.lastName}</div>
                        <div className="profile-role" style={{ color: '#67e8f9' }}>{authProfile?.specialization}</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                            {authProfile?.qualification} • {authProfile?.experience} years • License: {authProfile?.licenseNumber}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: form.isAvailable ? '#10b981' : '#ef4444', boxShadow: form.isAvailable ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
                            <span style={{ fontSize: '0.85rem', color: form.isAvailable ? '#6ee7b7' : '#fca5a5', fontWeight: '600' }}>
                                {form.isAvailable ? 'Available for Appointments' : 'Not Available'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rating & Stats */}
            <div className="grid-3" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-number">⭐ {authProfile?.rating?.average?.toFixed(1) || '0.0'}</div>
                    <div className="stat-label">Rating</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{authProfile?.rating?.totalReviews || 0}</div>
                    <div className="stat-label">Reviews</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">₹{authProfile?.consultationFee || 0}</div>
                    <div className="stat-label">Consultation Fee</div>
                </div>
            </div>

            <form onSubmit={handleSave}>
                {message.text && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.type === 'success' ? '✅' : '⚠️'} {message.text}</div>}

                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#f1f5f9' }}>⚙️ Availability & Fees</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Consultation Fee (₹)</label>
                            <input className="form-input" type="number" value={form.consultationFee} onChange={e => setForm(p => ({ ...p, consultationFee: e.target.value }))} min="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Availability Status</label>
                            <select className="form-input form-select" value={form.isAvailable ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isAvailable: e.target.value === 'true' }))}>
                                <option value="true">✅ Available</option>
                                <option value="false">❌ Not Available</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#f1f5f9' }}>🩺 Diseases & Expertise</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        {form.diseasesExpertise.map((exp, i) => (
                            <span key={i} style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9', padding: '4px 14px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {exp}
                                <button type="button" style={{ background: 'none', border: 'none', color: '#67e8f9', cursor: 'pointer', padding: '0', fontSize: '0.85rem' }} onClick={() => removeExpertise(i)}>✕</button>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input className="form-input" placeholder="Add a disease or condition..." value={newExpertise} onChange={e => setNewExpertise(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExpertise())} />
                        <button type="button" className="btn btn-secondary" onClick={addExpertise} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                    </div>
                </div>

                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '16px', color: '#f1f5f9' }}>📝 Professional Bio</h3>
                    <textarea className="form-input form-textarea" rows={5} placeholder="Describe your expertise, approach to patient care, notable achievements..." value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
                </div>

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
                    {saving ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
            </form>
        </div>
    );
};

export default DoctorProfile;
