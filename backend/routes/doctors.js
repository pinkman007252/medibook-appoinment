const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../config/db');
const { protect, authorize } = require('../middleware/auth');

// Helper: parse JSON fields
const parseJSONFields = (obj, fields) => {
    if (!obj) return obj;
    fields.forEach(f => {
        if (obj[f]) {
            try { obj[f] = JSON.parse(obj[f]); } catch (e) { }
        }
    });
    return obj;
};

// Helper: time string to minutes
const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Helper: minutes to time string
const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

// @route   GET /api/doctors/search?query=cardiology
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, message: 'Query parameter is required' });
        }

        const searchTerm = `%${query}%`;
        const doctors = await getDb().all(`
            SELECT * FROM doctors 
            WHERE isAvailable = 1 AND (
                specialization LIKE ? OR 
                diseasesExpertise LIKE ? OR 
                firstName LIKE ? OR 
                lastName LIKE ?
            )
        `, searchTerm, searchTerm, searchTerm, searchTerm);

        const mappedDoctors = doctors.map(d => parseJSONFields({ ...d, _id: d.id }, ['diseasesExpertise']));
        res.json({ success: true, count: mappedDoctors.length, data: mappedDoctors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/doctors
router.get('/', async (req, res) => {
    try {
        const doctors = await getDb().all('SELECT * FROM doctors WHERE isAvailable = 1 ORDER BY ratingAverage DESC');
        const mappedDoctors = doctors.map(d => parseJSONFields({ ...d, _id: d.id }, ['diseasesExpertise']));
        res.json({ success: true, count: mappedDoctors.length, data: mappedDoctors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/doctors/:id
router.get('/:id', async (req, res) => {
    try {
        let doctor = await getDb().get('SELECT * FROM doctors WHERE id = ?', req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
        doctor = parseJSONFields({ ...doctor, _id: doctor.id }, ['diseasesExpertise']);
        res.json({ success: true, data: doctor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/doctors/:id/schedule
router.get('/:id/schedule', async (req, res) => {
    try {
        const schedules = await getDb().all('SELECT * FROM schedules WHERE doctorId = ? ORDER BY dayOfWeek ASC', req.params.id);
        const mappedSchedules = schedules.map(s => parseJSONFields({ ...s, _id: s.id }, ['shifts']));
        res.json({ success: true, count: mappedSchedules.length, data: mappedSchedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/doctors/:id/available-slots?date=2026-02-05
router.get('/:id/available-slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();

        let schedule = await getDb().get('SELECT * FROM schedules WHERE doctorId = ? AND dayOfWeek = ?', req.params.id, dayOfWeek);
        if (!schedule) return res.json({ success: true, count: 0, data: [] });

        schedule = parseJSONFields(schedule, ['shifts']);

        const bookedAppointments = await getDb().all(`
            SELECT timeSlotStart FROM appointments 
            WHERE doctorId = ? AND date(appointmentDate) = date(?) AND status != 'cancelled'
        `, req.params.id, date);

        const bookedTimes = new Set(bookedAppointments.map(a => a.timeSlotStart));

        const slots = [];
        if (schedule.shifts && Array.isArray(schedule.shifts)) {
            for (const shift of schedule.shifts) {
                if (!shift.isActive) continue;

                const shiftStart = timeToMinutes(shift.startTime);
                const shiftEnd = timeToMinutes(shift.endTime);
                const duration = shift.slotDuration;

                let current = shiftStart;
                while (current + duration <= shiftEnd) {
                    const slotStart = minutesToTime(current);
                    const slotEnd = minutesToTime(current + duration);

                    // Check if overlaps with break
                    let inBreak = false;
                    if (shift.breakTimes && Array.isArray(shift.breakTimes)) {
                        inBreak = shift.breakTimes.some(b => {
                            const bStart = timeToMinutes(b.startTime);
                            const bEnd = timeToMinutes(b.endTime);
                            return current < bEnd && current + duration > bStart;
                        });
                    }

                    if (!inBreak) {
                        slots.push({
                            startTime: slotStart,
                            endTime: slotEnd,
                            shiftName: shift.shiftName,
                            available: !bookedTimes.has(slotStart)
                        });
                    }
                    current += duration;
                }
            }
        }

        res.json({ success: true, count: slots.length, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/doctors/schedule (Doctor only)
router.post('/schedule', protect, authorize('doctor'), async (req, res) => {
    try {
        const doctor = await getDb().get('SELECT id FROM doctors WHERE userId = ?', req.user.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

        const { dayOfWeek, shifts, effectiveFrom } = req.body;

        const existing = await getDb().get('SELECT id FROM schedules WHERE doctorId = ? AND dayOfWeek = ?', doctor.id, dayOfWeek);

        let scheduleId;
        if (existing) {
            scheduleId = existing.id;
            await getDb().run('UPDATE schedules SET shifts = ?, effectiveFrom = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', JSON.stringify(shifts), effectiveFrom, scheduleId);
        } else {
            scheduleId = crypto.randomUUID();
            await getDb().run('INSERT INTO schedules (id, doctorId, dayOfWeek, shifts, effectiveFrom) VALUES (?, ?, ?, ?, ?)', scheduleId, doctor.id, dayOfWeek, JSON.stringify(shifts), effectiveFrom);
        }

        const schedule = await getDb().get('SELECT * FROM schedules WHERE id = ?', scheduleId);
        res.json({ success: true, message: 'Schedule updated successfully', data: parseJSONFields(schedule, ['shifts']) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/doctors/profile (Doctor only)
router.put('/profile', protect, authorize('doctor'), async (req, res) => {
    try {
        const doctor = await getDb().get('SELECT id FROM doctors WHERE userId = ?', req.user.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

        const { bio, consultationFee, diseasesExpertise, isAvailable } = req.body;

        await getDb().run(`
            UPDATE doctors SET 
                bio = coalesce(?, bio),
                consultationFee = coalesce(?, consultationFee),
                diseasesExpertise = coalesce(?, diseasesExpertise),
                isAvailable = coalesce(?, isAvailable),
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
            bio !== undefined ? bio : null,
            consultationFee !== undefined ? consultationFee : null,
            diseasesExpertise ? JSON.stringify(diseasesExpertise) : null,
            isAvailable !== undefined ? (isAvailable ? 1 : 0) : null,
            doctor.id
        );

        const updatedDoctor = await getDb().get('SELECT * FROM doctors WHERE id = ?', doctor.id);
        res.json({ success: true, message: 'Profile updated successfully', data: parseJSONFields(updatedDoctor, ['diseasesExpertise']) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
