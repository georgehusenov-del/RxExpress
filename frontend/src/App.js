import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { DispatchDashboard } from "@/components/dispatch/DispatchDashboard";
import { PharmacyDashboard } from "@/components/pharmacy/PharmacyDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { PublicTrackingPage } from "@/components/tracking/PublicTrackingPage";
import { Activity, Truck } from "lucide-react";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Activity className="w-12 h-12 text-teal-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'pharmacy') {
      return <Navigate to="/pharmacy" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// Payment Success Page
const PaymentSuccess = () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-4">Your order has been confirmed and is being processed.</p>
        {sessionId && (
          <p className="text-xs text-slate-400 font-mono">Session: {sessionId.slice(0, 20)}...</p>
        )}
        <a
          href="/pharmacy"
          className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

// Payment Cancel Page
const PaymentCancel = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Payment Cancelled</h1>
        <p className="text-slate-600 mb-4">Your payment was cancelled. You can try again when you're ready.</p>
        <a
          href="/pharmacy"
          className="inline-block mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
};

// Home Page (Landing)
const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
          <Truck className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl md:text-6xl font-heading font-bold text-white mb-4">
          RX Expresss
        </h1>
        <p className="text-xl text-teal-100 mb-2 max-w-xl">
          Fast & Secure Pharmacy Delivery
        </p>
        <p className="text-teal-200 mb-8 max-w-lg">
          Same-day and next-day prescription delivery with real-time tracking, 
          electronic signatures, and photo proof of delivery.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="/login"
            className="px-8 py-4 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg text-lg"
            data-testid="pharmacy-portal-btn"
          >
            Pharmacy Portal
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-teal-700/50 text-white rounded-xl font-semibold hover:bg-teal-700/70 transition-colors backdrop-blur border border-white/20"
            data-testid="api-docs-btn"
          >
            API Documentation
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Same-Day Delivery</h3>
            <p className="text-teal-200 text-sm">Order by 2PM for same-day delivery</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">HIPAA Compliant</h3>
            <p className="text-teal-200 text-sm">Secure handling of all prescriptions</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Real-Time Tracking</h3>
            <p className="text-teal-200 text-sm">Track your delivery every step of the way</p>
          </div>
        </div>

        <p className="text-sm text-teal-200 mt-12">
          Powered by RX Expresss Technology • www.rxexpresss.com
        </p>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/track/:trackingNumber" element={<PublicTrackingPage />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      
      {/* Pharmacy Portal */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={['pharmacy', 'admin']}>
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Legacy Dispatch Dashboard (redirect to admin for admins) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'pharmacy']}>
            <DispatchDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect /dispatch to /dashboard */}
      <Route path="/dispatch" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
