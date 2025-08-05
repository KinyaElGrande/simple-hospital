"use client";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { Users, FileText, Pill, UserCog, Home, Shield } from "lucide-react";
import { useAuth } from "../components/auth-context";
import type { SidebarProps, ActiveSection } from "../components/dashboard";
import { useEffect, useState } from "react";

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user } = useAuth();

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

  const getNavigationItems = () => {
    const items = [
      {
        id: "dashboard" as ActiveSection,
        label: "Dashboard",
        icon: Home,
        roles: ["admin", "doctor", "nurse", "pharmacist"],
      },
    ];

    if (role === "admin") {
      items.push({
        id: "users" as ActiveSection,
        label: "User Management",
        icon: UserCog,
        roles: ["admin"],
      });
    }

    if (role === "doctor" || role === "nurse") {
      items.push({
        id: "patients" as ActiveSection,
        label: "Patients",
        icon: Users,
        roles: ["doctor", "nurse"],
      });
      items.push({
        id: "records" as ActiveSection,
        label: "Medical Records",
        icon: FileText,
        roles: ["doctor", "nurse"],
      });
    }

    if (role === "doctor" || role === "pharmacist") {
      items.push({
        id: "prescriptions" as ActiveSection,
        label: "Prescriptions",
        icon: Pill,
        roles: ["doctor", "pharmacist"],
      });
    }

    return items.filter((item) => item.roles.includes(role || ""));
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="w-64 bg-white shadow-lg border-r">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">MedPortal</h1>
            <p className="text-sm text-gray-600">Healthcare System</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                activeSection === item.id &&
                  "bg-primary text-white hover:bg-primary-700",
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
