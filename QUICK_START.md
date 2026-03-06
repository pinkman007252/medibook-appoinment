# MediBook - Doctor Appointment Management System
## Quick Start Guide

---

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally OR MongoDB Atlas connection string
- Git (optional)

---

## Step 1: Install Backend Dependencies
```powershell
cd d:\mikeyxzx\backend
npm install
```

## Step 2: Configure Database
Edit `backend/.env` and update `MONGO_URI` if needed:
```
MONGO_URI=mongodb://localhost:27017/doctor_appointment
```
For MongoDB Atlas: `MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/doctor_appointment`

## Step 3: Seed Sample Data
```powershell
npm run seed
```
This creates 4 doctors and 2 patients with login credentials.

## Step 4: Start Backend Server
```powershell
npm start
# Server runs at http://localhost:5000
```

## Step 5: Install Frontend Dependencies
Open a **new** terminal window:
```powershell
cd d:\mikeyxzx\frontend
npm install
```

## Step 6: Start Frontend
```powershell
npm start
# App runs at http://localhost:3000
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 👤 Patient | john.doe@email.com | password123 |
| 👤 Patient | jane.smith@email.com | password123 |
| 🩺 Cardiologist | sarah.kumar@hospital.com | password123 |
| 🧠 Neurologist | raj.patel@hospital.com | password123 |
| 💆 Dermatologist | priya.nair@hospital.com | password123 |
| 🦴 Orthopedist | vikram.singh@hospital.com | password123 |

---

## API Base URL: http://localhost:5000/api
