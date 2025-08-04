"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { QrCode, Key, Shield, Copy } from "lucide-react";
import { useAuth } from "./auth-context";

export function TwoFactorSetup({ onComplete }: { onComplete: () => void }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const { user, enable2FA, disable2FA } = useAuth();

  const secretKey = "JBSWY3DPEHPK3PXP"; // Mock secret key
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/MedicalApp:${user?.username}?secret=${secretKey}&issuer=MedicalApp`;

  const backupCodes = [
    "12345-67890",
    "23456-78901",
    "34567-89012",
    "45678-90123",
    "56789-01234",
  ];

  const handleToggle2FA = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    if (enabled) {
      enable2FA();
      setShowBackupCodes(true);
    } else {
      disable2FA();
      setShowBackupCodes(false);
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
            <Shield className="h-6 w-6 text-secondary-700" />
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
            />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Scan QR Code
                  </h3>
                  <div className="flex justify-center">
                    <img
                      src={qrCodeUrl || "/placeholder.svg"}
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
                        {secretKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(secretKey)}
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

              {showBackupCodes && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Backup Recovery Codes</p>
                      <p className="text-sm">
                        Save these codes in a secure location. You can use them
                        to access your account if you lose your authenticator
                        device.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {backupCodes.map((code, index) => (
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
            </div>
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
