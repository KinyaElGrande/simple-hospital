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
import { Alert, AlertDescription } from "../components/ui/alert";
import { Search, Plus, UserCog, Shield, User, Mail } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api, type User as ApiUser } from "../lib/api";

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ApiUser>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.username.startsWith("admin");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      const response = await api.getUsers();

      if (response.data) {
        setUsers(response.data);
      } else if (response.error) {
        setError(response.error);
      }

      setLoading(false);
    };

    console.log("mwitu", user);

    fetchUsers();
  }, []);

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
      systemUser.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || systemUser.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleAddUser = async () => {
    if (formData.username && formData.fullName && formData.role) {
      try {
        const response = await api.createUser({
          username: formData.username,
          fullName: formData.fullName,
          role: formData.role,
          twoFactorEnabled: false,
        });

        if (response.data) {
          setUsers([...users, response.data]);
          setFormData({});
          setIsAddDialogOpen(false);
          setError("");
        } else {
          setError(response.error || "Failed to create user");
        }
      } catch (error) {
        console.error(error);
        setError("Failed to create user");
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
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
              <div className="space-y-4"></div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                          <p className="font-medium">Username</p>
                          <p className="text-gray-600">{systemUser.username}</p>
                        </div>
                        <div>
                          <p className="font-medium">2FA Status</p>
                          <p className="text-gray-600">
                            {systemUser.twoFactorEnabled
                              ? "Enabled"
                              : "Disabled"}
                          </p>
                        </div>
                      </div>
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
