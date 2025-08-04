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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useAuth } from "./auth-context";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  medicalHistory: string;
  createdAt: string;
}

const mockPatients: Patient[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1985-03-15",
    gender: "Male",
    phone: "(555) 123-4567",
    email: "john.doe@email.com",
    address: "123 Main St, City, State 12345",
    emergencyContact: "Jane Doe - (555) 987-6543",
    medicalHistory: "Hypertension, Diabetes Type 2",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: "1990-07-22",
    gender: "Female",
    phone: "(555) 234-5678",
    email: "jane.smith@email.com",
    address: "456 Oak Ave, City, State 12345",
    emergencyContact: "Bob Smith - (555) 876-5432",
    medicalHistory: "Asthma, Allergies (Penicillin)",
    createdAt: "2024-02-10",
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Johnson",
    dateOfBirth: "1978-11-08",
    gender: "Male",
    phone: "(555) 345-6789",
    email: "mike.johnson@email.com",
    address: "789 Pine St, City, State 12345",
    emergencyContact: "Sarah Johnson - (555) 765-4321",
    medicalHistory: "No significant medical history",
    createdAt: "2024-03-05",
  },
];

export function PatientManagement() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});

  const canEdit = user?.role === "doctor";
  const canDelete = user?.role === "doctor";

  const filteredPatients = patients.filter(
    (patient) =>
      `${patient.firstName} ${patient.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm),
  );

  const handleAddPatient = () => {
    if (formData.firstName && formData.lastName) {
      const newPatient: Patient = {
        id: Date.now().toString(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth || "",
        gender: formData.gender || "",
        phone: formData.phone || "",
        email: formData.email || "",
        address: formData.address || "",
        emergencyContact: formData.emergencyContact || "",
        medicalHistory: formData.medicalHistory || "",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setPatients([...patients, newPatient]);
      setFormData({});
      setIsAddDialogOpen(false);
    }
  };

  const handleEditPatient = () => {
    if (selectedPatient && formData.firstName && formData.lastName) {
      const updatedPatients = patients.map((patient) =>
        patient.id === selectedPatient.id
          ? { ...patient, ...formData }
          : patient,
      );
      setPatients(updatedPatients);
      setFormData({});
      setSelectedPatient(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeletePatient = (patientId: string) => {
    if (canDelete) {
      setPatients(patients.filter((patient) => patient.id !== patientId));
    }
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setIsEditDialogOpen(true);
  };

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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
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
              <Button onClick={handleAddPatient}>Add Patient</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{patient.email}</span>
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
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
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
