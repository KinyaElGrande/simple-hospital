"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  LogOut,
  Hospital,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Home,
} from "lucide-react";
import { logoutService, LogoutOptions } from "../services/logout.service";

interface LogoutPageProps {
  onComplete?: () => void;
  redirectUrl?: string;
}

type LogoutStep = "selection" | "processing" | "complete" | "error";

interface LogoutMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
  warning?: string;
  securityLevel: "standard" | "high" | "maximum";
}

export function LogoutPage({
  onComplete,
  redirectUrl = "/login",
}: LogoutPageProps) {
  const [currentStep, setCurrentStep] = useState<LogoutStep>("selection");
  const [selectedMethod, setSelectedMethod] = useState<string>("basic");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoutResult, setLogoutResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(5);

  const logoutMethods: LogoutMethod[] = [
    {
      id: "basic",
      name: "Standard Logout",
      description:
        "Normal logout that clears your session and browser authentication. Suitable for personal devices.",
      icon: <LogOut className="h-5 w-5" />,
      recommended: true,
      securityLevel: "standard",
    },
    {
      id: "soft",
      name: "Quick Logout",
      description:
        "Fast logout with minimal cleanup. Some data may remain cached in your browser.",
      icon: <RefreshCw className="h-5 w-5" />,
      securityLevel: "standard",
    },
    {
      id: "force",
      name: "Secure Logout",
      description:
        "Complete logout that aggressively clears all browser data including cache, cookies, and storage.",
      icon: <Hospital className="h-5 w-5" />,
      warning:
        "This will clear all browser data for this site. Use on shared computers.",
      securityLevel: "maximum",
    },
    {
      id: "clear",
      name: "Clear Authentication",
      description:
        "Modern logout using browser APIs to clear site data. Good balance of security and convenience.",
      icon: <AlertTriangle className="h-5 w-5" />,
      securityLevel: "high",
    },
  ];

  // Countdown effect for auto-redirect
  useEffect(() => {
    if (currentStep === "complete" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === "complete" && countdown === 0) {
      handleRedirect();
    }
  }, [currentStep, countdown]);

  const handleLogout = async () => {
    setIsProcessing(true);
    setCurrentStep("processing");
    setError("");

    try {
      const options: LogoutOptions = {
        method: selectedMethod as any,
        clearLocalData: true,
        redirectUrl: redirectUrl,
        showInstructions: false, // We'll handle instructions in the UI
      };

      const result = await logoutService.logout(options);
      setLogoutResult(result);
      setCurrentStep("complete");

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Logout error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during logout",
      );
      setCurrentStep("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmergencyLogout = () => {
    logoutService.emergencyLogout();
  };

  const handleRedirect = () => {
    window.location.href = redirectUrl;
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case "standard":
        return "text-blue-600 bg-blue-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "maximum":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const renderSelection = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <LogOut className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Logout from Hospital System
        </CardTitle>
        <CardDescription>
          Choose your preferred logout method based on your security needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {logoutMethods.map((method) => (
            <div
              key={method.id}
              className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                selectedMethod === method.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">{method.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <span>{method.name}</span>
                      {method.recommended && (
                        <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Recommended
                        </span>
                      )}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getSecurityLevelColor(method.securityLevel)}`}
                    >
                      {method.securityLevel.charAt(0).toUpperCase() +
                        method.securityLevel.slice(1)}{" "}
                      Security
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {method.description}
                  </p>
                  {method.warning && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      ⚠️ {method.warning}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedMethod === method.id
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedMethod === method.id && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleEmergencyLogout}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Logout
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button onClick={handleLogout} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessing = () => (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium">Logging you out...</h3>
          <p className="text-sm text-gray-600">
            Please wait while we securely clear your session and data.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: "100%" }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderComplete = () => (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">Logout Successful</h3>
          <p className="text-sm text-gray-600">
            You have been successfully logged out from the Hospital Management
            System.
          </p>

          {logoutResult?.instructions && (
            <Alert>
              <Hospital className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Additional Security Steps:</p>
                  {Object.entries(logoutResult.instructions).map(
                    ([key, value]) => (
                      <p key={key} className="text-xs">
                        • {value}
                      </p>
                    ),
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4">
            <p className="text-sm text-gray-600 mb-4">
              Redirecting to login page in {countdown} seconds...
            </p>
            <div className="space-x-2">
              <Button onClick={handleRedirect} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Login Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderError = () => (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium">Logout Error</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              There was an issue with the logout process, but your local data
              has been cleared for security.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="pt-4 space-y-2">
            <Button onClick={handleRedirect} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Continue to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentStep("selection")}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-4xl">
        {currentStep === "selection" && renderSelection()}
        {currentStep === "processing" && renderProcessing()}
        {currentStep === "complete" && renderComplete()}
        {currentStep === "error" && renderError()}

        {currentStep === "selection" && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              For maximum security on shared computers, use "Secure Logout" and
              close your browser completely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogoutPage;
