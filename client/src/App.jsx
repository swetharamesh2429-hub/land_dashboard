import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';

// Common UI Indicators
import { TopProgressBar } from './components/common/TopProgressBar';
import { WelcomeToast } from './components/common/WelcomeToast';

// Layouts
import { OfficerLayout } from './layouts/OfficerLayout';
import { FieldLayout } from './layouts/FieldLayout';
import { CitizenLayout } from './layouts/CitizenLayout';

// Officer Features
import { OfficerDashboard } from './features/officer/OfficerDashboard';
import { OfficerMapPage } from './features/officer/OfficerMapPage';
import { OfficerAlerts } from './features/officer/OfficerAlerts';
import { OfficerSensors } from './features/officer/OfficerSensors';
import { OfficerCitizenReports } from './features/officer/OfficerCitizenReports';
import { OfficerAnalytics } from './features/officer/OfficerAnalytics';
import { OfficerAuditLogs } from './features/officer/OfficerAuditLogs';

// Field Features
import { FieldDashboard } from './features/field/FieldDashboard';

// Citizen Features
import { CitizenHome } from './features/citizen/CitizenHome';

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Initializing RAKSHA-NER Secure Gateway...
      </div>
    );
  }

  // Citizen guest access allowed for citizen routes
  if (isGuest && allowedRoles.includes('CITIZEN')) {
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDistrict, setSelectedDistrict] = useState(
    user?.jurisdiction?.districtId || 'EKH'
  );

  return (
    <>
      {/* Top of page loading progress bar (active across all routes and API calls) */}
      <TopProgressBar />

      {/* Auto-dismissing welcome toast upon authentication */}
      <WelcomeToast />

      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Officer Control Room Routes */}
        <Route
          path="/officer"
          element={
            <ProtectedRoute allowedRoles={['OFFICER', 'SUPER_ADMIN']}>
              <OfficerLayout
                selectedDistrict={selectedDistrict}
                onDistrictChange={setSelectedDistrict}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/officer/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <OfficerDashboard
                districtId={selectedDistrict}
                onNavigate={(tab) => navigate(`/officer/${tab}`)}
              />
            }
          />
          <Route path="map" element={<OfficerMapPage districtId={selectedDistrict} />} />
          <Route path="alerts" element={<OfficerAlerts districtId={selectedDistrict} />} />
          <Route path="sensors" element={<OfficerSensors districtId={selectedDistrict} />} />
          <Route path="citizen-reports" element={<OfficerCitizenReports districtId={selectedDistrict} />} />
          <Route path="analytics" element={<OfficerAnalytics />} />
          <Route path="audit" element={<OfficerAuditLogs districtId={selectedDistrict} />} />
        </Route>

        {/* Field Officer Routes */}
        <Route
          path="/field"
          element={
            <ProtectedRoute allowedRoles={['FIELD_OFFICER', 'OFFICER', 'SUPER_ADMIN']}>
              <FieldLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/field/dashboard" replace />} />
          <Route path="dashboard" element={<FieldDashboard />} />
        </Route>

        {/* Citizen Safety Routes */}
        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'FIELD_OFFICER', 'SUPER_ADMIN']}>
              <CitizenLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/citizen/home" replace />} />
          <Route path="home" element={<CitizenHome />} />
        </Route>

        {/* Root Redirection */}
        <Route
          path="*"
          element={
            user?.role === 'OFFICER' || user?.role === 'SUPER_ADMIN' ? (
              <Navigate to="/officer/dashboard" replace />
            ) : user?.role === 'FIELD_OFFICER' ? (
              <Navigate to="/field/dashboard" replace />
            ) : user?.role === 'CITIZEN' ? (
              <Navigate to="/citizen/home" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </>
  );
}
