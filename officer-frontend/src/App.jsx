import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { AuthorityViewProvider } from './context/AuthorityViewContext';
import { DemoClockProvider } from './context/DemoClockContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import OfficerNavbar from './components/OfficerNavbar';
import OfficerSidebar from './components/OfficerSidebar';

import OfficerLoginPage from './pages/OfficerLoginPage';
import OfficerRegisterPage from './pages/OfficerRegisterPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OfficerIncidentDetailPage from './pages/OfficerIncidentDetailPage';
import OfficerNotificationsPage from './pages/OfficerNotificationsPage';
import OfficerProfilePage from './pages/OfficerProfilePage';

const OfficerLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#F0F8F5]">
      <OfficerSidebar />
      <div className="flex-1 flex flex-col min-w-0 md:pl-[240px] overflow-hidden">
        <OfficerNavbar />
        <main className="flex-1 p-3 sm:p-4 lg:p-5 w-full">{children}</main>
      </div>
    </div>
  );
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-[#0B63E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/officer/dashboard" replace />;
  }

  return <Navigate to="/officer/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AuthorityViewProvider>
          <DemoClockProvider>
            <BrowserRouter>
              <Routes>
              {/* Public Officer Auth */}
              <Route path="/officer/login" element={<OfficerLoginPage />} />
              <Route path="/officer/register" element={<OfficerRegisterPage />} />

              {/* Protected Officer Routes */}
              <Route
                path="/officer/dashboard"
                element={
                  <ProtectedRoute>
                    <OfficerLayout>
                      <OfficerDashboardPage />
                    </OfficerLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/officer/incidents"
                element={
                  <ProtectedRoute>
                    <OfficerLayout>
                      <OfficerDashboardPage />
                    </OfficerLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/officer/incidents/:incidentId"
                element={
                  <ProtectedRoute>
                    <OfficerLayout>
                      <ErrorBoundary>
                        <OfficerIncidentDetailPage />
                      </ErrorBoundary>
                    </OfficerLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/officer/notifications"
                element={
                  <ProtectedRoute>
                    <OfficerLayout>
                      <OfficerNotificationsPage />
                    </OfficerLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/officer/profile"
                element={
                  <ProtectedRoute>
                    <OfficerLayout>
                      <OfficerProfilePage />
                    </OfficerLayout>
                  </ProtectedRoute>
                }
              />

              {/* Default Catch-all Redirect */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </DemoClockProvider>
      </AuthorityViewProvider>
    </RealtimeProvider>
  </AuthProvider>
  );
}

export default App;
