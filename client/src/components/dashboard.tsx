"use client";

import { useState } from "react";
import { Sidebar } from "../components/sidebar";
import { Header } from "../components/header";
import { DashboardHome } from "../components/dashboard-home";
import { PatientManagement } from "../components/patient-management";
import { MedicalRecords } from "../components/medical-records";
import { PrescriptionManagement } from "../components/prescription-management";
import { UserManagement } from "../components/user-management";

export type ActiveSection =
  | "dashboard"
  | "patients"
  | "records"
  | "prescriptions"
  | "users";

export interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export function Dashboard() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("dashboard");

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardHome />;
      case "patients":
        return <PatientManagement />;
      case "records":
        return <MedicalRecords />;
      case "prescriptions":
        return <PrescriptionManagement />;
      case "users":
        return <UserManagement />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 p-6 overflow-auto">{renderSection()}</main>
      </div>
    </div>
  );
}
