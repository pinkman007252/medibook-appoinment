import React, { useState, useEffect } from 'react';
import { patientsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Patient.css';

const PatientProfile = () => {
    const { profile: authProfile, updateProfile } = useAuth();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [newAllergy, setNewAllergy] = useState('');
    const [newCondition, setNewCondition] = useState('');
    const [newMed, setNewMed] = useState('');

    useEffect(() => {
        patientsAPI.getProfile()
            .then(res => { const d = res.data.data; setForm({ phone: d.phone || '', address: d.address || {}, medicalDetails: { bloodGroup: d.medicalDetails?.bloodGroup || '', allergies: d.medicalDetails?.allergies || [], chronicConditions: d.medicalDetails?.chronicConditions || [], currentMedications: d.medicalDetails?.currentMedications || [] } }); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const onChange = (e) => { const { name, value } = e.target; if (name.startsWith('address.')) { const k = name.split('.')[1]; setForm(p => ({ ...p, address: { ...p.address, [k]: value } })); } else { setForm(p => ({ ...p, [name]: value })); } };

    const addTag = (field, val, setVal) => { if (val.trim()) { setForm(p => ({ ...p, medicalDetails: { ...p.medicalDetails, [field]: [...p.medicalDetails[field], val.trim()] } })); setVal(''); } };
    const removeTag = (field, idx) => { setForm(p => ({ ...p, medicalDetails: { ...p.medicalDetails, [field]: p.medicalDetails[field].filter((_, i) => i !== idx) } })); };

    const onSave = async (e) => {
        e.preventDefault(); setSaving(true); setMessage({ type: '', text: '' });
        try {
            const res = await patientsAPI.updateProfile(form);
            updateProfile(res.data.data);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' }); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    const initials = `${authProfile?.firstName?.[0] || ''}${authProfile?.lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="container page-enter">
            <div className="page-header">
                <div className="profile-header">
                    <div className="profile-avatar-lg">{initials}</div>
                    <div>
                        <div className="profile-name">{authProfile?.firstName} {authProfile?.lastName}</div>
                        <div className="profile-role">Patient</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>📱 {form?.phone} • 🏥 Total Visits: {authProfile?.visitHistory?.totalVisits || 0}</div>
                    </div>
                </div>
            </div>

            <form onSubmit={onSave}>
                {message.text && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.type === 'success' ? '✅' : '⚠️'} {message.text}</div>}

                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#f1f5f9' }}>📞 Contact Information</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" name="phone" value={form?.phone || ''} onChange={onChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Street Address</label>
                        <input className="form-input" name="address.street" value={form?.address?.street || ''} onChange={onChange} placeholder="Street address" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input className="form-input" name="address.city" value={form?.address?.city || ''} onChange={onChange} placeholder="City" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State</label>
                            <input className="form-input" name="address.state" value={form?.address?.state || ''} onChange={onChange} placeholder="State" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">ZIP Code</label>
                            <input className="form-input" name="address.zipCode" value={form?.address?.zipCode || ''} onChange={onChange} placeholder="600001" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Country</label>
                            <input className="form-input" name="address.country" value={form?.address?.country || ''} onChange={onChange} placeholder="India" />
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#f1f5f9' }}>🩺 Medical Details</h3>
                    <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select className="form-input form-select" value={form?.medicalDetails?.bloodGroup || ''} onChange={e => setForm(p => ({ ...p, medicalDetails: { ...p.medicalDetails, bloodGroup: e.target.value } }))}>
                            <option value="">Select Blood Group</option>
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* Allergies */}
                    <div className="form-group">
                        <label className="form-label">Allergies</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {form?.medicalDetails?.allergies?.map((a, i) => (
                                <span key={i} className="medical-tag">{a}<button type="button" className="remove-btn" onClick={() => removeTag('allergies', i)}>✕</button></span>
                            ))}
                        </div>
                        <div className="tag-input-row">
                            <input className="form-input" placeholder="Add allergy..." value={newAllergy} onChange={e => setNewAllergy(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('allergies', newAllergy, setNewAllergy))} />
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag('allergies', newAllergy, setNewAllergy)} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                        </div>
                    </div>

                    {/* Chronic Conditions */}
                    <div className="form-group">
                        <label className="form-label">Chronic Conditions</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {form?.medicalDetails?.chronicConditions?.map((c, i) => (
                                <span key={i} className="medical-tag" style={{ background: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.25)', color: '#67e8f9' }}>{c}<button type="button" className="remove-btn" style={{ color: '#67e8f9' }} onClick={() => removeTag('chronicConditions', i)}>✕</button></span>
                            ))}
                        </div>
                        <div className="tag-input-row">
                            <input className="form-input" placeholder="Add condition..." value={newCondition} onChange={e => setNewCondition(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('chronicConditions', newCondition, setNewCondition))} />
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag('chronicConditions', newCondition, setNewCondition)} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                        </div>
                    </div>

                    {/* Current Medications */}
                    <div className="form-group">
                        <label className="form-label">Current Medications</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {form?.medicalDetails?.currentMedications?.map((m, i) => (
                                <span key={i} className="medical-tag" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}>{m}<button type="button" className="remove-btn" style={{ color: '#6ee7b7' }} onClick={() => removeTag('currentMedications', i)}>✕</button></span>
                            ))}
                        </div>
                        <div className="tag-input-row">
                            <input className="form-input" placeholder="e.g. Amlodipine 5mg..." value={newMed} onChange={e => setNewMed(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('currentMedications', newMed, setNewMed))} />
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag('currentMedications', newMed, setNewMed)} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={saving}>
                    {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
            </form>
        </div>
    );
};

export default PatientProfile;
