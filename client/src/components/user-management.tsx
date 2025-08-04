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
import {
  Search,
  Plus,
  UserCog,
  Shield,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import { useAuth, type UserRole } from "./auth-context";

interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

const mockUsers: SystemUser[] = [
  {
    id: "1",
    username: "admin",
    fullName: "System Administrator",
    email: "admin@medportal.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-01-20",
    createdAt: "2024-01-01",
    twoFactorEnabled: true,
  },
  {
    id: "2",
    username: "dr.smith",
    fullName: "Dr. John Smith",
    email: "j.smith@medportal.com",
    role: "doctor",
    status: "active",
    lastLogin: "2024-01-19",
    createdAt: "2024-01-05",
    twoFactorEnabled: false,
  },
  {
    id: "3",
    username: "nurse.jane",
    fullName: "Jane Wilson",
    email: "j.wilson@medportal.com",
    role: "nurse",
    status: "active",
    lastLogin: "2024-01-18",
    createdAt: "2024-01-10",
    twoFactorEnabled: true,
  },
  {
    id: "4",
    username: "pharm.bob",
    fullName: "Bob Johnson",
    email: "b.johnson@medportal.com",
    role: "pharmacist",
    status: "active",
    lastLogin: "2024-01-17",
    createdAt: "2024-01-15",
    twoFactorEnabled: false,
  },
];

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemUser>>({});

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((systemUser) => {
    const matchesSearch =
      systemUser.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      systemUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      systemUser.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || systemUser.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleAddUser = () => {
    if (formData.username && formData.fullName && formData.role) {
      const newUser: SystemUser = {
        id: Date.now().toString(),
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email || "",
        role: formData.role as UserRole,
        status: "active",
        lastLogin: "Never",
        createdAt: new Date().toISOString().split("T")[0],
        twoFactorEnabled: false,
      };
      setUsers([...users, newUser]);
      setFormData({});
      setIsAddDialogOpen(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
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

  const getStatusBadgeColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage system users and their access permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the medical portal system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
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
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddUser}>Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Search by name, username, or email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Role</CardTitle>
            <CardDescription>
              Filter users by their assigned role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((systemUser) => (
          <Card key={systemUser.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {systemUser.fullName}
                      </h3>
                      <Badge className={getRoleBadgeColor(systemUser.role)}>
                        {systemUser.role.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusBadgeColor(systemUser.status)}>
                        {systemUser.status.toUpperCase()}
                      </Badge>
                      {systemUser.twoFactorEnabled && (
                        <Shield
                          className="h-4 w-4 text-secondary-600"
                          title="2FA Enabled"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Username</p>
                          <p className="text-gray-600">{systemUser.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-gray-600">
                            {systemUser.email || "Not provided"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Last Login</p>
                          <p className="text-gray-600">
                            {systemUser.lastLogin}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      <p>Account created: {systemUser.createdAt}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-600">
              {searchTerm || roleFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No users available"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
