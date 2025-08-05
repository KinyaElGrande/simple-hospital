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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Search, Plus, Pill, Calendar, User, Clock } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api, type Prescription } from "../lib/api";
import { PatientSelector } from "../components/ui/patient-selector";

export function PrescriptionManagement() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<
    Partial<Prescription & { selectedPatientId?: number }>
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
  const isPharmacist = role === "pharmacist";

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.getPrescriptions();
      if (response.data) {
        setPrescriptions(response.data);
      } else {
        setError(response.error || "Failed to load prescriptions");
      }
    } catch (error) {
      setError("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      (prescription.patientName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      prescription.medication
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      prescription.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || prescription.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddPrescription = async () => {
    if (
      formData.selectedPatientId &&
      formData.patientName &&
      formData.medication &&
      formData.dosage
    ) {
      console.log("Creating prescription with data:", {
        patientId: formData.selectedPatientId,
        doctorId: parseInt(user?.id || "0"),
        medication: formData.medication,
        dosage: formData.dosage,
        duration: formData.duration || "",
        instructions: formData.instructions || "",
        prescribedDate: new Date().toISOString().split("T")[0],
        status: "active",
      });

      try {
        const response = await api.createPrescription({
          patientId: formData.selectedPatientId,
          patientName: formData.patientName,
          medication: formData.medication,
          dosage: formData.dosage,
          frequency: formData.frequency || "",
          duration: formData.duration || "",
          instructions: formData.instructions || "",
          prescribedBy: user?.fullName || "",
          prescribedDate: new Date().toISOString().split("T")[0],
          status: "active",
          refillsRemaining: formData.refillsRemaining || 0,
        });

        console.log("Prescription API response:", response);

        if (response.data) {
          console.log("Prescription created successfully:", response.data);
          setPrescriptions([...prescriptions, response.data]);
          setFormData({});
          setIsAddDialogOpen(false);
          setError("");
        } else {
          console.log("Prescription creation failed:", response.error);
          setError(response.error || "Failed to create prescription");
        }
      } catch (error) {
        console.log("Prescription creation error:", error);
        setError("Failed to create prescription");
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

  const handleStatusChange = (
    prescriptionId: string,
    newStatus: "active" | "completed" | "cancelled",
  ) => {
    if (isPharmacist) {
      setPrescriptions(
        prescriptions.map((prescription) =>
          prescription.id === prescriptionId
            ? { ...prescription, status: newStatus }
            : prescription,
        ),
      );
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
          <h1 className="text-3xl font-bold text-gray-900">
            Prescription Management
          </h1>
          <p className="text-gray-600 mt-2">
            {isPharmacist
              ? "View and dispense prescriptions"
              : "Manage patient prescriptions"}
          </p>
        </div>
        {canCreate && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Prescription</DialogTitle>
                <DialogDescription>
                  Create a new prescription for a patient
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <PatientSelector
                    value={formData.selectedPatientId}
                    onPatientSelect={handlePatientSelect}
                    label="Patient"
                    placeholder="Select a patient..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medication">Medication *</Label>
                    <Input
                      id="medication"
                      value={formData.medication || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, medication: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage *</Label>
                    <Input
                      id="dosage"
                      value={formData.dosage || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, dosage: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={formData.frequency || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Once daily">Once daily</SelectItem>
                        <SelectItem value="Twice daily">Twice daily</SelectItem>
                        <SelectItem value="Three times daily">
                          Three times daily
                        </SelectItem>
                        <SelectItem value="Four times daily">
                          Four times daily
                        </SelectItem>
                        <SelectItem value="As needed">As needed</SelectItem>
                        <SelectItem value="Every 4 hours">
                          Every 4 hours
                        </SelectItem>
                        <SelectItem value="Every 6 hours">
                          Every 6 hours
                        </SelectItem>
                        <SelectItem value="Every 8 hours">
                          Every 8 hours
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      value={formData.frequency || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, frequency: e.target.value })
                      }
                      placeholder="e.g., Twice daily, Every 8 hours"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      placeholder="e.g., 30 days, 2 weeks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refillsRemaining">Refills Remaining</Label>
                    <Input
                      id="refillsRemaining"
                      type="number"
                      min="0"
                      max="12"
                      value={formData.refillsRemaining || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refillsRemaining:
                            Number.parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                    rows={3}
                    placeholder="Special instructions for the patient..."
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
                <Button onClick={handleAddPrescription}>
                  Create Prescription
                </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Prescriptions</CardTitle>
            <CardDescription>
              Search by patient name, medication, or prescription ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search prescriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Status</CardTitle>
            <CardDescription>
              Filter prescriptions by their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredPrescriptions.map((prescription) => (
          <Card key={prescription.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Pill className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {prescription.medication} - {prescription.dosage}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Prescription #{prescription.id} • Patient:{" "}
                      {prescription.patientName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadgeColor(prescription.status)}>
                    {prescription.status.toUpperCase()}
                  </Badge>
                  {isPharmacist && prescription.status === "active" && (
                    <Select
                      value={prescription.status}
                      onValueChange={(value) =>
                        handleStatusChange(prescription.id, value as any)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Frequency</p>
                    <p className="text-gray-600">{prescription.frequency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-gray-600">{prescription.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Prescribed by</p>
                    <p className="text-gray-600">{prescription.prescribedBy}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="font-medium text-gray-700">Prescribed Date:</p>
                  <p className="text-gray-600">{prescription.prescribedDate}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">
                    Refills Remaining:
                  </p>
                  <p className="text-gray-600">
                    {prescription.refillsRemaining}
                  </p>
                </div>
              </div>

              {prescription.instructions && (
                <div className="mt-4">
                  <p className="font-medium text-gray-700 mb-2">
                    Instructions:
                  </p>
                  <p className="text-sm text-gray-600 bg-primary-50 p-3 rounded-lg">
                    {prescription.instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No prescriptions found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No prescriptions available"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
