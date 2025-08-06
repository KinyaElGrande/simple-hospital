"use client";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { LogOut, User, Hospital } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { useState, useEffect } from "react";

export function Header() {
  const { user, logout } = useAuth();

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      assignRoleBasedOnUsername(user.username);
    }
  }, [user]);

  function assignRoleBasedOnUsername(userName: string) {
    if (userName.startsWith("doc")) {
      setRole("doctor");
    } else if (userName.startsWith("nrs")) {
      setRole("nurse");
    } else if (userName.startsWith("pha")) {
      setRole("pharmacist");
    } else if (userName.startsWith("adm")) {
      setRole("admin");
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "doctor":
        return "bg-primary-100 text-primary-800";
      case "nurse":
        return "bg-secondary-100 text-secondary-800";
      case "pharmacist":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.fullName}
          </h2>
          <p className="text-sm text-gray-600">
            Manage your healthcare operations securely
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">{user?.username}</span>
            <Badge className={getRoleBadgeColor(role || "")}>
              {role?.toUpperCase()}
            </Badge>
            {user?.twoFactorEnabled && (
              <Hospital
                className="h-4 w-4 text-secondary-600"
                title="2FA Enabled"
              />
            )}
          </div>

          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
