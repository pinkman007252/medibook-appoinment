CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('patient', 'doctor', 'admin')) NOT NULL,
    isActive INTEGER DEFAULT 1,
    lastLogin TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    userId TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dateOfBirth TEXT,
    gender TEXT,
    phone TEXT UNIQUE NOT NULL,
    address TEXT, -- JSON string
    medicalDetails TEXT, -- JSON string
    totalVisits INTEGER DEFAULT 0,
    lastVisitDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    userId TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT,
    experience INTEGER,
    phone TEXT UNIQUE NOT NULL,
    licenseNumber TEXT UNIQUE,
    diseasesExpertise TEXT, -- JSON string
    consultationFee REAL,
    bio TEXT,
    ratingAverage REAL DEFAULT 0,
    ratingTotal INTEGER DEFAULT 0,
    isAvailable INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    doctorId TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    shifts TEXT, -- JSON string
    effectiveFrom TEXT,
    effectiveUntil TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    doctorId TEXT NOT NULL,
    appointmentDate TEXT NOT NULL,
    timeSlotStart TEXT NOT NULL,
    timeSlotEnd TEXT NOT NULL,
    tokenNumber TEXT UNIQUE,
    queuePosition INTEGER,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')) DEFAULT 'pending',
    reason TEXT,
    notes TEXT,
    doctorNotes TEXT,
    prescription TEXT, -- JSON string
    cancellationReason TEXT,
    cancelledBy TEXT,
    cancelledAt TEXT,
    completedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    doctorId TEXT NOT NULL,
    date TEXT NOT NULL,
    currentTokenNumber INTEGER DEFAULT 0,
    totalTokensIssued INTEGER DEFAULT 0,
    tokensCompleted INTEGER DEFAULT 0,
    tokensActive INTEGER DEFAULT 0,
    tokensCancelled INTEGER DEFAULT 0,
    lastIssuedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE(doctorId, date)
);
