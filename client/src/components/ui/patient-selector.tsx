"use client";

import { useState, useEffect } from "react";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Alert, AlertDescription } from "./alert";
import { api, type Patient } from "../../lib/api";

interface PatientSelectorProps {
  value?: string;
  onPatientSelect: (patientId: number, patientName: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PatientSelector({
  value,
  onPatientSelect,
  label = "Patient",
  placeholder = "Select a patient...",
  required = false,
  disabled = false,
}: PatientSelectorProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError("");

      const response = await api.getPatients();

      if (response.data) {
        setPatients(response.data);
      } else if (response.error) {
        setError(response.error);
      }

      setLoading(false);
    };

    fetchPatients();
  }, []);

  const handlePatientChange = (patientId: string) => {
    const selectedPatient = patients.find((p) => p.id.toString() === patientId);
    if (selectedPatient) {
      const fullName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
      onPatientSelect(selectedPatient.id, fullName);
    }
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && "*"}
        </Label>
        <Alert>
          <AlertDescription>Failed to load patients: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="patient-selector">
        {label} {required && "*"}
      </Label>
      <Select
        value={value}
        onValueChange={handlePatientChange}
        disabled={disabled || loading}
      >
        <SelectTrigger id="patient-selector">
          <SelectValue
            placeholder={loading ? "Loading patients..." : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {patients.map((patient) => (
            <SelectItem key={patient.id} value={patient.id.toString()}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {patient.firstName} {patient.lastName}
                </span>
                <span className="text-sm text-gray-500">
                  DOB: {patient.dateOfBirth} | Phone: {patient.phone}
                </span>
              </div>
            </SelectItem>
          ))}
          {patients.length === 0 && !loading && (
            <SelectItem value="" disabled>
              No patients found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
