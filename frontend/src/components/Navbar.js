import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    const getInitials = () => {
        if (!profile) return '?';
        return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-brand">
                    <div className="navbar-logo">🏥</div>
                    <span className="navbar-name">MediBook</span>
                </NavLink>

                {user && (
                    <>
                        <div className="navbar-links">
                            {user.role === 'patient' ? (
                                <>
                                    <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
                                    <NavLink to="/search-doctors" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Find Doctors</NavLink>
                                    <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Appointments</NavLink>
                                    <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Profile</NavLink>
                                </>
                            ) : (
                                <>
                                    <NavLink to="/doctor/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
                                    <NavLink to="/doctor/schedule" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Schedule</NavLink>
                                    <NavLink to="/doctor/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Profile</NavLink>
                                </>
                            )}
                        </div>
                        <div className="navbar-user">
                            <div className="user-badge">
                                <div className="user-avatar-sm">{getInitials()}</div>
                                <span>{profile?.firstName || 'User'}</span>
                                <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.7 }}>• {user.role}</span>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
                        </div>
                    </>
                )}

                {!user && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>Login</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Register</button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
