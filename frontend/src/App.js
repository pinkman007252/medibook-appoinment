import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PatientDashboard from './components/Patient/PatientDashboard';
import DoctorSearch from './components/Patient/DoctorSearch';
import AppointmentHistory from './components/Patient/AppointmentHistory';
import PatientProfile from './components/Patient/PatientProfile';
import DoctorDashboard from './components/Doctor/DoctorDashboard';
import ScheduleManager from './components/Doctor/ScheduleManager';
import DoctorProfile from './components/Doctor/DoctorProfile';
import './App.css';

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-container"><div className="spinner" /><p className="loading-text">Loading...</p></div>;
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-container"><div className="spinner" /></div>;
    if (user) return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
    return children;
};

const AppRoutes = () => {
    const { user } = useAuth();
    return (
        <>
            <Navbar />
            <div className="page-wrapper">
                <Routes>
                    <Route path="/" element={<Navigate to={user ? (user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard') : '/login'} replace />} />
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                    {/* Patient Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
                    <Route path="/search-doctors" element={<ProtectedRoute role="patient"><DoctorSearch /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute role="patient"><AppointmentHistory /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute role="patient"><PatientProfile /></ProtectedRoute>} />

                    {/* Doctor Routes */}
                    <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor"><ScheduleManager /></ProtectedRoute>} />
                    <Route path="/doctor/profile" element={<ProtectedRoute role="doctor"><DoctorProfile /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
