import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin access all protected routes
  if (user.role === 'admin') {
    return children;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to default dashboard per role
    if (user.role === 'citizen') {
      return <Navigate to="/citizen/dashboard" replace />;
    } else {
      return <Navigate to="/officer/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
