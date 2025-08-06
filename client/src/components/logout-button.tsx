"use client";

import React, { useState } from "react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { LogOut, ChevronDown, Hospital, AlertTriangle } from "lucide-react";
import { useAuth } from "../components/auth-context";
import { api } from "../lib/api";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showDropdown?: boolean;
  className?: string;
}

type LogoutMethod = "basic" | "soft" | "force" | "redirect" | "clear";

interface LogoutOption {
  id: LogoutMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  confirmRequired?: boolean;
}

export function LogoutButton({
  variant = "outline",
  size = "default",
  showDropdown = true,
  className = "",
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<LogoutMethod>("basic");
  const { logout: authLogout, user, session } = useAuth();

  const logoutOptions: LogoutOption[] = [
    {
      id: "basic",
      label: "Standard Logout",
      description: "Normal logout - clears browser authentication",
      icon: <LogOut className="h-4 w-4" />,
      endpoint: "/api/auth/logout",
    },
    {
      id: "soft",
      label: "Soft Logout",
      description: "Gentle logout - preserves some browser data",
      icon: <LogOut className="h-4 w-4" />,
      endpoint: "/api/logout/soft",
    },
    {
      id: "force",
      label: "Force Logout",
      description: "Aggressive logout - clears all browser data",
      icon: <Hospital className="h-4 w-4" />,
      endpoint: "/api/logout/force",
      confirmRequired: true,
    },
    {
      id: "clear",
      label: "Clear Authentication",
      description: "Modern logout - uses browser APIs to clear data",
      icon: <AlertTriangle className="h-4 w-4" />,
      endpoint: "/api/auth/clear",
    },
    {
      id: "redirect",
      label: "Logout & Redirect",
      description: "Logout and redirect to login page",
      icon: <LogOut className="h-4 w-4" />,
      endpoint: "/api/logout/redirect?redirect_url=/login",
    },
  ];

  const handleLogout = async (method: LogoutMethod) => {
    const option = logoutOptions.find((opt) => opt.id === method);
    if (!option) return;

    if (option.confirmRequired) {
      setSelectedMethod(method);
      setShowConfirm(true);
      return;
    }

    await performLogout(option);
  };

  const performLogout = async (option: LogoutOption) => {
    setIsLoading(true);

    try {
      let response;
      let result;

      // Use 2FA session logout if available
      if (session?.sessionId && session.sessionId !== "basic-auth") {
        response = await fetch("https://localhost:8443/api/auth/2fa/logout", {
          method: "POST",
          headers: {
            "X-2FA-Session-ID": session.sessionId,
            "Content-Type": "application/json",
          },
        });
        result = await response.json();
        console.log("2FA Session logout response:", result);
      } else {
        // Fallback to basic auth logout
        response = await fetch(`https://localhost:8443${option.endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${user?.username || "admin"}:admin123`)}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        result = await response.json();
        console.log("Basic auth logout response:", result);
      }

      // Clear frontend authentication state
      await authLogout();

      // Clear local storage
      localStorage.removeItem("medical-app-user");
      localStorage.removeItem("medical-app-session");
      localStorage.removeItem("medical-app-credentials");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("session-id");

      // Clear session storage
      sessionStorage.clear();

      // Additional cleanup based on logout method
      switch (option.id) {
        case "force":
          // Aggressive cleanup for force logout
          clearAllBrowserData();
          showLogoutInstructions("force");
          break;

        case "clear":
          // Use modern browser APIs
          if ("clearSiteData" in navigator) {
            // Modern browsers support Clear-Site-Data
            console.log("Using Clear-Site-Data API");
          }
          clearCookies();
          break;

        case "redirect":
          // Handle redirect
          if (result.redirect_url) {
            window.location.href = result.redirect_url;
            return;
          }
          break;

        default:
          // Standard cleanup
          clearCookies();
          break;
      }

      // Redirect to login page after logout
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);

      // Even if backend logout fails, clear frontend state
      await authLogout();
      localStorage.clear();
      sessionStorage.clear();

      // Show user-friendly error message
      alert(
        "Logout completed locally. Please close your browser for complete security.",
      );

      // Redirect anyway
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  const clearAllBrowserData = () => {
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB (if used)
      if (window.indexedDB) {
        // This would need specific implementation based on your app's usage
        console.log("Consider clearing IndexedDB if used");
      }

      // Clear cookies
      clearCookies();

      // Clear cache (limited by browser security)
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    } catch (error) {
      console.error("Error clearing browser data:", error);
    }
  };

  const clearCookies = () => {
    // Get all cookies and clear them
    const cookies = document.cookie.split(";");

    cookies.forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      // Clear cookie for current domain
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    });
  };

  const showLogoutInstructions = (method: string) => {
    const instructions = {
      force:
        "For complete security, please close all browser windows and restart your browser.",
      standard:
        "You have been logged out. Close browser tabs for additional security.",
    };

    const message =
      instructions[method as keyof typeof instructions] ||
      instructions.standard;

    // Show in a more user-friendly way (could use a toast notification)
    const instructionDiv = document.createElement("div");
    instructionDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 16px;
        max-width: 300px;
        z-index: 9999;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      ">
        <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px;">
          Logout Complete
        </div>
        <div style="color: #075985; font-size: 14px;">
          ${message}
        </div>
      </div>
    `;

    document.body.appendChild(instructionDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      if (instructionDiv.parentNode) {
        instructionDiv.parentNode.removeChild(instructionDiv);
      }
    }, 5000);
  };

  if (!showDropdown) {
    // Simple logout button
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => handleLogout("basic")}
        disabled={isLoading}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoading ? "Logging out..." : "Logout"}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading ? "Logging out..." : "Logout"}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="end">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Choose Logout Method</p>
            <p className="text-xs text-muted-foreground">
              Different methods provide different levels of cleanup
            </p>
          </div>

          <DropdownMenuSeparator />

          {logoutOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleLogout(option.id)}
              className="cursor-pointer py-3"
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="flex-shrink-0 mt-0.5">{option.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{option.label}</p>
                    {option.confirmRequired && (
                      <Hospital className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Use "Force Logout" for shared computers
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog for Force Logout */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Hospital className="h-5 w-5 text-amber-500" />
              <span>Confirm Force Logout</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Force logout will aggressively clear all browser data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>All authentication tokens and sessions</li>
                <li>Browser cache and cookies</li>
                <li>Local storage and session storage</li>
                <li>Any cached application data</li>
              </ul>
              <p className="mt-2 font-medium">
                You may need to close and restart your browser for complete
                security.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const option = logoutOptions.find(
                  (opt) => opt.id === selectedMethod,
                );
                if (option) performLogout(option);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Force Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export individual logout functions for programmatic use
export const logoutUtils = {
  // Basic logout function
  basicLogout: async () => {
    try {
      await fetch("https://localhost:8443/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa("admin:admin123")}`,
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Always clear local state
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  },

  // Emergency logout (for error conditions)
  emergencyLogout: () => {
    // Clear all local data immediately
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    const cookies = document.cookie.split(";");
    cookies.forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    // Redirect immediately
    window.location.href = "/login";
  },

  // 2FA Session-based logout
  sessionLogout: async (sessionId: string) => {
    try {
      await fetch("https://localhost:8443/api/auth/2fa/logout", {
        method: "POST",
        headers: {
          "X-2FA-Session-ID": sessionId,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("2FA Session logout error:", error);
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  },
};

// Hook for logout functionality
export const useLogout = () => {
  const { logout: authLogout } = useAuth();

  return {
    logout: logoutUtils.basicLogout,
    emergencyLogout: logoutUtils.emergencyLogout,
    sessionLogout: logoutUtils.sessionLogout,
    clearLocalData: () => {
      localStorage.clear();
      sessionStorage.clear();
      authLogout();
    },
  };
};
