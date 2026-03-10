require('dotenv').config();
const { getDb, setupDatabase } = require('./config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const seedData = async () => {
    await setupDatabase();
    console.log('🌱 Starting seed...');

    const db = getDb();

    // Clear existing data from SQLite
    await db.run('DELETE FROM tokens');
    await db.run('DELETE FROM appointments');
    await db.run('DELETE FROM schedules');
    await db.run('DELETE FROM doctors');
    await db.run('DELETE FROM patients');
    await db.run('DELETE FROM users');

    console.log('🗑️  Cleared existing data');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Seed doctors
    const doctorsData = [
        { email: 'sarah.kumar@hospital.com', firstName: 'Sarah', lastName: 'Kumar', specialization: 'Cardiology', qualification: 'MBBS, MD', experience: 12, phone: '9123456789', licenseNumber: 'MCI12345', diseasesExpertise: ['Heart Disease', 'Hypertension'], fee: 1000 },
        { email: 'raj.patel@hospital.com', firstName: 'Raj', lastName: 'Patel', specialization: 'Neurology', qualification: 'MBBS, DM', experience: 8, phone: '9234567890', licenseNumber: 'MCI23456', diseasesExpertise: ['Migraine', 'Epilepsy'], fee: 1200 },
        { email: 'priya.nair@hospital.com', firstName: 'Priya', lastName: 'Nair', specialization: 'Dermatology', qualification: 'MBBS, MD', experience: 6, phone: '9345678901', licenseNumber: 'MCI34567', diseasesExpertise: ['Acne', 'Psoriasis'], fee: 800 },
        { email: 'vikram.singh@hospital.com', firstName: 'Vikram', lastName: 'Singh', specialization: 'Orthopedics', qualification: 'MBBS, MS', experience: 15, phone: '9456789012', licenseNumber: 'MCI45678', diseasesExpertise: ['Joint Pain', 'Fractures'], fee: 1100 }
    ];

    const doctorIds = [];

    await db.run('BEGIN TRANSACTION');
    try {
        for (const dr of doctorsData) {
            const userId = crypto.randomUUID();
            const doctorId = crypto.randomUUID();

            await db.run('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)', userId, dr.email, passwordHash, 'doctor');

            await db.run(`
                INSERT INTO doctors (id, userId, firstName, lastName, specialization, qualification, experience, phone, licenseNumber, diseasesExpertise, consultationFee, bio) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Experienced doctor')
            `, doctorId, userId, dr.firstName, dr.lastName, dr.specialization, dr.qualification, dr.experience, dr.phone, dr.licenseNumber, JSON.stringify(dr.diseasesExpertise), dr.fee);

            doctorIds.push({ id: doctorId, ...dr });

            // Generate schedules for doctors
            for (let day = 1; day <= 6; day++) {
                const shifts = [];
                if (day <= 5) {
                    shifts.push({ shiftName: 'Morning', startTime: '09:00', endTime: '13:00', slotDuration: 30, breakTimes: [{ startTime: '11:00', endTime: '11:15', breakType: 'tea' }], maxPatientsPerSlot: 1, isActive: true });
                }
                if (day >= 2 && day <= 6 && day !== 6) {
                    shifts.push({ shiftName: 'Evening', startTime: '17:00', endTime: '20:00', slotDuration: 30, breakTimes: [], maxPatientsPerSlot: 1, isActive: true });
                }

                if (shifts.length > 0) {
                    await db.run('INSERT INTO schedules (id, doctorId, dayOfWeek, shifts, effectiveFrom) VALUES (?, ?, ?, ?, ?)',
                        crypto.randomUUID(), doctorId, day, JSON.stringify(shifts), '2026-01-01');
                }
            }
        }

        // Seed patients
        const p1UserId = crypto.randomUUID();
        const p1Id = crypto.randomUUID();
        await db.run('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)', p1UserId, 'john.doe@email.com', passwordHash, 'patient');
        await db.run('INSERT INTO patients (id, userId, firstName, lastName, gender, phone, dateOfBirth, address, medicalDetails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            p1Id, p1UserId, 'John', 'Doe', 'male', '9876543210', '1985-05-15', JSON.stringify({ city: 'Chennai' }), JSON.stringify({ bloodGroup: 'O+' }));

        const p2UserId = crypto.randomUUID();
        const p2Id = crypto.randomUUID();
        await db.run('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)', p2UserId, 'jane.smith@email.com', passwordHash, 'patient');
        await db.run('INSERT INTO patients (id, userId, firstName, lastName, gender, phone, dateOfBirth, address, medicalDetails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            p2Id, p2UserId, 'Jane', 'Smith', 'female', '9765432109', '1992-08-22', JSON.stringify({ city: 'Chennai' }), JSON.stringify({ bloodGroup: 'A+' }));

        await db.run('COMMIT');
    } catch (e) {
        await db.run('ROLLBACK');
        throw e;
    }

    console.log('\n✅ Seed completed successfully!');

};

seedData().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
