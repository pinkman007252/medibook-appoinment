import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsAPI } from '../../services/api';
import './Patient.css';

const formatDate = (d) => { const dt = new Date(d); return { day: dt.getDate(), month: dt.toLocaleString('default', { month: 'short' }), full: dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }; };

const PatientDashboard = () => {
    const { profile } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        appointmentsAPI.getMyAppointments()
            .then(res => setAppointments(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const upcoming = appointments.filter(a => ['confirmed', 'pending', 'in-progress'].includes(a.status));
    const stats = {
        upcoming: upcoming.length,
        completed: appointments.filter(a => a.status === 'completed').length,
        total: appointments.length
    };

    const getBadgeClass = (status) => {
        const map = { confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled', pending: 'badge-pending', 'in-progress': 'badge-in-progress' };
        return map[status] || 'badge-pending';
    };

    return (
        <div className="container page-enter">
            <div className="page-header">
                <div className="dashboard-hero">
                    <div className="upcoming-tag">🌟 Welcome Back</div>
                    <h1 className="dashboard-welcome">Hello, <span>{profile?.firstName || 'Patient'}</span>!</h1>
                    <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '1.05rem' }}>Manage your health appointments with ease</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <Link to="/search-doctors" className="btn btn-primary">🔍 Find a Doctor</Link>
                        <Link to="/history" className="btn btn-secondary">📋 View All Appointments</Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid-3" style={{ marginBottom: '32px' }}>
                    <div className="stat-card">
                        <div className="stat-number">{stats.upcoming}</div>
                        <div className="stat-label">Upcoming</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.completed}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.total}</div>
                        <div className="stat-label">Total Visits</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '16px', color: '#f1f5f9' }}>Quick Actions</h2>
                <div className="grid-4" style={{ marginBottom: '32px' }}>
                    {[
                        { to: '/search-doctors', icon: '🔍', label: 'Find Doctors' },
                        { to: '/history', icon: '📋', label: 'My Appointments' },
                        { to: '/profile', icon: '👤', label: 'My Profile' },
                        { to: '/search-doctors?q=cardiology', icon: '❤️', label: 'Cardiologist' }
                    ].map(action => (
                        <Link key={action.label} to={action.to} className="quick-action-btn">
                            <div className="quick-action-icon">{action.icon}</div>
                            <div className="quick-action-label">{action.label}</div>
                        </Link>
                    ))}
                </div>

                {/* Upcoming Appointments */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f1f5f9' }}>Upcoming Appointments</h2>
                    <Link to="/history" style={{ color: '#a78bfa', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600' }}>View All →</Link>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /></div>
                ) : upcoming.length === 0 ? (
                    <div className="empty-state glass-card">
                        <div className="empty-state-icon">📅</div>
                        <h3>No Upcoming Appointments</h3>
                        <p>Book an appointment with a doctor to get started</p>
                        <Link to="/search-doctors" className="btn btn-primary" style={{ marginTop: '16px' }}>Find a Doctor</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {upcoming.slice(0, 5).map(appt => {
                            const date = formatDate(appt.appointmentDate);
                            return (
                                <div key={appt._id} className="appointment-row">
                                    <div className="appointment-date-block">
                                        <div className="appointment-day">{date.day}</div>
                                        <div className="appointment-month">{date.month}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1rem' }}>
                                            Dr. {appt.doctorId?.firstName} {appt.doctorId?.lastName}
                                        </div>
                                        <div style={{ color: '#67e8f9', fontSize: '0.83rem', fontWeight: '500' }}>{appt.doctorId?.specialization}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px' }}>
                                            🕐 {appt.timeSlot?.startTime} – {appt.timeSlot?.endTime}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`badge ${getBadgeClass(appt.status)}`}>{appt.status}</span>
                                        <div style={{ color: '#a78bfa', fontSize: '0.78rem', marginTop: '6px', fontWeight: '600' }}>Token: {appt.tokenNumber?.split('-').pop()}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;
