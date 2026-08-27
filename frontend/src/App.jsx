import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import ProtectedRoute from './components/ProtectedRoute';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import CitizenDashboard from './pages/CitizenDashboard';
import SubmitReportPage from './pages/SubmitReportPage';
import MyReportsPage from './pages/MyReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';

import OfficerDashboard from './pages/OfficerDashboard';
import IncidentDetailPage from './pages/IncidentDetailPage';

import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsHeatmapPage from './pages/AnalyticsHeatmapPage';

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout flex min-h-screen bg-[#F7FBF8]">
      <Sidebar />
      <div className="app-main-wrapper flex-1 flex flex-col min-w-0 md:pl-[230px]">
        <Navbar />
        <main className="app-content flex-1 p-3 sm:p-5 md:p-6 pb-20 md:pb-8 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7F5]">
        <div className="w-8 h-8 border-2 border-[#184E38] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (['ward_officer', 'aee', 'commissioner', 'admin'].includes(user.role)) {
    return <Navigate to="/officer/dashboard" replace />;
  }

  return <Navigate to="/citizen/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            {/* Public Splash & Auth Routes */}
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Root Navigation Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Citizen Routes */}
            <Route
              path="/citizen/dashboard"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <AppLayout>
                    <CitizenDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/submit-report"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <AppLayout>
                    <SubmitReportPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/my-reports"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <AppLayout>
                    <MyReportsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/reports/:reportId"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <AppLayout>
                    <ReportDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Officer Routes */}
            <Route
              path="/officer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ward_officer', 'aee', 'commissioner']}>
                  <AppLayout>
                    <OfficerDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/incidents"
              element={
                <ProtectedRoute allowedRoles={['ward_officer', 'aee', 'commissioner']}>
                  <AppLayout>
                    <OfficerDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/incidents/:incidentId"
              element={
                <ProtectedRoute allowedRoles={['ward_officer', 'aee', 'commissioner']}>
                  <AppLayout>
                    <IncidentDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Shared Authenticated Routes */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NotificationsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Analytics & Geographic Heatmap Route */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['ward_officer', 'aee', 'commissioner', 'admin']}>
                  <AppLayout>
                    <AnalyticsHeatmapPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Management Route */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout>
                    <AdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
