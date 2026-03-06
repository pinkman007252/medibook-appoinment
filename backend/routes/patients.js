const express = require('express');
const router = express.Router();
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

// @route   GET /api/patients/profile
router.get('/profile', protect, authorize('patient'), async (req, res) => {
    try {
        const patient = await getDb().get('SELECT * FROM patients WHERE userId = ?', req.user.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

        const mapped = parseJSONFields({ ...patient, _id: patient.id }, ['address', 'medicalDetails']);
        mapped.visitHistory = {
            totalVisits: patient.totalVisits,
            lastVisitDate: patient.lastVisitDate
        };

        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/patients/profile
router.put('/profile', protect, authorize('patient'), async (req, res) => {
    try {
        const patient = await getDb().get('SELECT id FROM patients WHERE userId = ?', req.user.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

        const { phone, address, medicalDetails } = req.body;

        await getDb().run(`
            UPDATE patients SET 
                phone = coalesce(?, phone),
                address = coalesce(?, address),
                medicalDetails = coalesce(?, medicalDetails),
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
            phone || null,
            address ? JSON.stringify(address) : null,
            medicalDetails ? JSON.stringify(medicalDetails) : null,
            patient.id
        );

        const updated = await getDb().get('SELECT * FROM patients WHERE id = ?', patient.id);
        const mapped = parseJSONFields({ ...updated, _id: updated.id }, ['address', 'medicalDetails']);

        res.json({ success: true, message: 'Profile updated successfully', data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/patients/history
router.get('/history', protect, authorize('patient'), async (req, res) => {
    try {
        const patient = await getDb().get('SELECT id, totalVisits, lastVisitDate FROM patients WHERE userId = ?', req.user.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const appointments = await getDb().all(`
            SELECT a.*, 
                   d.id as doc_id, d.firstName as doc_first, d.lastName as doc_last, d.specialization
            FROM appointments a 
            JOIN doctors d ON a.doctorId = d.id 
            WHERE a.patientId = ? 
            ORDER BY a.appointmentDate DESC
        `, patient.id);

        const mapped = appointments.map(a => ({
            _id: a.id,
            appointmentDate: a.appointmentDate,
            status: a.status,
            tokenNumber: a.tokenNumber,
            doctorId: {
                _id: a.doc_id,
                firstName: a.doc_first,
                lastName: a.doc_last,
                specialization: a.specialization
            }
        }));

        res.json({
            success: true,
            count: mapped.length,
            visitHistory: {
                totalVisits: patient.totalVisits,
                lastVisitDate: patient.lastVisitDate
            },
            data: mapped
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
