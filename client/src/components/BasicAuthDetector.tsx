"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { KeyRound, Hospital } from "lucide-react";

interface BasicAuthDetectorProps {
  onTransitionComplete?: (sessionId: string) => void;
  onCancel?: () => void;
}

export function BasicAuthDetector({
  onTransitionComplete,
  onCancel,
}: BasicAuthDetectorProps) {
  const [twoFACode, setTwoFACode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempSessionId, setTempSessionId] = useState("");
  const [showTransition, setShowTransition] = useState(false);

  // Check if we have a basic-auth session that needs transition
  useEffect(() => {
    const checkForBasicAuthSession = () => {
      const sessionData = localStorage.getItem("medical-app-session");
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (
            session.sessionId === "basic-auth" ||
            session.sessionId === "basic-auth-2fa"
          ) {
            // We have a basic auth session, check if user has credentials
            const credentials = localStorage.getItem("medical-app-credentials");
            if (credentials) {
              setShowTransition(true);
              initiateTransition();
            }
          }
        } catch (e) {
          console.error("Error parsing session data:", e);
        }
      }
    };

    // Check for X-2FA-Session-ID header scenario
    const checkHeaderScenario = () => {
      // This would be called when the component receives a signal that
      // X-2FA-Session-ID header contains "basic-auth"
      const sessionHeader = sessionStorage.getItem("x-2fa-session-id");
      if (sessionHeader === "basic-auth") {
        setShowTransition(true);
        initiateTransition();
      }
    };

    checkForBasicAuthSession();
    checkHeaderScenario();
  }, []);

  const initiateTransition = async () => {
    setError("");
    setLoading(true);

    try {
      const credentials = JSON.parse(
        localStorage.getItem("medical-app-credentials") || "{}",
      );

      if (!credentials.username || !credentials.password) {
        setError("No credentials found. Please login again.");
        setLoading(false);
        return;
      }

      console.log(
        "Initiating basic-auth to 2FA transition for user:",
        credentials.username,
      );

      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/transition",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      console.log("Transition response:", data);

      if (response.ok && data.success && data.requires2FA) {
        setTempSessionId(data.tempSessionId);
        setError("");
        console.log("2FA session created:", data.tempSessionId);
      } else if (response.ok && data.success && !data.requires2FA) {
        // User doesn't have 2FA enabled, complete transition
        setError("");
        setShowTransition(false);
        if (onTransitionComplete) {
          onTransitionComplete("basic-auth-verified");
        }
      } else {
        setError(data.message || "Failed to create 2FA session");
      }
    } catch (err) {
      console.error("Transition error:", err);
      setError("Failed to initiate 2FA transition. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Verifying 2FA code with session:", tempSessionId);

      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: tempSessionId,
            code: twoFACode,
          }),
        },
      );

      const data = await response.json();
      console.log("2FA verification response:", data);

      if (response.ok && data.success) {
        // Update session data
        const sessionData = {
          sessionId: tempSessionId,
          authenticated: true,
          requires2FA: false,
        };

        localStorage.setItem(
          "medical-app-session",
          JSON.stringify(sessionData),
        );
        setShowTransition(false);

        if (onTransitionComplete) {
          onTransitionComplete(tempSessionId);
        }
      } else {
        setError(data.message || "Invalid 2FA code. Please try again.");
      }
    } catch (err) {
      console.error("2FA verification error:", err);
      setError("2FA verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowTransition(false);
    // Clear the basic-auth session
    localStorage.removeItem("medical-app-session");
    localStorage.removeItem("medical-app-credentials");
    if (onCancel) {
      onCancel();
    }
  };

  // Only show if we need to transition
  if (!showTransition) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Hospital className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold">
            Two-Factor Authentication Required
          </CardTitle>
          <CardDescription>
            {tempSessionId
              ? "Enter the 6-digit code from your authenticator app"
              : "Setting up secure session..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tempSessionId ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFACode">Authentication Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="twoFACode"
                    type="text"
                    placeholder="123456"
                    value={twoFACode}
                    onChange={(e) =>
                      setTwoFACode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className="pl-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || twoFACode.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel & Logout
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">
                  {loading
                    ? "Creating secure session..."
                    : "Preparing 2FA verification"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to trigger the detector programmatically
export function useBasicAuthDetector() {
  const [shouldShow, setShouldShow] = useState(false);

  const triggerTransition = (sessionId?: string) => {
    if (sessionId === "basic-auth") {
      // Store the session ID for the detector to pick up
      sessionStorage.setItem("x-2fa-session-id", "basic-auth");
      setShouldShow(true);
    }
  };

  const handleComplete = () => {
    setShouldShow(false);
    sessionStorage.removeItem("x-2fa-session-id");
  };

  const handleCancel = () => {
    setShouldShow(false);
    sessionStorage.removeItem("x-2fa-session-id");
  };

  return {
    shouldShow,
    triggerTransition,
    handleComplete,
    handleCancel,
  };
}
