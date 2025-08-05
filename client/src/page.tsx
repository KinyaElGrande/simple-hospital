"use client";
import { LoginPage } from "./components/login-page";
import { Dashboard } from "./components/dashboard";
import { MandatoryTwoFactorSetup } from "./components/mandatory-two-factor-setup";
import { AuthProvider, useAuth } from "./components/auth-context";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is logged in but doesn't have 2FA enabled, show mandatory setup
  if (user && !user.twoFactorEnabled) {
    return <MandatoryTwoFactorSetup />;
  }

  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
