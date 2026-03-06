import React, { useState, useEffect } from 'react';
import { appointmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Doctor.css';

const formatDate = (d) => d.toISOString().split('T')[0];

const PRESCRIPTION_TEMPLATE = { medicine: '', dosage: '', frequency: '', duration: '' };

const DoctorDashboard = () => {
    const { profile } = useAuth();
    const [date, setDate] = useState(formatDate(new Date()));
    const [appointments, setAppointments] = useState([]);
    const [tokenStats, setTokenStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [completeModal, setCompleteModal] = useState(false);
    const [cNotes, setCNotes] = useState('');
    const [prescriptions, setPrescriptions] = useState([{ ...PRESCRIPTION_TEMPLATE }]);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState('');

    const load = (d) => {
        setLoading(true);
        appointmentsAPI.getDoctorAppointments(d)
            .then(res => { setAppointments(res.data.data); setTokenStats(res.data.tokenStats); })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(date); }, [date]);

    const getBadgeClass = (s) => ({ confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled', pending: 'badge-pending', 'in-progress': 'badge-in-progress' }[s] || 'badge-pending');

    const openComplete = (appt) => { setSelectedAppt(appt); setCNotes(''); setPrescriptions([{ ...PRESCRIPTION_TEMPLATE }]); setCompleteModal(true); setError(''); };
    const addPrescription = () => setPrescriptions(p => [...p, { ...PRESCRIPTION_TEMPLATE }]);
    const updatePrescript = (i, field, val) => setPrescriptions(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
    const removePrescript = (i) => setPrescriptions(p => p.filter((_, idx) => idx !== i));

    const handleComplete = async () => {
        setCompleting(true); setError('');
        try {
            await appointmentsAPI.complete(selectedAppt._id, { doctorNotes: cNotes, prescription: prescriptions.filter(p => p.medicine) });
            setCompleteModal(false);
            load(date);
        } catch (e) { setError(e.response?.data?.message || 'Failed to complete'); }
        finally { setCompleting(false); }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this appointment?')) return;
        try { await appointmentsAPI.cancel(id, 'Cancelled by doctor'); load(date); }
        catch (e) { alert(e.response?.data?.message || 'Cancel failed'); }
    };

    const today = formatDate(new Date());
    const isToday = date === today;

    return (
        <div className="container page-enter">
            <div className="page-header">
                <div className="doctor-dash-hero">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9', padding: '5px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', display: 'inline-block', marginBottom: '12px' }}>
                                🩺 Appointments Dashboard
                            </div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'Outfit,sans-serif', color: '#f1f5f9' }}>
                                Dr. {profile?.firstName} {profile?.lastName}
                            </h1>
                            <p style={{ color: '#94a3b8', marginTop: '4px' }}>{profile?.specialization} • {profile?.experience} years experience</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Date:</label>
                            <input type="date" className="form-input" style={{ width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} max={''} />
                            <button className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>Today</button>
                        </div>
                    </div>
                </div>

                {/* Token Stats */}
                {tokenStats && (
                    <div className="grid-4" style={{ marginBottom: '28px' }}>
                        {[
                            { num: tokenStats.totalTokensIssued, label: 'Total Today', color: '' },
                            { num: tokenStats.tokensCompleted, label: 'Completed', color: '#10b981' },
                            { num: tokenStats.tokensActive, label: 'Active', color: '#7c3aed' },
                            { num: tokenStats.tokensCancelled, label: 'Cancelled', color: '#ef4444' }
                        ].map(s => (
                            <div key={s.label} className="queue-card">
                                <div className="queue-number" style={s.color ? { backgroundImage: `none`, color: s.color, WebkitTextFillColor: s.color } : {}}>{s.num || 0}</div>
                                <div className="queue-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: '#f1f5f9' }}>
                    📋 Patient Queue {isToday ? '(Today)' : `— ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </h2>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /></div>
                ) : appointments.length === 0 ? (
                    <div className="empty-state glass-card"><div className="empty-state-icon">📅</div><h3>No appointments</h3><p>No appointments scheduled for this date</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {appointments.map(appt => (
                            <div key={appt._id} className="patient-queue-row">
                                <div className="queue-token-badge">
                                    <div style={{ fontSize: '0.6rem', marginBottom: '2px' }}>TOKEN</div>
                                    <div style={{ fontSize: '0.85rem' }}>{appt.tokenNumber?.split('-T')[1] || '?'}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', color: '#f1f5f9' }}>
                                        {appt.patientId?.firstName} {appt.patientId?.lastName}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>📱 {appt.patientId?.phone}</div>
                                    <div style={{ color: '#67e8f9', fontSize: '0.8rem', marginTop: '2px' }}>⌚ {appt.timeSlot?.startTime} – {appt.timeSlot?.endTime}</div>
                                    {appt.reason && <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px', fontStyle: 'italic' }}>"{appt.reason}"</div>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <span className={`badge ${getBadgeClass(appt.status)}`}>{appt.status}</span>
                                    {['confirmed', 'pending', 'in-progress'].includes(appt.status) && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn btn-success btn-sm" onClick={() => openComplete(appt)}>✅ Complete</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleCancel(appt._id)}>✕</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Complete Appointment Modal */}
            {completeModal && selectedAppt && (
                <div className="modal-overlay" onClick={() => setCompleteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Complete Appointment</h2>
                            <button className="modal-close" onClick={() => setCompleteModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(124,58,237,0.08)', borderRadius: '10px', marginBottom: '20px' }}>
                            <strong style={{ color: '#f1f5f9' }}>{selectedAppt.patientId?.firstName} {selectedAppt.patientId?.lastName}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}> · {selectedAppt.timeSlot?.startTime} · {selectedAppt.reason}</span>
                        </div>
                        {error && <div className="alert alert-error">⚠️ {error}</div>}
                        <div className="form-group">
                            <label className="form-label">Doctor Notes</label>
                            <textarea className="form-input form-textarea" rows={3} placeholder="Clinical observations, diagnosis, follow-up instructions..." value={cNotes} onChange={e => setCNotes(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label className="form-label" style={{ margin: 0 }}>💊 Prescription</label>
                            <button className="btn btn-secondary btn-sm" onClick={addPrescription}>+ Add Medicine</button>
                        </div>
                        {prescriptions.map((p, i) => (
                            <div key={i} className="presc-row">
                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: '8px' }}><input className="form-input" placeholder="Medicine name" value={p.medicine} onChange={e => updatePrescript(i, 'medicine', e.target.value)} /></div>
                                    <div className="form-group" style={{ marginBottom: '8px' }}><input className="form-input" placeholder="Dosage (e.g. 5mg)" value={p.dosage} onChange={e => updatePrescript(i, 'dosage', e.target.value)} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: '0' }}><input className="form-input" placeholder="Frequency (e.g. Once daily)" value={p.frequency} onChange={e => updatePrescript(i, 'frequency', e.target.value)} /></div>
                                    <div className="form-group" style={{ marginBottom: '0' }}><input className="form-input" placeholder="Duration (e.g. 30 days)" value={p.duration} onChange={e => updatePrescript(i, 'duration', e.target.value)} /></div>
                                </div>
                                {i > 0 && <button style={{ marginTop: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => removePrescript(i)}>Remove</button>}
                            </div>
                        ))}
                        <button className="btn btn-success btn-full btn-lg" style={{ marginTop: '20px' }} onClick={handleComplete} disabled={completing}>
                            {completing ? '⏳ Completing...' : '✅ Mark as Completed'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
