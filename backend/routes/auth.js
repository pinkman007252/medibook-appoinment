const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

// Helper to convert DB rows to matching API structure
const parseJSONFields = (obj, fields) => {
    if (!obj) return obj;
    fields.forEach(f => {
        if (obj[f]) {
            try { obj[f] = JSON.parse(obj[f]); } catch (e) { }
        }
    });
    return obj;
};

const getSignedJwtToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// @route   POST /api/auth/register/patient
router.post('/register/patient', async (req, res) => {
    try {
        const { email, password, firstName, lastName, dateOfBirth, gender, phone, address } = req.body;

        if (!email || !password || !firstName || !lastName || !phone) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const existingUser = await getDb().get('SELECT id FROM users WHERE email = ?', email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const existingPatient = await getDb().get('SELECT id FROM patients WHERE phone = ?', phone);
        if (existingPatient) {
            return res.status(400).json({ success: false, message: 'Phone already registered' });
        }

        const userId = crypto.randomUUID();
        const patientId = crypto.randomUUID();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await getDb().run('BEGIN TRANSACTION');
        try {
            await getDb().run('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)', userId, email, hashedPassword, 'patient');
            await getDb().run(`
                INSERT INTO patients (id, userId, firstName, lastName, dateOfBirth, gender, phone, address, medicalDetails) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, patientId, userId, firstName, lastName, dateOfBirth || null, gender || null, phone, JSON.stringify(address || {}), JSON.stringify({}));

            await getDb().run('COMMIT');
        } catch (e) {
            await getDb().run('ROLLBACK');
            throw e;
        }

        const token = getSignedJwtToken(userId);
        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            data: {
                user: { id: userId, email, role: 'patient' },
                patient: { id: patientId, firstName, lastName, phone },
                token
            }
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, message: 'Email or phone already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/register/doctor
router.post('/register/doctor', async (req, res) => {
    try {
        const { email, password, firstName, lastName, specialization, qualification, experience, phone, licenseNumber, diseasesExpertise, consultationFee, bio } = req.body;

        if (!email || !password || !firstName || !lastName || !specialization || !qualification || !phone || !licenseNumber) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const existingUser = await getDb().get('SELECT id FROM users WHERE email = ?', email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const userId = crypto.randomUUID();
        const doctorId = crypto.randomUUID();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await getDb().run('BEGIN TRANSACTION');
        try {
            await getDb().run('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)', userId, email, hashedPassword, 'doctor');
            await getDb().run(`
                INSERT INTO doctors (id, userId, firstName, lastName, specialization, qualification, experience, phone, licenseNumber, diseasesExpertise, consultationFee, bio) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                doctorId, userId, firstName, lastName, specialization, qualification, experience || 0, phone, licenseNumber,
                JSON.stringify(diseasesExpertise || []), consultationFee || 500, bio || ''
            );

            await getDb().run('COMMIT');
        } catch (e) {
            await getDb().run('ROLLBACK');
            throw e;
        }

        const token = getSignedJwtToken(userId);
        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            data: {
                user: { id: userId, email, role: 'doctor' },
                doctor: { id: doctorId, firstName, lastName, specialization },
                token
            }
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, message: 'Email, phone, or license number already exists' });
        }
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await getDb().get('SELECT * FROM users WHERE email = ?', email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await getDb().run('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', user.id);

        let profile = null;
        if (user.role === 'patient') {
            profile = await getDb().get('SELECT * FROM patients WHERE userId = ?', user.id);
            if (profile) {
                profile._id = profile.id;
                profile = parseJSONFields(profile, ['address', 'medicalDetails']);
            }
        } else if (user.role === 'doctor') {
            profile = await getDb().get('SELECT * FROM doctors WHERE userId = ?', user.id);
            if (profile) {
                profile._id = profile.id;
                profile = parseJSONFields(profile, ['diseasesExpertise']);
            }
        }

        const token = getSignedJwtToken(user.id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user: { id: user.id, email: user.email, role: user.role }, profile, token }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/auth/me
const { protect } = require('../middleware/auth');
router.get('/me', protect, async (req, res) => {
    try {
        let profile = null;
        if (req.user.role === 'patient') {
            profile = await getDb().get('SELECT * FROM patients WHERE userId = ?', req.user.id);
            if (profile) {
                profile._id = profile.id;
                profile = parseJSONFields(profile, ['address', 'medicalDetails']);
            }
        } else if (req.user.role === 'doctor') {
            profile = await getDb().get('SELECT * FROM doctors WHERE userId = ?', req.user.id);
            if (profile) {
                profile._id = profile.id;
                profile = parseJSONFields(profile, ['diseasesExpertise']);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                user: { id: req.user.id, email: req.user.email, role: req.user.role, isActive: req.user.isActive },
                profile
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
