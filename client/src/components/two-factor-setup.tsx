"use client";

import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import { QrCode, Key, Hospital, Copy } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api } from "../lib/api";

export function TwoFactorSetup({ onComplete }: { onComplete: () => void }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [setupData, setSetupData] = useState<{
    secretKey: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { enable2FA, disable2FA } = useAuth();

  useEffect(() => {
    // Load 2FA setup data when component mounts
    loadSetupData();
  }, []);

  const loadSetupData = async () => {
    try {
      const response = await api.getTwoFASetup();
      if (response.data) {
        setSetupData(response.data);
      }
    } catch (err) {
      console.error("Failed to load 2FA setup:", err);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (enabled && !twoFactorEnabled) {
      // Enabling 2FA - need verification code
      if (!verificationCode) {
        setError(
          "Please enter the verification code from your authenticator app",
        );
        return;
      }

      setLoading(true);
      try {
        const response = await api.enableTwoFA(
          verificationCode,
          setupData?.secretKey,
        );
        if (response.data) {
          setTwoFactorEnabled(true);
          enable2FA();
          setShowBackupCodes(true);
          setSetupData((prev) =>
            prev ? { ...prev, backupCodes: response.data!.backupCodes } : null,
          );
          setError("");
        } else {
          setError(response.error || "Failed to enable 2FA");
        }
      } catch (error) {
        setError("Failed to enable 2FA");
      } finally {
        setLoading(false);
      }
    } else if (!enabled && twoFactorEnabled) {
      // Disabling 2FA
      setLoading(true);
      try {
        await api.disableTwoFA();
        setTwoFactorEnabled(false);
        disable2FA();
        setShowBackupCodes(false);
        setError("");
      } catch {
        setError("Failed to disable 2FA");
      } finally {
        setLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100">
            <Hospital className="h-6 w-6 text-secondary-700" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Enhance your account security with 2FA (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="2fa-toggle" className="text-base font-medium">
                Enable Two-Factor Authentication
              </Label>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              id="2fa-toggle"
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {setupData && !twoFactorEnabled && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Scan QR Code
                  </h3>
                  <div className="flex justify-center">
                    <img
                      src={
                        setupData.qrCodeUrl ||
                        "/placeholder.svg?height=200&width=200"
                      }
                      alt="2FA QR Code"
                      className="border rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Scan with Google Authenticator or similar app
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Manual Entry
                  </h3>
                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                        {setupData.secretKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(setupData.secretKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Enter this key manually if you can't scan the QR code
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Enter 6-digit code from your app"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app to enable
                  2FA
                </p>
              </div>
            </div>
          )}

          {showBackupCodes && setupData?.backupCodes && (
            <Alert>
              <Hospital className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Backup Recovery Codes</p>
                  <p className="text-sm">
                    Save these codes in a secure location. You can use them to
                    access your account if you lose your authenticator device.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {setupData.backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="p-2 bg-gray-100 rounded text-sm font-mono"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onComplete}>
              Skip for Now
            </Button>
            <Button onClick={onComplete}>Continue to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
