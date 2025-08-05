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
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Search, Plus, FileText } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api, type MedicalRecord } from "../lib/api";
import { PatientSelector } from "../components/ui/patient-selector";

export function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<
    Partial<MedicalRecord & { selectedPatientId?: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const canCreate = role === "doctor";
  const isNurse = role === "nurse";

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    setLoading(true);
    try {
      const response = await api.getMedicalRecords();
      if (response.data) {
        setRecords(response.data);
      } else {
        setError(response.error || "Failed to load medical records");
      }
    } catch (error) {
      setError("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (record) =>
      (record.patientName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddRecord = async () => {
    if (
      formData.selectedPatientId &&
      formData.patientName &&
      formData.diagnosis &&
      formData.visitDate
    ) {
      try {
        const response = await api.createMedicalRecord({
          patientId: formData.selectedPatientId,
          patientName: formData.patientName,
          visitDate: formData.visitDate,
          diagnosis: formData.diagnosis,
          symptoms: formData.symptoms || "",
          treatment: formData.treatment || "",
          medications: formData.medications || "",
          notes: formData.notes || "",
          doctorName: user?.fullName || "",
        });

        if (response.data) {
          setRecords([...records, response.data]);
          setFormData({});
          setIsAddDialogOpen(false);
          setError("");
        } else {
          setError(response.error || "Failed to create medical record");
        }
      } catch (error) {
        setError("Failed to create medical record");
      }
    }
  };

  const handlePatientSelect = (patientId: number, patientName: string) => {
    setFormData({
      ...formData,
      selectedPatientId: patientId,
      patientName: patientName,
    });
  };

  const renderRecordCard = (record: MedicalRecord) => {
    if (isNurse) {
      // Limited view for nurses
      return (
        <Card key={record.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Record #{record.id}</h3>
                  <p className="text-sm text-gray-600">
                    Patient: {record.patientName}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{record.visitDate}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Patient ID:</p>
                <p className="text-gray-600">{record.patientId}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Visit Date:</p>
                <p className="text-gray-600">{record.visitDate}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-medium text-gray-700">Diagnosis:</p>
                <p className="text-gray-600">{record.diagnosis}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Full view for doctors
    return (
      <Card key={record.id}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Record #{record.id}</h3>
                <p className="text-sm text-gray-600">
                  Patient: {record.patientName}
                </p>
              </div>
            </div>
            <Badge variant="secondary">{record.visitDate}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="font-medium text-gray-700">Diagnosis:</p>
              <p className="text-gray-600">{record.diagnosis}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Doctor:</p>
              <p className="text-gray-600">{record.doctorName}</p>
            </div>
          </div>

          {record.symptoms && (
            <div className="mb-4">
              <p className="font-medium text-gray-700 mb-1">Symptoms:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {record.symptoms}
              </p>
            </div>
          )}

          {record.treatment && (
            <div className="mb-4">
              <p className="font-medium text-gray-700 mb-1">Treatment:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {record.treatment}
              </p>
            </div>
          )}

          {record.medications && (
            <div className="mb-4">
              <p className="font-medium text-gray-700 mb-1">Medications:</p>
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                {record.medications}
              </p>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="font-medium text-gray-700 mb-1">Notes:</p>
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                {record.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600 mt-2">
            {isNurse
              ? "View patient medical records (limited access)"
              : "Manage patient medical records"}
          </p>
        </div>
        {canCreate && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medical Record</DialogTitle>
                <DialogDescription>
                  Create a new medical record for a patient
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <PatientSelector
                      value={formData.selectedPatientId?.toString()}
                      onPatientSelect={handlePatientSelect}
                      label="Patient"
                      placeholder="Select a patient..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitDate">Visit Date *</Label>
                    <Input
                      id="visitDate"
                      type="date"
                      value={formData.visitDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, visitDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis *</Label>
                  <Input
                    id="diagnosis"
                    value={formData.diagnosis || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    value={formData.symptoms || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, symptoms: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatment">Treatment</Label>
                  <Textarea
                    id="treatment"
                    value={formData.treatment || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, treatment: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medications">Medications</Label>
                  <Textarea
                    id="medications"
                    value={formData.medications || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, medications: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddRecord}>Add Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Record Search</CardTitle>
          <CardDescription>
            Search medical records by patient name, diagnosis, or record ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">{filteredRecords.map(renderRecordCard)}</div>

      {filteredRecords.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No records found
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Try adjusting your search terms"
                : "No medical records available"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
