"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PatientManagement } from "./patient-management";
import { MedicalRecords } from "./medical-records";
import { PrescriptionManagement } from "./prescription-management";
import { UserManagement } from "./user-management";
import { DashboardHome } from "./dashboard-home";

export type ActiveSection =
  | "dashboard"
  | "patients"
  | "records"
  | "prescriptions"
  | "users";

export function Dashboard() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("dashboard");

  const renderContent = () => {
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
