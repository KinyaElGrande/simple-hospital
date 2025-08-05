"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  api,
  setCredentials,
  clearCredentials,
  setSession,
  clearSession,
  set2FACode,
  clear2FACode,
} from "../lib/api";

export type UserRole = "admin" | "doctor" | "nurse" | "pharmacist";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  sessionId: string;
  tempSessionId?: string;
  authenticated: boolean;
  requires2FA: boolean;
}

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  login: (
    username: string,
    password: string,
  ) => Promise<{
    success: boolean;
    requires2FA?: boolean;
    tempSessionId?: string;
    needsSetup?: boolean;
  }>;
  verify2FA: (tempSessionId: string, code: string) => Promise<boolean>;
  loginWithTwoFA: (
    username: string,
    password: string,
    twoFACode: string,
  ) => Promise<boolean>;
  transitionBasicAuthTo2FA: () => Promise<{
    success: boolean;
    tempSessionId?: string;
  }>;
  logout: () => Promise<void>;
  enable2FA: () => void;
  disable2FA: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("medical-app-user");
    const storedSession = localStorage.getItem("medical-app-session");
    const storedCredentials = localStorage.getItem("medical-app-credentials");

    if (storedUser && storedSession) {
      const userData = JSON.parse(storedUser);
      const sessionData = JSON.parse(storedSession);
      setUser(userData);
      setSession(sessionData);

      // Set credentials if available for fallback
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        setCredentials(credentials.username, credentials.password);
      }

      // Set session for API calls if we have session data
      if (sessionData?.sessionId && sessionData.authenticated) {
        setSession(sessionData.sessionId, sessionData.authenticated);
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    requires2FA?: boolean;
    tempSessionId?: string;
    needsSetup?: boolean;
  }> => {
    try {
      console.log("Attempting login for user:", username);

      // Use the new 2FA initiation endpoint
      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/initiate",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      const data = await response.json();
      console.log("Login response:", data);

      // Check if 2FA setup is required
      if (response.status === 428 && data.tempSessionId === "setup-required") {
        // Store credentials for 2FA setup
        localStorage.setItem(
          "medical-app-credentials",
          JSON.stringify({ username, password }),
        );
        setCredentials(username, password);

        // Create a user object for the setup flow
        const userData: User = {
          id: username,
          username: username,
          fullName: username,
          role: assignRoleBasedOnUsername(username),
          twoFactorEnabled: false,
        };

        setUser(userData);
        localStorage.setItem("medical-app-user", JSON.stringify(userData));

        return {
          success: true,
          needsSetup: true,
          requires2FA: false,
        };
      }

      if (response.ok && data.success) {
        // Store credentials for potential use
        localStorage.setItem(
          "medical-app-credentials",
          JSON.stringify({ username, password }),
        );
        setCredentials(username, password);

        if (!data.requires2FA) {
          // No 2FA required, user is fully authenticated
          const userData: User = {
            id: username, // Temporary until we get proper user data
            username: username,
            fullName: username, // Temporary
            role: assignRoleBasedOnUsername(username), // Temporary
            twoFactorEnabled: true, // They have 2FA if they got here successfully
          };

          const sessionData: AuthSession = {
            sessionId: "basic-auth", // Using basic auth
            authenticated: true,
            requires2FA: false,
          };

          setUser(userData);
          setSession(sessionData);
          setCredentials(username, password);
          setSession("basic-auth", true); // Set session for API calls
          localStorage.setItem("medical-app-user", JSON.stringify(userData));
          localStorage.setItem(
            "medical-app-session",
            JSON.stringify(sessionData),
          );

          return { success: true, requires2FA: false };
        } else {
          // 2FA required
          console.log("2FA required, temp session ID:", data.tempSessionId);

          const sessionData: AuthSession = {
            sessionId: data.tempSessionId,
            tempSessionId: data.tempSessionId,
            authenticated: false,
            requires2FA: true,
          };

          setSession(sessionData);
          localStorage.setItem(
            "medical-app-session",
            JSON.stringify(sessionData),
          );

          return {
            success: true,
            requires2FA: true,
            tempSessionId: data.tempSessionId,
          };
        }
      }

      console.error("Login failed:", data);
      return { success: false };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false };
    }
  };

  function assignRoleBasedOnUsername(userName: string): string {
    if (userName.startsWith("doc")) {
      return "doctor";
    } else if (userName.startsWith("nrs")) {
      return "nurse";
    } else if (userName.startsWith("pha")) {
      return "pharmacist";
    } else {
      return "admin";
    }
  }

  const verify2FA = async (
    tempSessionId: string,
    code: string,
  ): Promise<boolean> => {
    try {
      console.log(
        "Verifying 2FA with session ID:",
        tempSessionId,
        "code:",
        code,
      );

      // Check if this is a basic-auth transition scenario
      if (tempSessionId === "basic-auth") {
        console.log("Detected basic-auth transition, creating new 2FA session");
        const transitionResult = await transitionBasicAuthTo2FA();
        if (!transitionResult.success || !transitionResult.tempSessionId) {
          console.error("Failed to transition from basic-auth to 2FA");
          return false;
        }
        // Use the new session ID for verification
        tempSessionId = transitionResult.tempSessionId;
        console.log("Using new session ID for verification:", tempSessionId);
      }

      // First, let's debug the session to see if it exists
      try {
        const debugResponse = await fetch(
          `https://localhost:8443/api/auth/2fa/debug/session?sessionId=${tempSessionId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const debugData = await debugResponse.json();
        console.log("Session debug info:", debugData);
      } catch (debugError) {
        console.log("Debug request failed:", debugError);
      }

      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: tempSessionId,
            code: code,
          }),
        },
      );

      const data = await response.json();
      console.log("2FA verification response:", data);

      if (response.ok && data.success) {
        // 2FA verification successful, update session
        const credentials = JSON.parse(
          localStorage.getItem("medical-app-credentials") || "{}",
        );

        const userData: User = {
          id: credentials.username, // Temporary until we get proper user data
          username: credentials.username,
          fullName: credentials.username, // Temporary
          role: assignRoleBasedOnUsername(credentials.username), // Temporary
          twoFactorEnabled: true,
        };

        const sessionData: AuthSession = {
          sessionId: tempSessionId,
          authenticated: true,
          requires2FA: false, // Now fully authenticated
        };

        setUser(userData);
        setSession(sessionData);
        localStorage.setItem("medical-app-user", JSON.stringify(userData));
        localStorage.setItem(
          "medical-app-session",
          JSON.stringify(sessionData),
        );

        console.log("2FA verification successful, user authenticated");
        return true;
      }

      console.error("2FA verification failed:", data);
      return false;
    } catch (error) {
      console.error("2FA verification error:", error);
      return false;
    }
  };

  const transitionBasicAuthTo2FA = async (): Promise<{
    success: boolean;
    tempSessionId?: string;
  }> => {
    try {
      const credentials = JSON.parse(
        localStorage.getItem("medical-app-credentials") || "{}",
      );

      if (!credentials.username || !credentials.password) {
        console.error("No credentials found for basic-auth transition");
        return { success: false };
      }

      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/transition",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      console.log("Basic-auth to 2FA transition response:", data);

      if (response.ok && data.success && data.requires2FA) {
        return {
          success: true,
          tempSessionId: data.tempSessionId,
        };
      }

      return { success: false };
    } catch (error) {
      console.error("Basic-auth to 2FA transition error:", error);
      return { success: false };
    }
  };

  const loginWithTwoFA = async (
    username: string,
    password: string,
    twoFACode: string,
  ): Promise<boolean> => {
    try {
      // Set the 2FA code for automatic header inclusion
      set2FACode(twoFACode);
      setCredentials(username, password);

      // Try to access a protected resource to test authentication
      const response = await fetch("https://localhost:8443/api/2fa/status", {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          "X-2FA-Code": twoFACode,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // fetch users infomation using
        console.log("User data:", response);

        // Authentication successful
        const userData: User = {
          id: username,
          username: username,
          fullName: username,
          role: assignRoleBasedOnUsername(username),
          twoFactorEnabled: true,
        };

        const sessionData: AuthSession = {
          sessionId: "basic-auth-2fa",
          authenticated: true,
          requires2FA: false,
        };

        setUser(userData);
        setSession(sessionData);
        setSession("basic-auth-2fa", true); // Set session for API calls
        localStorage.setItem("medical-app-user", JSON.stringify(userData));
        localStorage.setItem(
          "medical-app-session",
          JSON.stringify(sessionData),
        );
        localStorage.setItem(
          "medical-app-credentials",
          JSON.stringify({ username, password }),
        );

        return true;
      }

      // Clear the 2FA code if authentication failed
      clear2FACode();
      return false;
    } catch (error) {
      console.error("Login with 2FA error:", error);
      clear2FACode();
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout if we have a session
      if (session?.sessionId && session.sessionId !== "basic-auth") {
        await fetch("https://localhost:8443/api/auth/2fa/logout", {
          method: "POST",
          headers: {
            "X-2FA-Session-ID": session.sessionId,
            "Content-Type": "application/json",
          },
        });
      } else {
        // Fallback to basic auth logout
        const credentials = JSON.parse(
          localStorage.getItem("medical-app-credentials") || "{}",
        );
        if (credentials.username) {
          await fetch("https://localhost:8443/api/auth/logout", {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password || "admin123"}`)}`,
            },
          });
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local cleanup even if backend logout fails
    }

    // Clear local state
    setUser(null);
    setSession(null);
    clearCredentials();
    clearSession();
    clear2FACode();
    localStorage.removeItem("medical-app-user");
    localStorage.removeItem("medical-app-session");
    localStorage.removeItem("medical-app-credentials");
  };

  const enable2FA = async () => {
    if (user) {
      const updatedUser = { ...user, twoFactorEnabled: true };
      setUser(updatedUser);
      localStorage.setItem("medical-app-user", JSON.stringify(updatedUser));
    }
  };

  const disable2FA = async () => {
    if (user) {
      try {
        await api.disableTwoFA();
        const updatedUser = { ...user, twoFactorEnabled: false };
        setUser(updatedUser);
        localStorage.setItem("medical-app-user", JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to disable 2FA:", error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        verify2FA,
        loginWithTwoFA,
        transitionBasicAuthTo2FA,
        logout,
        enable2FA,
        disable2FA,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
