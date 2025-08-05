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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api, type Patient } from "../lib/api";

export function PatientManagement() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
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

  const canEdit = role === "doctor";
  const canDelete = role === "doctor";

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await api.getPatients();
      if (response.data) {
        setPatients(response.data);
      } else {
        setError(response.error || "Failed to load patients");
      }
    } catch (error) {
      setError("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      `${patient.firstName} ${patient.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      patient.allergies.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm),
  );

  const handleAddPatient = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log("handleAddPatient called", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      isCreating,
    });
    if (formData.firstName && formData.lastName && !isCreating) {
      setIsCreating(true);
      console.log("Starting patient creation...");
      try {
        const response = await api.createPatient({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth || "",
          gender: formData.gender || "",
          phone: formData.phone || "",
          address: formData.address || "",
          allergies: formData.allergies || "",
          emergencyContact: formData.emergencyContact || "",
          medicalHistory: formData.medicalHistory || "",
        });

        if (response.data) {
          console.log("Patient created successfully:", response.data);
          setPatients([...patients, response.data]);
          setFormData({});
          setIsAddDialogOpen(false);
          setError("");
        } else {
          console.log("Patient creation failed:", response.error);
          setError(response.error || "Failed to create patient");
        }
      } catch (error) {
        console.log("Patient creation error:", error);
        setError("Failed to create patient");
      } finally {
        console.log("Patient creation finished, setting isCreating to false");
        setIsCreating(false);
      }
    }
  };

  const handleEditPatient = async () => {
    if (selectedPatient && formData.firstName && formData.lastName) {
      try {
        const response = await api.updatePatient(selectedPatient.id, formData);

        if (response.data) {
          const updatedPatients = patients.map((patient) =>
            patient.id === selectedPatient.id ? response.data! : patient,
          );
          setPatients(updatedPatients);
          setFormData({});
          setSelectedPatient(null);
          setIsEditDialogOpen(false);
          setError("");
        } else {
          setError(response.error || "Failed to update patient");
        }
      } catch (error) {
        setError("Failed to update patient");
      }
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (canDelete) {
      try {
        const response = await api.deletePatient(patientId);

        if (response.data !== undefined) {
          setPatients(patients.filter((patient) => patient.id !== patientId));
          setError("");
        } else {
          setError(response.error || "Failed to delete patient");
        }
      } catch (error) {
        setError("Failed to delete patient");
      }
    }
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setIsEditDialogOpen(true);
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
            Patient Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage patient information and records
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
              <DialogDescription>
                Enter patient information to create a new record
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={formData.allergies || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, allergies: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea
                  id="medicalHistory"
                  value={formData.medicalHistory || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, medicalHistory: e.target.value })
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
              <Button
                onClick={handleAddPatient}
                disabled={isCreating}
                type="button"
              >
                {isCreating ? "Creating..." : "Add Patient"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patient Search</CardTitle>
          <CardDescription>
            Search patients by name, email, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        DOB: {patient.dateOfBirth} • {patient.gender}
                      </p>
                    </div>
                    <Badge variant="secondary">Patient ID: {patient.id}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      <span>{patient.allergies || "None"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  </div>

                  {patient.medicalHistory && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Medical History:
                      </p>
                      <p className="text-sm text-gray-600">
                        {patient.medicalHistory}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(patient)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePatient(patient.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update patient information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editFirstName">First Name *</Label>
              <Input
                id="editFirstName"
                value={formData.firstName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLastName">Last Name *</Label>
              <Input
                id="editLastName"
                value={formData.lastName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDateOfBirth">Date of Birth</Label>
              <Input
                id="editDateOfBirth"
                type="date"
                value={formData.dateOfBirth || ""}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGender">Gender</Label>
              <Select
                value={formData.gender || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAllergies">Allergies</Label>
              <Input
                id="editAllergies"
                value={formData.allergies || ""}
                onChange={(e) =>
                  setFormData({ ...formData, allergies: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Input
                id="editAddress"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
              <Input
                id="editEmergencyContact"
                value={formData.emergencyContact || ""}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="editMedicalHistory">Medical History</Label>
              <Textarea
                id="editMedicalHistory"
                value={formData.medicalHistory || ""}
                onChange={(e) =>
                  setFormData({ ...formData, medicalHistory: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditPatient}>Update Patient</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
