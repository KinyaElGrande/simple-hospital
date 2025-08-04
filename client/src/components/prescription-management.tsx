"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Search, Plus, Pill, Calendar, User, Clock } from "lucide-react";
import { useAuth } from "./auth-context";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedBy: string;
  prescribedDate: string;
  status: "active" | "completed" | "cancelled";
  refillsRemaining: number;
}

const mockPrescriptions: Prescription[] = [
  {
    id: "RX001",
    patientId: "1",
    patientName: "John Doe",
    medication: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    duration: "30 days",
    instructions: "Take with food. Monitor blood pressure daily.",
    prescribedBy: "Dr. John Smith",
    prescribedDate: "2024-01-15",
    status: "active",
    refillsRemaining: 2,
  },
  {
    id: "RX002",
    patientId: "2",
    patientName: "Jane Smith",
    medication: "Albuterol Inhaler",
    dosage: "90mcg",
    frequency: "As needed",
    duration: "90 days",
    instructions:
      "Use as rescue inhaler for shortness of breath. Shake well before use.",
    prescribedBy: "Dr. John Smith",
    prescribedDate: "2024-02-10",
    status: "active",
    refillsRemaining: 1,
  },
  {
    id: "RX003",
    patientId: "2",
    patientName: "Jane Smith",
    medication: "Prednisone",
    dosage: "20mg",
    frequency: "Once daily",
    duration: "7 days",
    instructions:
      "Take with food. Complete full course even if feeling better.",
    prescribedBy: "Dr. John Smith",
    prescribedDate: "2024-02-10",
    status: "completed",
    refillsRemaining: 0,
  },
];

export function PrescriptionManagement() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] =
    useState<Prescription[]>(mockPrescriptions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Prescription>>({});

  const canCreate = user?.role === "doctor";
  const isPharmacist = user?.role === "pharmacist";

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.patientName
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

  const handleAddPrescription = () => {
    if (formData.patientName && formData.medication && formData.dosage) {
      const newPrescription: Prescription = {
        id: `RX${String(prescriptions.length + 1).padStart(3, "0")}`,
        patientId: Date.now().toString(),
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
      };
      setPrescriptions([...prescriptions, newPrescription]);
      setFormData({});
      setIsAddDialogOpen(false);
    }
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
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, patientName: e.target.value })
                    }
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
                        refillsRemaining: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
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
