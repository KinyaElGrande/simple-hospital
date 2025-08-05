"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Users,
  FileText,
  Pill,
  UserCog,
  Activity,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../components/auth-context";

export function DashboardHome() {
  const { user } = useAuth();
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

  const getStatsForRole = () => {
    switch (role) {
      case "doctor":
        return [
          {
            title: "Total Patients",
            value: "156",
            icon: Users,
            color: "text-primary-600",
          },
          {
            title: "Medical Records",
            value: "342",
            icon: FileText,
            color: "text-secondary-600",
          },
          {
            title: "Prescriptions",
            value: "89",
            icon: Pill,
            color: "text-purple-600",
          },
          {
            title: "Today's Appointments",
            value: "12",
            icon: Calendar,
            color: "text-orange-600",
          },
        ];
      case "nurse":
        return [
          {
            title: "Assigned Patients",
            value: "78",
            icon: Users,
            color: "text-primary-600",
          },
          {
            title: "Records Accessed",
            value: "124",
            icon: FileText,
            color: "text-secondary-600",
          },
          {
            title: "Active Cases",
            value: "23",
            icon: Activity,
            color: "text-red-600",
          },
          {
            title: "Today's Tasks",
            value: "8",
            icon: Calendar,
            color: "text-orange-600",
          },
        ];
      case "pharmacist":
        return [
          {
            title: "Pending Prescriptions",
            value: "34",
            icon: Pill,
            color: "text-purple-600",
          },
          {
            title: "Dispensed Today",
            value: "67",
            icon: Activity,
            color: "text-secondary-600",
          },
          {
            title: "Low Stock Items",
            value: "5",
            icon: Users,
            color: "text-red-600",
          },
          {
            title: "Total Medications",
            value: "1,234",
            icon: FileText,
            color: "text-primary-600",
          },
        ];
      case "admin":
        return [
          {
            title: "Total Users",
            value: "45",
            icon: UserCog,
            color: "text-primary-600",
          },
          {
            title: "Active Sessions",
            value: "23",
            icon: Activity,
            color: "text-secondary-600",
          },
          {
            title: "System Alerts",
            value: "3",
            icon: FileText,
            color: "text-red-600",
          },
          {
            title: "Database Size",
            value: "2.4GB",
            icon: Users,
            color: "text-purple-600",
          },
        ];
      default:
        return [];
    }
  };

  const stats = getStatsForRole();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of your medical portal activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {role === "doctor" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                    <span className="text-sm">
                      Updated patient record for John Doe
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      2 min ago
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-secondary-600 rounded-full"></div>
                    <span className="text-sm">
                      Created prescription for Jane Smith
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      15 min ago
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-sm">
                      Added new patient: Mike Johnson
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      1 hour ago
                    </Badge>
                  </div>
                </>
              )}
              {role === "nurse" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                    <span className="text-sm">Viewed medical record #1234</span>
                    <Badge variant="secondary" className="ml-auto">
                      5 min ago
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-secondary-600 rounded-full"></div>
                    <span className="text-sm">Updated patient vitals</span>
                    <Badge variant="secondary" className="ml-auto">
                      20 min ago
                    </Badge>
                  </div>
                </>
              )}
              {role === "pharmacist" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-sm">
                      Dispensed prescription #5678
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      3 min ago
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                    <span className="text-sm">
                      Updated inventory for Aspirin
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      30 min ago
                    </Badge>
                  </div>
                </>
              )}
              {role === "admin" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-sm">Created new user account</span>
                    <Badge variant="secondary" className="ml-auto">
                      10 min ago
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                    <span className="text-sm">System backup completed</span>
                    <Badge variant="secondary" className="ml-auto">
                      2 hours ago
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {role === "doctor" && (
                <>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Users className="h-5 w-5 text-primary-600 mb-2" />
                    <div className="text-sm font-medium">Add Patient</div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <FileText className="h-5 w-5 text-secondary-600 mb-2" />
                    <div className="text-sm font-medium">New Record</div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Pill className="h-5 w-5 text-purple-600 mb-2" />
                    <div className="text-sm font-medium">Prescribe</div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Calendar className="h-5 w-5 text-orange-600 mb-2" />
                    <div className="text-sm font-medium">Schedule</div>
                  </button>
                </>
              )}
              {role === "nurse" && (
                <>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Users className="h-5 w-5 text-primary-600 mb-2" />
                    <div className="text-sm font-medium">View Patients</div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <FileText className="h-5 w-5 text-secondary-600 mb-2" />
                    <div className="text-sm font-medium">Check Records</div>
                  </button>
                </>
              )}
              {role === "pharmacist" && (
                <>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Pill className="h-5 w-5 text-purple-600 mb-2" />
                    <div className="text-sm font-medium">
                      View Prescriptions
                    </div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Activity className="h-5 w-5 text-secondary-600 mb-2" />
                    <div className="text-sm font-medium">Inventory</div>
                  </button>
                </>
              )}
              {role === "admin" && (
                <>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <UserCog className="h-5 w-5 text-primary-600 mb-2" />
                    <div className="text-sm font-medium">Add User</div>
                  </button>
                  <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <Activity className="h-5 w-5 text-red-600 mb-2" />
                    <div className="text-sm font-medium">System Status</div>
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
