import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { DispatchDashboard } from "@/components/dispatch/DispatchDashboard";
import { Activity } from "lucide-react";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
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
          <svg className="w-8 h-8 text-green-600\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-4">Your order has been confirmed and is being processed.</p>
        {sessionId && (
          <p className="text-xs text-slate-400 font-mono">Session: {sessionId.slice(0, 20)}...</p>
        )}
        <a
          href="/dashboard"
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
          href="/dashboard"
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
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
          RX Expresss
        </h1>
        <p className="text-xl text-teal-100 mb-8">
          Fast & Secure Pharmacy Delivery Service
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
            data-testid="dispatch-login-btn"
          >
            Dispatch Center
          </a>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-teal-700/50 text-white rounded-xl font-semibold hover:bg-teal-700/70 transition-colors backdrop-blur border border-white/20"
            data-testid="api-docs-btn"
          >
            API Documentation
          </a>
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
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DispatchDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
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
