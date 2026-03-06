import React, { useState, useEffect, useCallback } from 'react';
import { doctorsAPI, appointmentsAPI } from '../../services/api';
import './Patient.css';

const SPECIALIZATIONS = ['All', 'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Ophthalmology'];

const DoctorSearch = () => {
    const [doctors, setDoctors] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('All');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [step, setStep] = useState(1); // 1=date, 2=slots, 3=confirm
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [booking, setBooking] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [error, setError] = useState('');

    const fetchDoctors = useCallback(async (q) => {
        setLoading(true);
        try {
            const res = q ? await doctorsAPI.search(q) : await doctorsAPI.getAll();
            setDoctors(res.data.data);
        } catch { setDoctors([]); } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchDoctors(query), 400);
        return () => clearTimeout(t);
    }, [query, fetchDoctors]);

    const filteredDoctors = filter === 'All' ? doctors : doctors.filter(d => d.specialization === filter);

    const openBooking = (doc) => { setSelectedDoc(doc); setStep(1); setDate(''); setSelectedSlot(null); setSlots([]); setReason(''); setNotes(''); setBookingResult(null); setError(''); };
    const closeBooking = () => { setSelectedDoc(null); setBookingResult(null); };

    const fetchSlots = async () => {
        if (!date) return;
        setSlotsLoading(true); setSelectedSlot(null);
        try {
            const res = await doctorsAPI.getAvailableSlots(selectedDoc._id, date);
            setSlots(res.data.data);
            setStep(2);
        } catch { setSlots([]); setStep(2); } finally { setSlotsLoading(false); }
    };

    const handleBook = async () => {
        if (!selectedSlot) return;
        setBooking(true); setError('');
        try {
            const res = await appointmentsAPI.book({ doctorId: selectedDoc._id, appointmentDate: date, timeSlot: { startTime: selectedSlot.startTime, endTime: selectedSlot.endTime }, reason, notes });
            setBookingResult(res.data.data);
            setStep(4);
        } catch (err) { setError(err.response?.data?.message || 'Booking failed'); } finally { setBooking(false); }
    };

    const today = new Date().toISOString().split('T')[0];
    const groupedSlots = slots.reduce((g, s) => { (g[s.shiftName] = g[s.shiftName] || []).push(s); return g; }, {});

    return (
        <div className="container page-enter">
            <div className="page-header">
                <h1 className="page-title">Find a Doctor</h1>
                <p className="page-subtitle">Search by specialization or medical condition</p>
            </div>

            <div className="search-container" style={{ marginBottom: '16px' }}>
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search by disease, specialization, or doctor name..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="search-filters">
                {SPECIALIZATIONS.map(s => (
                    <button key={s} className={`filter-chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
                ))}
            </div>

            <div style={{ margin: '24px 0 12px', color: '#64748b', fontSize: '0.85rem' }}>
                {loading ? 'Searching...' : `${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? 's' : ''} found`}
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filteredDoctors.length === 0 ? (
                <div className="empty-state glass-card"><div className="empty-state-icon">🩺</div><h3>No doctors found</h3><p>Try a different search term</p></div>
            ) : (
                <div className="grid-auto">
                    {filteredDoctors.map((doc, i) => (
                        <div key={doc._id} className="doctor-card" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => openBooking(doc)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                <div className="doctor-avatar">{doc.firstName[0]}{doc.lastName[0]}</div>
                                <div>
                                    <div className="doctor-name">Dr. {doc.firstName} {doc.lastName}</div>
                                    <div className="doctor-spec">{doc.specialization}</div>
                                </div>
                            </div>
                            <div className="doctor-meta">
                                <span className="doctor-meta-item">🎓 {doc.qualification}</span>
                                <span className="doctor-meta-item">⏳ {doc.experience}y exp</span>
                                <span className="doctor-meta-item">⭐ {doc.rating?.average?.toFixed(1)} ({doc.rating?.totalReviews})</span>
                            </div>
                            {doc.diseasesExpertise?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                                    {doc.diseasesExpertise.slice(0, 3).map(d => <span key={d} className="doctor-tag">{d}</span>)}
                                    {doc.diseasesExpertise.length > 3 && <span className="doctor-tag">+{doc.diseasesExpertise.length - 3}</span>}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="doctor-fee">₹{doc.consultationFee}</div>
                                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); openBooking(doc); }}>Book Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {selectedDoc && (
                <div className="modal-overlay" onClick={closeBooking}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        {step < 4 && (
                            <div className="modal-header">
                                <h2 className="modal-title">Book Appointment</h2>
                                <button className="modal-close" onClick={closeBooking}>✕</button>
                            </div>
                        )}

                        {/* Doctor summary */}
                        {step < 4 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', marginBottom: '20px' }}>
                                <div className="doctor-avatar" style={{ width: '48px', height: '48px', fontSize: '1rem' }}>{selectedDoc.firstName[0]}{selectedDoc.lastName[0]}</div>
                                <div>
                                    <div style={{ fontWeight: '700', color: '#f1f5f9' }}>Dr. {selectedDoc.firstName} {selectedDoc.lastName}</div>
                                    <div style={{ color: '#67e8f9', fontSize: '0.83rem' }}>{selectedDoc.specialization} • ₹{selectedDoc.consultationFee}</div>
                                </div>
                            </div>
                        )}

                        {/* Steps indicator */}
                        {step < 4 && (
                            <div className="steps" style={{ marginBottom: '24px' }}>
                                {['Select Date', 'Pick Slot', 'Confirm'].map((label, i) => (
                                    <React.Fragment key={label}>
                                        <div className={`step${step === i + 1 ? ' active' : step > i + 1 ? ' done' : ''}`}>
                                            <div className="step-circle">{step > i + 1 ? '✓' : i + 1}</div>
                                            <span className="step-label">{label}</span>
                                        </div>
                                        {i < 2 && <div className={`step-connector${step > i + 1 ? ' done' : ''}`} />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {error && <div className="alert alert-error">⚠️ {error}</div>}

                        {/* Step 1: Date */}
                        {step === 1 && (
                            <div className="booking-step">
                                <div className="form-group">
                                    <label className="form-label">Select Appointment Date</label>
                                    <input className="form-input" type="date" value={date} min={today} onChange={e => setDate(e.target.value)} />
                                </div>
                                <button className="btn btn-primary btn-full" onClick={fetchSlots} disabled={!date || slotsLoading}>
                                    {slotsLoading ? '⏳ Loading Slots...' : 'Check Available Slots →'}
                                </button>
                            </div>
                        )}

                        {/* Step 2: Slots */}
                        {step === 2 && (
                            <div className="booking-step">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                                        {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setStep(1)}>← Change Date</button>
                                </div>
                                {slots.length === 0 ? (
                                    <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No slots available</h3><p>Please select a different date</p></div>
                                ) : (
                                    <>
                                        {Object.entries(groupedSlots).map(([shift, shiftSlots]) => (
                                            <div key={shift}>
                                                <p className="slot-shift-label">☀️ {shift}</p>
                                                <div className="slot-grid">
                                                    {shiftSlots.map(slot => (
                                                        <div key={slot.startTime} className={`slot-item${slot.available ? (selectedSlot?.startTime === slot.startTime ? ' selected' : ' available') : ' unavailable'}`} onClick={() => slot.available && setSelectedSlot(slot)}>
                                                            <div>{slot.startTime}</div>
                                                            {!slot.available && <div style={{ fontSize: '0.65rem', marginTop: '2px' }}>Booked</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button className="btn btn-primary btn-full" style={{ marginTop: '20px' }} onClick={() => setStep(3)} disabled={!selectedSlot}>Continue →</button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Step 3: Confirm */}
                        {step === 3 && (
                            <div className="booking-step">
                                <div className="confirm-box">
                                    <div className="confirm-row"><span className="confirm-label">Doctor</span><span className="confirm-value">Dr. {selectedDoc.firstName} {selectedDoc.lastName}</span></div>
                                    <div className="confirm-row"><span className="confirm-label">Date</span><span className="confirm-value">{new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                                    <div className="confirm-row"><span className="confirm-label">Time</span><span className="confirm-value">{selectedSlot?.startTime} – {selectedSlot?.endTime}</span></div>
                                    <div className="confirm-row"><span className="confirm-label">Fee</span><span className="confirm-value" style={{ color: '#10b981' }}>₹{selectedDoc.consultationFee}</span></div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reason for Visit *</label>
                                    <input className="form-input" placeholder="e.g. Regular checkup, chest pain..." value={reason} onChange={e => setReason(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Additional Notes</label>
                                    <textarea className="form-input form-textarea" placeholder="Any additional information..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                                    <button className="btn btn-success btn-full" onClick={handleBook} disabled={booking || !reason}>
                                        {booking ? '⏳ Booking...' : '✅ Confirm Booking'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {step === 4 && bookingResult && (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                                <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: '800', fontSize: '1.6rem', marginBottom: '8px', color: '#f1f5f9' }}>Appointment Booked!</h2>
                                <p style={{ color: '#94a3b8', marginBottom: '28px' }}>Your appointment has been confirmed successfully</p>
                                <div className="token-card">
                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Your Token Number</p>
                                    <div className="token-number">{bookingResult.tokenInfo?.tokenNumber}</div>
                                    <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '0.85rem' }}>Queue Position</p>
                                    <div className="token-queue">#{bookingResult.tokenInfo?.queuePosition}</div>
                                </div>
                                <button className="btn btn-primary btn-full" style={{ marginTop: '24px' }} onClick={closeBooking}>Done</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorSearch;
