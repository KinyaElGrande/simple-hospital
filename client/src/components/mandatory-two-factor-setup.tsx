"use client";

import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Hospital, Copy, Check, AlertTriangle, QrCode } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api } from "../lib/api";

interface TwoFactorSetupData {
  secretKey: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export function MandatoryTwoFactorSetup() {
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"setup" | "verify" | "backup">(
    "setup",
  );
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const { user, enable2FA } = useAuth();

  useEffect(() => {
    loadSetupData();
  }, []);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const response = await api.getTwoFASetup();
      if (response.data) {
        setSetupData(response.data);
      } else {
        setError(response.error || "Failed to load 2FA setup data");
      }
    } catch (error) {
      console.error("Failed to load 2FA setup:", error);
      setError("Failed to load 2FA setup data");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secretKey) {
      try {
        await navigator.clipboard.writeText(setupData.secretKey);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData?.backupCodes) {
      try {
        const codesText = setupData.backupCodes.join("\n");
        await navigator.clipboard.writeText(codesText);
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      } catch (err) {
        console.error("Failed to copy backup codes:", err);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError(
        "Please enter the verification code from your authenticator app",
      );
      return;
    }

    if (verificationCode.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.enableTwoFA(verificationCode);
      if (response.data) {
        enable2FA();
        setSetupData((prev) =>
          prev ? { ...prev, backupCodes: response.data!.backupCodes } : null,
        );
        setCurrentStep("backup");
      } else {
        setError(
          response.error || "Invalid verification code. Please try again.",
        );
      }
    } catch (error) {
      console.error("Failed to enable 2FA:", error);
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = () => {
    // This will trigger a re-render of the main app which should now show the dashboard
    window.location.reload();
  };

  const handleContinueToVerify = () => {
    if (!setupData) {
      setError("Setup data not loaded. Please refresh the page.");
      return;
    }
    setCurrentStep("verify");
  };

  if (loading && !setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 2FA setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Hospital className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Security Setup Required
          </CardTitle>
          <CardDescription className="text-base mt-2">
            To protect sensitive medical data, all users must enable Two-Factor
            Authentication. This adds an extra layer of security to your
            account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Setup */}
          {currentStep === "setup" && setupData && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Install an Authenticator App
                    </h3>
                    <p className="text-blue-800 text-sm mb-3">
                      Download and install an authenticator app on your phone:
                    </p>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• Google Authenticator (iOS/Android)</li>
                      <li>• Microsoft Authenticator (iOS/Android)</li>
                      <li>• Authy (iOS/Android)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Scan QR Code or Enter Secret Key
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-green-800 text-sm mb-3">
                          Scan this QR code:
                        </p>
                        <div className="flex justify-center">
                          <img
                            src={
                              setupData.qrCodeUrl ||
                              "/placeholder.svg?height=200&width=200"
                            }
                            alt="2FA QR Code"
                            className="border rounded-lg bg-white p-2"
                            width={200}
                            height={200}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-green-800 text-sm mb-3">
                          Or enter this secret key manually:
                        </p>
                        <div className="bg-white border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-sm font-mono break-all text-gray-800">
                              {setupData.secretKey}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopySecret}
                              className="shrink-0"
                            >
                              {copiedSecret ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleContinueToVerify} size="lg">
                  Continue to Verification
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Verify */}
          {currentStep === "verify" && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      Verify Setup
                    </h3>
                    <p className="text-orange-800 text-sm">
                      Enter the 6-digit code from your authenticator app to
                      complete setup:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setVerificationCode(value);
                    }}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="off"
                  />
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code shown in your authenticator app
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("setup")}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyCode}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? "Verifying..." : "Verify & Enable 2FA"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {currentStep === "backup" && setupData?.backupCodes && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      Important: Save Your Backup Codes
                    </h3>
                    <p className="text-red-800 text-sm">
                      These backup codes can be used to access your account if
                      you lose your phone. Save them in a secure location - you
                      won't be able to see them again.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Backup Codes</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBackupCodes}
                  >
                    {copiedBackupCodes ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {setupData.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="bg-white border rounded px-3 py-2 text-center"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Alert>
                <Hospital className="h-4 w-4" />
                <AlertDescription>
                  <strong>2FA has been successfully enabled!</strong> Your
                  account is now protected with two-factor authentication. Make
                  sure to save your backup codes before proceeding.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleCompleteSetup} size="lg">
                  Complete Setup & Continue
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
