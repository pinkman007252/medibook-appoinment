import React, { useState, useEffect } from 'react';
import { doctorsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Doctor.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultShift = { shiftName: 'Morning', startTime: '09:00', endTime: '13:00', slotDuration: 30, breakTimes: [], maxPatientsPerSlot: 1, isActive: true };

const ScheduleManager = () => {
    const [selectedDay, setSelectedDay] = useState(1);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const { profile } = useAuth();

    useEffect(() => {
        if (!profile?._id) return;
        doctorsAPI.getSchedule(profile._id)
            .then(res => {
                const map = {};
                res.data.data.forEach(s => { map[s.dayOfWeek] = s; });
                setSchedules(map);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [profile]);

    const getOrDefaultSchedule = (day) => schedules[day] || { dayOfWeek: day, shifts: [{ ...defaultShift }], effectiveFrom: new Date().toISOString().split('T')[0] };

    const current = getOrDefaultSchedule(selectedDay);

    const updateShift = (i, field, value) => {
        const updated = { ...current, shifts: current.shifts.map((s, idx) => idx === i ? { ...s, [field]: value } : s) };
        setSchedules(prev => ({ ...prev, [selectedDay]: updated }));
    };

    const addShift = () => {
        const updated = { ...current, shifts: [...current.shifts, { ...defaultShift, shiftName: 'Evening', startTime: '17:00', endTime: '20:00' }] };
        setSchedules(prev => ({ ...prev, [selectedDay]: updated }));
    };

    const removeShift = (i) => {
        const updated = { ...current, shifts: current.shifts.filter((_, idx) => idx !== i) };
        setSchedules(prev => ({ ...prev, [selectedDay]: updated }));
    };

    const addBreak = (shiftIdx) => {
        const shift = current.shifts[shiftIdx];
        const newBreak = { startTime: '11:00', endTime: '11:15', breakType: 'tea' };
        updateShift(shiftIdx, 'breakTimes', [...(shift.breakTimes || []), newBreak]);
    };

    const updateBreak = (shiftIdx, breakIdx, field, value) => {
        const shift = current.shifts[shiftIdx];
        const updated = shift.breakTimes.map((b, i) => i === breakIdx ? { ...b, [field]: value } : b);
        updateShift(shiftIdx, 'breakTimes', updated);
    };

    const removeBreak = (shiftIdx, breakIdx) => {
        const shift = current.shifts[shiftIdx];
        updateShift(shiftIdx, 'breakTimes', shift.breakTimes.filter((_, i) => i !== breakIdx));
    };

    const handleSave = async () => {
        setSaving(true); setMessage({ type: '', text: '' });
        try {
            await doctorsAPI.updateSchedule({ dayOfWeek: selectedDay, shifts: current.shifts, effectiveFrom: current.effectiveFrom || new Date().toISOString().split('T')[0] });
            setMessage({ type: 'success', text: `${DAYS[selectedDay]} schedule saved!` });
        } catch (e) { setMessage({ type: 'error', text: e.response?.data?.message || 'Save failed' }); }
        finally { setSaving(false); }
    };

    return (
        <div className="container page-enter">
            <div className="page-header">
                <h1 className="page-title">Schedule Manager</h1>
                <p className="page-subtitle">Set your weekly working hours and breaks</p>
            </div>

            {/* Day selector */}
            <div className="days-grid" style={{ marginBottom: '24px' }}>
                {DAYS_SHORT.map((d, i) => (
                    <button key={d} className={`day-btn${selectedDay === i ? ' active' : ''}`} onClick={() => setSelectedDay(i)}>
                        <div>{d}</div>
                        {schedules[i] && <div style={{ fontSize: '0.6rem', marginTop: '3px', opacity: 0.7 }}>{schedules[i].shifts?.filter(s => s.isActive).length} shift{schedules[i].shifts?.filter(s => s.isActive).length !== 1 ? 's' : ''}</div>}
                    </button>
                ))}
            </div>

            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1.15rem' }}>📅 {DAYS[selectedDay]}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <input type="date" className="form-input" style={{ width: 'auto' }} value={current.effectiveFrom?.split('T')[0] || ''} onChange={e => setSchedules(prev => ({ ...prev, [selectedDay]: { ...current, effectiveFrom: e.target.value } }))} />
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={addShift}>+ Shift</button>
                    </div>
                </div>

                {message.text && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}

                {loading ? <div className="loading-container"><div className="spinner" /></div> : (
                    <>
                        {current.shifts.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon">😴</div><h3>No shifts</h3><p>Add a shift to schedule this day</p></div>
                        ) : (
                            current.shifts.map((shift, si) => (
                                <div key={si} className="shift-editor">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <select className="form-input form-select" style={{ width: 'auto' }} value={shift.shiftName} onChange={e => updateShift(si, 'shiftName', e.target.value)}>
                                            <option>Morning</option><option>Afternoon</option><option>Evening</option><option>Night</option>
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#94a3b8' }}>
                                                <input type="checkbox" checked={shift.isActive} onChange={e => updateShift(si, 'isActive', e.target.checked)} />
                                                Active
                                            </label>
                                            {current.shifts.length > 1 && <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }} onClick={() => removeShift(si)}>🗑️</button>}
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Start Time</label>
                                            <input type="time" className="form-input" value={shift.startTime} onChange={e => updateShift(si, 'startTime', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">End Time</label>
                                            <input type="time" className="form-input" value={shift.endTime} onChange={e => updateShift(si, 'endTime', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Slot Duration (min)</label>
                                            <select className="form-input form-select" value={shift.slotDuration} onChange={e => updateShift(si, 'slotDuration', Number(e.target.value))}>
                                                <option value={15}>15 min</option><option value={20}>20 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>☕ Breaks</p>
                                        <button className="btn btn-secondary btn-sm" onClick={() => addBreak(si)}>+ Break</button>
                                    </div>
                                    {shift.breakTimes?.map((br, bi) => (
                                        <div key={bi} className="break-item">
                                            <input type="time" className="form-input" style={{ width: 'auto' }} value={br.startTime} onChange={e => updateBreak(si, bi, 'startTime', e.target.value)} />
                                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>to</span>
                                            <input type="time" className="form-input" style={{ width: 'auto' }} value={br.endTime} onChange={e => updateBreak(si, bi, 'endTime', e.target.value)} />
                                            <select className="form-input form-select" style={{ width: 'auto' }} value={br.breakType} onChange={e => updateBreak(si, bi, 'breakType', e.target.value)}>
                                                <option value="tea">Tea</option><option value="lunch">Lunch</option><option value="personal">Personal</option>
                                            </select>
                                            <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => removeBreak(si, bi)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                        <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '20px' }} onClick={handleSave} disabled={saving}>
                            {saving ? '⏳ Saving...' : '💾 Save Schedule'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ScheduleManager;
