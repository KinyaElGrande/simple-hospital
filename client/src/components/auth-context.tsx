import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type UserRole = "admin" | "doctor" | "nurse" | "pharmacist"

export interface User {
  id: string
  username: string
  fullName: string
  role: UserRole
  twoFactorEnabled: boolean
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  enable2FA: () => void
  disable2FA: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users database
const mockUsers: Record<string, { password: string; user: User }> = {
  admin: {
    password: "admin123",
    user: {
      id: "1",
      username: "admin",
      fullName: "System Administrator",
      role: "admin",
      twoFactorEnabled: false,
    },
  },
  "dr.smith": {
    password: "doctor123",
    user: {
      id: "2",
      username: "dr.smith",
      fullName: "Dr. John Smith",
      role: "doctor",
      twoFactorEnabled: false,
    },
  },
  "nurse.jane": {
    password: "nurse123",
    user: {
      id: "3",
      username: "nurse.jane",
      fullName: "Jane Wilson",
      role: "nurse",
      twoFactorEnabled: false,
    },
  },
  "pharm.bob": {
    password: "pharm123",
    user: {
      id: "4",
      username: "pharm.bob",
      fullName: "Bob Johnson",
      role: "pharmacist",
      twoFactorEnabled: false,
    },
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("medical-app-user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    const userRecord = mockUsers[username]
    if (userRecord && userRecord.password === password) {
      setUser(userRecord.user)
      localStorage.setItem("medical-app-user", JSON.stringify(userRecord.user))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("medical-app-user")
  }

  const enable2FA = () => {
    if (user) {
      const updatedUser = { ...user, twoFactorEnabled: true }
      setUser(updatedUser)
      localStorage.setItem("medical-app-user", JSON.stringify(updatedUser))
    }
  }

  const disable2FA = () => {
    if (user) {
      const updatedUser = { ...user, twoFactorEnabled: false }
      setUser(updatedUser)
      localStorage.setItem("medical-app-user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, enable2FA, disable2FA, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
