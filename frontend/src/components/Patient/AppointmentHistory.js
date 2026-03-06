import React, { useState, useEffect } from 'react';
import { appointmentsAPI } from '../../services/api';
import './Patient.css';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled', 'pending'];

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const AppointmentHistory = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelFor, setShowCancelFor] = useState(null);

    const load = () => {
        setLoading(true);
        appointmentsAPI.getMyAppointments()
            .then(res => setAppointments(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

    const getBadgeClass = (status) => {
        const map = { confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled', pending: 'badge-pending', 'in-progress': 'badge-in-progress', 'no-show': 'badge-no-show' };
        return map[status] || 'badge-pending';
    };

    const handleCancel = async (id) => {
        if (!cancelReason.trim()) return;
        setCancelling(id);
        try {
            await appointmentsAPI.cancel(id, cancelReason);
            setShowCancelFor(null); setCancelReason('');
            load();
        } catch (e) { alert(e.response?.data?.message || 'Cancel failed'); }
        finally { setCancelling(null); }
    };

    return (
        <div className="container page-enter">
            <div className="page-header">
                <h1 className="page-title">My Appointments</h1>
                <p className="page-subtitle">View and manage all your appointments</p>
            </div>

            <div className="history-filters">
                {STATUS_FILTERS.map(s => (
                    <button key={s} className={`filter-chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state glass-card">
                    <div className="empty-state-icon">📋</div>
                    <h3>No appointments found</h3>
                    <p>No {filter !== 'all' ? filter : ''} appointments to display</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(appt => {
                        const isExpanded = expanded === appt._id;
                        const date = new Date(appt.appointmentDate);
                        return (
                            <div key={appt._id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                <div style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }} onClick={() => setExpanded(isExpanded ? null : appt._id)}>
                                    <div className="appointment-date-block">
                                        <div className="appointment-day">{date.getDate()}</div>
                                        <div className="appointment-month">{date.toLocaleString('default', { month: 'short' })}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#f1f5f9' }}>Dr. {appt.doctorId?.firstName} {appt.doctorId?.lastName}</div>
                                        <div style={{ color: '#67e8f9', fontSize: '0.83rem', marginTop: '2px' }}>{appt.doctorId?.specialization}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>🕐 {appt.timeSlot?.startTime} – {appt.timeSlot?.endTime}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                        <span className={`badge ${getBadgeClass(appt.status)}`}>{appt.status}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px', background: 'rgba(0,0,0,0.15)' }}>
                                        <div className="appointment-detail-row"><span className="detail-label">Token</span><span className="detail-value" style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: '700' }}>{appt.tokenNumber}</span></div>
                                        <div className="appointment-detail-row"><span className="detail-label">Queue #</span><span className="detail-value">#{appt.queuePosition}</span></div>
                                        {appt.reason && <div className="appointment-detail-row"><span className="detail-label">Reason</span><span className="detail-value">{appt.reason}</span></div>}
                                        {appt.notes && <div className="appointment-detail-row"><span className="detail-label">Notes</span><span className="detail-value">{appt.notes}</span></div>}
                                        {appt.doctorNotes && (
                                            <div className="appointment-detail-row">
                                                <span className="detail-label">Doctor Notes</span>
                                                <span className="detail-value" style={{ color: '#6ee7b7' }}>{appt.doctorNotes}</span>
                                            </div>
                                        )}
                                        {appt.prescription?.length > 0 && (
                                            <div style={{ marginTop: '14px' }}>
                                                <p style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', marginBottom: '8px' }}>💊 Prescription</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {appt.prescription.map((p, i) => (
                                                        <div key={i} className="prescription-item">
                                                            <div className="prescription-medicine">{p.medicine} – {p.dosage}</div>
                                                            <div className="prescription-details">{p.frequency} • {p.duration}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {appt.cancellationReason && (
                                            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#fca5a5' }}>
                                                Cancelled by {appt.cancelledBy}: {appt.cancellationReason}
                                            </div>
                                        )}
                                        {['confirmed', 'pending'].includes(appt.status) && (
                                            <div style={{ marginTop: '14px' }}>
                                                {showCancelFor === appt._id ? (
                                                    <div>
                                                        <input className="form-input" placeholder="Reason for cancellation..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ marginBottom: '8px' }} />
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowCancelFor(null)}>Cancel</button>
                                                            <button className="btn btn-danger btn-sm" onClick={() => handleCancel(appt._id)} disabled={!cancelReason.trim() || cancelling === appt._id}>
                                                                {cancelling === appt._id ? 'Cancelling...' : 'Confirm Cancel'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button className="btn btn-danger btn-sm" onClick={() => setShowCancelFor(appt._id)}>Cancel Appointment</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppointmentHistory;
