const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

const parseJSONFields = (obj, fields) => {
    if (!obj) return obj;
    fields.forEach(f => {
        if (obj[f]) {
            try { obj[f] = JSON.parse(obj[f]); } catch (e) { }
        }
    });
    return obj;
};

// Helper: generate token number
const generateTokenNumber = async (doctorId, date) => {
    const dateStr = date.replace(/-/g, '');
    const shortDoctorId = doctorId.toString().slice(-6);

    await getDb().run('BEGIN TRANSACTION');
    let tokenDoc;
    try {
        tokenDoc = await getDb().get('SELECT * FROM tokens WHERE doctorId = ? AND date(date) = date(?)', doctorId, date);
        if (!tokenDoc) {
            const tokenId = crypto.randomUUID();
            await getDb().run('INSERT INTO tokens (id, doctorId, date, currentTokenNumber, totalTokensIssued, lastIssuedAt) VALUES (?, ?, ?, 1, 1, CURRENT_TIMESTAMP)', tokenId, doctorId, date);
            tokenDoc = { currentTokenNumber: 1 };
        } else {
            await getDb().run('UPDATE tokens SET currentTokenNumber = currentTokenNumber + 1, totalTokensIssued = totalTokensIssued + 1, lastIssuedAt = CURRENT_TIMESTAMP WHERE id = ?', tokenDoc.id);
            tokenDoc.currentTokenNumber += 1;
        }
        await getDb().run('COMMIT');
    } catch (e) {
        await getDb().run('ROLLBACK');
        throw e;
    }
    const tokenNum = tokenDoc.currentTokenNumber.toString().padStart(3, '0');
    return { tokenNumber: `D${shortDoctorId}-${dateStr}-T${tokenNum}`, queuePosition: tokenDoc.currentTokenNumber };
};

// @route   POST /api/appointments (Patient only)
router.post('/', protect, authorize('patient'), async (req, res) => {
    try {
        const { doctorId, appointmentDate, timeSlot, reason, notes } = req.body;

        if (!doctorId || !appointmentDate || !timeSlot) {
            return res.status(400).json({ success: false, message: 'doctorId, appointmentDate, and timeSlot are required' });
        }

        const apptDate = new Date(appointmentDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (apptDate < today) {
            return res.status(400).json({ success: false, message: 'Cannot book appointments for past dates' });
        }

        const patient = await getDb().get('SELECT id, firstName, lastName, phone FROM patients WHERE userId = ?', req.user.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

        const existing = await getDb().get(`
            SELECT id FROM appointments 
            WHERE doctorId = ? AND date(appointmentDate) = date(?) AND timeSlotStart = ? AND status != 'cancelled'
        `, doctorId, appointmentDate, timeSlot.startTime);

        if (existing) return res.status(400).json({ success: false, message: 'This time slot is already booked' });

        const { tokenNumber, queuePosition } = await generateTokenNumber(doctorId, appointmentDate);

        const appointmentId = crypto.randomUUID();
        await getDb().run(`
            INSERT INTO appointments (id, patientId, doctorId, appointmentDate, timeSlotStart, timeSlotEnd, tokenNumber, queuePosition, status, reason, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
        `, appointmentId, patient.id, doctorId, appointmentDate, timeSlot.startTime, timeSlot.endTime, tokenNumber, queuePosition, reason || '', notes || '');

        const doctor = await getDb().get('SELECT id, firstName, lastName, specialization, consultationFee FROM doctors WHERE id = ?', doctorId);

        const appointmentData = {
            _id: appointmentId,
            patientId: patient,
            doctorId: doctor,
            appointmentDate,
            timeSlot,
            tokenNumber,
            queuePosition,
            status: 'confirmed',
            reason,
            notes
        };

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: { appointment: appointmentData, tokenInfo: { tokenNumber, queuePosition } }
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, message: 'This time slot is already booked' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/appointments/my-appointments (Patient only)
router.get('/my-appointments', protect, authorize('patient'), async (req, res) => {
    try {
        const patient = await getDb().get('SELECT id FROM patients WHERE userId = ?', req.user.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const appointments = await getDb().all(`
            SELECT a.*, 
                   d.id as doc_id, d.firstName as doc_first, d.lastName as doc_last, d.specialization, d.consultationFee
            FROM appointments a 
            JOIN doctors d ON a.doctorId = d.id 
            WHERE a.patientId = ? 
            ORDER BY a.appointmentDate DESC
        `, patient.id);

        const mapped = appointments.map(a => ({
            _id: a.id,
            appointmentDate: a.appointmentDate,
            timeSlot: { startTime: a.timeSlotStart, endTime: a.timeSlotEnd },
            tokenNumber: a.tokenNumber,
            queuePosition: a.queuePosition,
            status: a.status,
            reason: a.reason,
            doctorNotes: a.doctorNotes,
            prescription: a.prescription ? JSON.parse(a.prescription) : [],
            doctorId: {
                _id: a.doc_id,
                firstName: a.doc_first,
                lastName: a.doc_last,
                specialization: a.specialization,
                consultationFee: a.consultationFee
            }
        }));

        res.json({ success: true, count: mapped.length, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/appointments/doctor/:date (Doctor only)
router.get('/doctor/:date', protect, authorize('doctor'), async (req, res) => {
    try {
        const doctor = await getDb().get('SELECT id FROM doctors WHERE userId = ?', req.user.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        const { date } = req.params;

        const appointments = await getDb().all(`
            SELECT a.*, 
                   p.id as pat_id, p.firstName as pat_first, p.lastName as pat_last, p.phone as pat_phone
            FROM appointments a 
            JOIN patients p ON a.patientId = p.id 
            WHERE a.doctorId = ? AND date(a.appointmentDate) = date(?)
            ORDER BY a.timeSlotStart ASC
        `, doctor.id, date);

        const tokenDoc = await getDb().get('SELECT * FROM tokens WHERE doctorId = ? AND date(date) = date(?)', doctor.id, date);

        const mapped = appointments.map(a => ({
            _id: a.id,
            appointmentDate: a.appointmentDate,
            timeSlot: { startTime: a.timeSlotStart, endTime: a.timeSlotEnd },
            tokenNumber: a.tokenNumber,
            queuePosition: a.queuePosition,
            status: a.status,
            reason: a.reason,
            notes: a.notes,
            patientId: {
                _id: a.pat_id,
                firstName: a.pat_first,
                lastName: a.pat_last,
                phone: a.pat_phone
            }
        }));

        res.json({
            success: true,
            count: mapped.length,
            tokenStats: tokenDoc ? {
                totalTokensIssued: tokenDoc.totalTokensIssued,
                tokensCompleted: tokenDoc.tokensCompleted,
                tokensActive: tokenDoc.tokensActive,
                tokensCancelled: tokenDoc.tokensCancelled,
                currentTokenNumber: tokenDoc.currentTokenNumber
            } : null,
            data: mapped
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/appointments/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const appointment = await getDb().get('SELECT * FROM appointments WHERE id = ?', req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        const patient = await getDb().get('SELECT id, firstName, lastName, phone, gender, dateOfBirth, medicalDetails FROM patients WHERE id = ?', appointment.patientId);
        const doctor = await getDb().get('SELECT id, firstName, lastName, specialization, consultationFee FROM doctors WHERE id = ?', appointment.doctorId);

        const mapped = {
            ...appointment,
            _id: appointment.id,
            timeSlot: { startTime: appointment.timeSlotStart, endTime: appointment.timeSlotEnd },
            prescription: appointment.prescription ? JSON.parse(appointment.prescription) : [],
            patientId: parseJSONFields({ ...patient, _id: patient.id }, ['medicalDetails']),
            doctorId: { ...doctor, _id: doctor.id }
        };

        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/appointments/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const appointment = await getDb().get('SELECT * FROM appointments WHERE id = ?', req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        if (['completed', 'cancelled'].includes(appointment.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel a ${appointment.status} appointment` });
        }

        const cancelledBy = req.user.role === 'patient' ? 'patient' : 'doctor';

        await getDb().run('BEGIN TRANSACTION');
        try {
            await getDb().run(`
                UPDATE appointments SET 
                    status = 'cancelled', 
                    cancelledBy = ?, 
                    cancellationReason = ?, 
                    cancelledAt = CURRENT_TIMESTAMP, 
                    updatedAt = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, cancelledBy, req.body.reason || '', appointment.id);

            await getDb().run(`
                UPDATE tokens SET tokensCancelled = tokensCancelled + 1, updatedAt = CURRENT_TIMESTAMP 
                WHERE doctorId = ? AND date(date) = date(?)
            `, appointment.doctorId, appointment.appointmentDate);

            await getDb().run('COMMIT');
        } catch (e) {
            await getDb().run('ROLLBACK');
            throw e;
        }

        const updated = await getDb().get('SELECT * FROM appointments WHERE id = ?', appointment.id);
        res.json({ success: true, message: 'Appointment cancelled successfully', data: { ...updated, _id: updated.id } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/appointments/:id/complete (Doctor only)
router.put('/:id/complete', protect, authorize('doctor'), async (req, res) => {
    try {
        const { doctorNotes, prescription } = req.body;
        const appointment = await getDb().get('SELECT * FROM appointments WHERE id = ?', req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

        if (appointment.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Appointment already completed' });
        }

        await getDb().run('BEGIN TRANSACTION');
        try {
            await getDb().run(`
                UPDATE appointments SET 
                    status = 'completed', 
                    doctorNotes = ?, 
                    prescription = ?, 
                    completedAt = CURRENT_TIMESTAMP, 
                    updatedAt = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, doctorNotes || '', JSON.stringify(prescription || []), appointment.id);

            await getDb().run(`
                UPDATE patients SET 
                    totalVisits = totalVisits + 1, 
                    lastVisitDate = CURRENT_TIMESTAMP, 
                    updatedAt = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, appointment.patientId);

            await getDb().run(`
                UPDATE tokens SET tokensCompleted = tokensCompleted + 1, updatedAt = CURRENT_TIMESTAMP 
                WHERE doctorId = ? AND date(date) = date(?)
            `, appointment.doctorId, appointment.appointmentDate);

            await getDb().run('COMMIT');
        } catch (e) {
            await getDb().run('ROLLBACK');
            throw e;
        }

        const updated = await getDb().get('SELECT * FROM appointments WHERE id = ?', appointment.id);
        res.json({ success: true, message: 'Appointment completed', data: { ...updated, _id: updated.id, prescription: updated.prescription ? JSON.parse(updated.prescription) : [] } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
