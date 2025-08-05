// API configuration and utilities
const API_BASE_URL = "https://localhost:8443";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: string;
  medicalHistory: string;
  allergies: string;
}

export interface MedicalRecord {
  id: string;
  patientId: number;
  patientName?: string;
  visitDate: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  medications: string;
  notes: string;
  doctorName: string;
}

// Backend medical record structure (for API mapping)
interface BackendMedicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  visit_date: string;
  diagnosis: string;
  treatment_plan: string;
  doctor_notes: string;
}

// Backend nurse view medical record structure
interface BackendMedicalRecordNurseView {
  id: number;
  patient_id: number;
  visit_date: string;
  diagnosis: string;
}

export interface Prescription {
  id: string;
  patientId: number;
  patientName?: string;
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

// Backend prescription structure (for API mapping)
interface BackendPrescription {
  id: number;
  patientId: number;
  doctor_id: number;
  prescribed_date: string;
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
  status?: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  twoFactorEnabled: boolean;
}

export interface TwoFASetup {
  secretKey: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// Helper function to create basic auth header
function createAuthHeader(username: string, password: string): string {
  return "Basic " + btoa(`${username}:${password}`);
}

// Store credentials for API calls
let currentCredentials: { username: string; password: string } | null = null;
let currentSession: { sessionId: string; authenticated: boolean } | null = null;
let current2FACode: string | null = null;

export function setCredentials(username: string, password: string) {
  currentCredentials = { username, password };
}

export function setSession(sessionId: string, authenticated: boolean = true) {
  currentSession = { sessionId, authenticated };
}

export function clearSession() {
  currentSession = null;
}

export function set2FACode(code: string) {
  current2FACode = code;
}

export function clear2FACode() {
  current2FACode = null;
}

export function clearCredentials() {
  currentCredentials = null;
  currentSession = null;
  current2FACode = null;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Get stored session from localStorage if not in memory
  if (!currentSession) {
    const storedSession = localStorage.getItem("medical-app-session");
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      if (sessionData.sessionId && sessionData.authenticated) {
        currentSession = sessionData;
      }
    }
  }

  // Prefer 2FA session if available
  if (currentSession?.sessionId && currentSession.authenticated) {
    headers["X-2FA-Session-ID"] = currentSession.sessionId;

    // Also include 2FA code if available (for dual-method support)
    if (current2FACode) {
      headers["X-2FA-Code"] = current2FACode;
    }
  } else if (currentCredentials) {
    headers.Authorization = createAuthHeader(
      currentCredentials.username,
      currentCredentials.password,
    );

    // Add 2FA code if available (for single-request 2FA method)
    if (current2FACode) {
      headers["X-2FA-Code"] = current2FACode;
    }
  } else {
    // Try to get credentials from localStorage as fallback
    const storedCredentials = localStorage.getItem("medical-app-credentials");
    if (storedCredentials) {
      const credentials = JSON.parse(storedCredentials);
      headers.Authorization = createAuthHeader(
        credentials.username,
        credentials.password,
      );

      // Also include 2FA code if available
      if (current2FACode) {
        headers["X-2FA-Code"] = current2FACode;
      }
    } else {
      throw new Error("No authentication available");
    }
  }

  return headers;
}

// Utility functions for manual header management
export function getSessionHeaders(sessionId?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (sessionId) {
    headers["X-2FA-Session-ID"] = sessionId;
  } else if (currentSession?.sessionId) {
    headers["X-2FA-Session-ID"] = currentSession.sessionId;
  }

  return headers;
}

export function get2FAHeaders(twoFACode?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (twoFACode) {
    headers["X-2FA-Code"] = twoFACode;
  } else if (current2FACode) {
    headers["X-2FA-Code"] = current2FACode;
  }

  return headers;
}

export function getCombinedHeaders(
  sessionId?: string,
  twoFACode?: string,
): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add session ID
  if (sessionId) {
    headers["X-2FA-Session-ID"] = sessionId;
  } else if (currentSession?.sessionId && currentSession.authenticated) {
    headers["X-2FA-Session-ID"] = currentSession.sessionId;
  }

  // Add 2FA code
  if (twoFACode) {
    headers["X-2FA-Code"] = twoFACode;
  } else if (current2FACode) {
    headers["X-2FA-Code"] = current2FACode;
  }

  // Add basic auth as fallback
  if (!headers["X-2FA-Session-ID"] && currentCredentials) {
    headers.Authorization = createAuthHeader(
      currentCredentials.username,
      currentCredentials.password,
    );
  }

  return headers;
}

// Manual API call function with custom headers
export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  customHeaders?: HeadersInit,
): Promise<Response> {
  const headers = customHeaders || getAuthHeaders();

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

// API functions
// Cache for patient and doctor names
const nameCache = new Map<string, string>();

// Helper function to get patient name
const getPatientName = async (patientId: number): Promise<string> => {
  const cacheKey = `patient_${patientId}`;
  if (nameCache.has(cacheKey)) {
    return nameCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const patient = await response.json();
      const fullName = `${patient.firstName} ${patient.lastName}`;
      nameCache.set(cacheKey, fullName);
      return fullName;
    }
  } catch (error) {
    console.error("Failed to fetch patient name:", error);
  }

  return `Patient ${patientId}`;
};

// Helper function to get doctor name
const getDoctorName = async (doctorId: number): Promise<string> => {
  const cacheKey = `doctor_${doctorId}`;
  if (nameCache.has(cacheKey)) {
    return nameCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${doctorId}`, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const doctor = await response.json();
      nameCache.set(cacheKey, doctor.fullName);
      return doctor.fullName;
    }
  } catch (error) {
    console.error("Failed to fetch doctor name:", error);
  }

  return `Doctor ${doctorId}`;
};

export const api = {
  async login(
    username: string,
    password: string,
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createAuthHeader(username, password),
        },
      });

      if (response.ok) {
        setCredentials(username, password);
        const data = await response.json();
        return { data };
      } else {
        return { error: "Invalid credentials" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  // Patients
  async getPatients(): Promise<ApiResponse<Patient[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to fetch patients" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to fetch patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async createPatient(
    patient: Omit<Patient, "id">,
  ): Promise<ApiResponse<Patient>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(patient),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to create patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async updatePatient(
    id: string,
    patient: Partial<Patient>,
  ): Promise<ApiResponse<Patient>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(patient),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to update patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async deletePatient(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        return { data: undefined };
      } else {
        return { error: "Failed to delete patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  // Medical Records
  async createMedicalRecord(
    record: Omit<MedicalRecord, "id">,
  ): Promise<ApiResponse<MedicalRecord>> {
    try {
      // Transform frontend record to backend format
      const backendRecord = {
        patient_id: record.patientId,
        doctor_id: 1, // TODO: Get actual doctor ID from user context
        visit_date: record.visitDate,
        diagnosis: record.diagnosis,
        treatment_plan: record.treatment || record.symptoms || "",
        doctor_notes: record.notes,
      };

      const response = await fetch(`${API_BASE_URL}/api/medical-records`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(backendRecord),
      });

      if (response.ok) {
        const backendData: BackendMedicalRecord = await response.json();
        const data: MedicalRecord = {
          id: backendData.id.toString(),
          patientId: backendData.patient_id,
          patientName:
            record.patientName || `Patient ${backendData.patient_id}`,
          visitDate: backendData.visit_date,
          diagnosis: backendData.diagnosis,
          symptoms: record.symptoms || "",
          treatment: backendData.treatment_plan,
          medications: record.medications || "",
          notes: backendData.doctor_notes,
          doctorName: record.doctorName || `Doctor ${backendData.doctor_id}`,
        };
        return { data };
      } else {
        return { error: "Failed to create medical record" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getMedicalRecords(): Promise<ApiResponse<MedicalRecord[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/medical-records`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const backendData = await response.json();

        // Check if this is nurse view data (limited fields) or full medical records
        const isNurseView =
          backendData.length > 0 &&
          !Object.prototype.hasOwnProperty.call(
            backendData[0],
            "treatment_plan",
          );

        if (isNurseView) {
          // Handle nurse view records (limited data)
          const nurseData: BackendMedicalRecordNurseView[] = backendData;
          const data = await Promise.all(
            nurseData.map(async (record) => ({
              id: record.id.toString(),
              patientId: record.patient_id,
              patientName: await getPatientName(record.patient_id),
              visitDate: record.visit_date,
              diagnosis: record.diagnosis,
              symptoms: "", // Not available in nurse view
              treatment: "", // Not available in nurse view
              medications: "", // Not available in nurse view
              notes: "", // Not available in nurse view
              doctorName: "", // Not available in nurse view
            })),
          );
          return { data };
        } else {
          // Handle full medical records (doctor view)
          const fullData: BackendMedicalRecord[] = backendData;
          const data = await Promise.all(
            fullData.map(async (record) => ({
              id: record.id.toString(),
              patientId: record.patient_id,
              patientName: await getPatientName(record.patient_id),
              visitDate: record.visit_date,
              diagnosis: record.diagnosis,
              symptoms: "", // Not available in backend
              treatment: record.treatment_plan,
              medications: "", // Not available in backend
              notes: record.doctor_notes,
              doctorName: await getDoctorName(record.doctor_id),
            })),
          );
          return { data };
        }
      } else {
        return { error: "Failed to fetch medical records" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getMedicalRecord(id: string): Promise<ApiResponse<MedicalRecord>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-records/${id}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const backendRecord: BackendMedicalRecord = await response.json();
        const data: MedicalRecord = {
          id: backendRecord.id.toString(),
          patientId: backendRecord.patient_id,
          patientName: await getPatientName(backendRecord.patient_id),
          visitDate: backendRecord.visit_date,
          diagnosis: backendRecord.diagnosis,
          symptoms: "", // Not available in backend
          treatment: backendRecord.treatment_plan,
          medications: "", // Not available in backend
          notes: backendRecord.doctor_notes,
          doctorName: await getDoctorName(backendRecord.doctor_id),
        };
        return { data };
      } else {
        return { error: "Failed to fetch medical record" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getMedicalRecordsByPatient(
    patientId: number,
  ): Promise<ApiResponse<MedicalRecord[]>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/patients/${patientId}/medical-records`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const backendData = await response.json();

        // Check if this is nurse view data (limited fields) or full medical records
        const isNurseView =
          backendData.length > 0 &&
          !Object.prototype.hasOwnProperty.call(
            backendData[0],
            "treatment_plan",
          );

        if (isNurseView) {
          // Handle nurse view records (limited data)
          const nurseData: BackendMedicalRecordNurseView[] = backendData;
          const data = await Promise.all(
            nurseData.map(async (record) => ({
              id: record.id.toString(),
              patientId: record.patient_id,
              patientName: await getPatientName(record.patient_id),
              visitDate: record.visit_date,
              diagnosis: record.diagnosis,
              symptoms: "", // Not available in nurse view
              treatment: "", // Not available in nurse view
              medications: "", // Not available in nurse view
              notes: "", // Not available in nurse view
              doctorName: "", // Not available in nurse view
            })),
          );
          return { data };
        } else {
          // Handle full medical records (doctor view)
          const fullData: BackendMedicalRecord[] = backendData;
          const data = await Promise.all(
            fullData.map(async (record) => ({
              id: record.id.toString(),
              patientId: record.patient_id,
              patientName: await getPatientName(record.patient_id),
              visitDate: record.visit_date,
              diagnosis: record.diagnosis,
              symptoms: "", // Not available in backend
              treatment: record.treatment_plan,
              medications: "", // Not available in backend
              notes: record.doctor_notes,
              doctorName: await getDoctorName(record.doctor_id),
            })),
          );
          return { data };
        }
      } else {
        return { error: "Failed to fetch medical records for patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  // Prescriptions
  async getPrescriptions(): Promise<ApiResponse<Prescription[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const backendData: BackendPrescription[] = await response.json();
        const data = await Promise.all(
          backendData.map(async (prescription) => ({
            id: prescription.id.toString(),
            patientId: prescription.patientId,
            patientName: await getPatientName(prescription.patientId),
            medication: prescription.medication,
            dosage: prescription.dosage,
            frequency: "", // Not available in backend
            duration: prescription.duration,
            instructions: prescription.instructions,
            prescribedBy: await getDoctorName(prescription.doctor_id),
            prescribedDate: prescription.prescribed_date,
            status:
              (prescription.status as "active" | "completed" | "cancelled") ||
              "active",
            refillsRemaining: 0, // Not available in backend
          })),
        );
        return { data };
      } else {
        return { error: "Failed to fetch prescriptions" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getPrescription(id: string): Promise<ApiResponse<Prescription>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/${id}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const backendPrescription: BackendPrescription = await response.json();
        const data: Prescription = {
          id: backendPrescription.id.toString(),
          patientId: backendPrescription.patientId,
          patientName: await getPatientName(backendPrescription.patientId),
          medication: backendPrescription.medication,
          dosage: backendPrescription.dosage,
          frequency: "", // Not available in backend
          duration: backendPrescription.duration,
          instructions: backendPrescription.instructions,
          prescribedBy: await getDoctorName(backendPrescription.doctor_id),
          prescribedDate: backendPrescription.prescribed_date,
          status:
            (backendPrescription.status as
              | "active"
              | "completed"
              | "cancelled") || "active",
          refillsRemaining: 0, // Not available in backend
        };
        return { data };
      } else {
        return { error: "Failed to fetch prescription" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getPrescriptionsByPatient(
    patientId: number,
  ): Promise<ApiResponse<Prescription[]>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/patients/${patientId}/prescriptions`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const backendData: BackendPrescription[] = await response.json();
        const data = await Promise.all(
          backendData.map(async (prescription) => ({
            id: prescription.id.toString(),
            patientId: prescription.patientId,
            patientName: await getPatientName(prescription.patientId),
            medication: prescription.medication,
            dosage: prescription.dosage,
            frequency: "", // Not available in backend
            duration: prescription.duration,
            instructions: prescription.instructions,
            prescribedBy: await getDoctorName(prescription.doctor_id),
            prescribedDate: prescription.prescribed_date,
            status:
              (prescription.status as "active" | "completed" | "cancelled") ||
              "active",
            refillsRemaining: 0, // Not available in backend
          })),
        );
        return { data };
      } else {
        return { error: "Failed to fetch prescriptions for patient" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async createPrescription(
    prescription: Omit<Prescription, "id">,
  ): Promise<ApiResponse<Prescription>> {
    try {
      // Transform frontend prescription to backend format
      const backendPrescription = {
        patientId: prescription.patientId,
        doctor_id: 1, // TODO: Get actual doctor ID from user context
        prescribed_date: prescription.prescribedDate,
        medication: prescription.medication,
        dosage: prescription.dosage,
        duration: prescription.duration,
        instructions: prescription.instructions,
      };

      const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(backendPrescription),
      });

      if (response.ok) {
        const backendData: BackendPrescription = await response.json();
        const data: Prescription = {
          id: backendData.id.toString(),
          patientId: backendData.patientId,
          patientName:
            prescription.patientName || `Patient ${backendData.patientId}`,
          medication: backendData.medication,
          dosage: backendData.dosage,
          frequency: prescription.frequency || "",
          duration: backendData.duration,
          instructions: backendData.instructions,
          prescribedBy:
            prescription.prescribedBy || `Doctor ${backendData.doctor_id}`,
          prescribedDate: backendData.prescribed_date,
          status:
            (backendData.status as "active" | "completed" | "cancelled") ||
            "active",
          refillsRemaining: prescription.refillsRemaining || 0,
        };
        return { data };
      } else {
        return { error: "Failed to create prescription" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  // Users
  async getUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to fetch user" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to fetch users" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async createUser(user: Omit<User, "id">): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to create user" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  // Two Factor Authentication
  async getTwoFASetup(): Promise<ApiResponse<TwoFASetup>> {
    try {
      const credentials = JSON.parse(
        localStorage.getItem("medical-app-credentials") || "{}",
      );

      if (!credentials.username || !credentials.password) {
        return { error: "No credentials found for 2FA setup" };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/setup`, {
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to get 2FA setup" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async enableTwoFA(
    code: string,
    secret?: string,
  ): Promise<ApiResponse<{ backupCodes: string[] }>> {
    try {
      const credentials = JSON.parse(
        localStorage.getItem("medical-app-credentials") || "{}",
      );

      if (!credentials.username || !credentials.password) {
        return { error: "No credentials found for 2FA enable" };
      }

      // Get secret from setup if not provided
      if (!secret) {
        const setupResponse = await this.getTwoFASetup();
        if (!setupResponse.data) {
          return { error: "Failed to get 2FA setup" };
        }
        secret = setupResponse.data.secretKey;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/enable`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, secret }),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to enable 2FA" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async disableTwoFA(): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/2fa/disable`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        return { data: undefined };
      } else {
        return { error: "Failed to disable 2FA" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async getTwoFAStatus(): Promise<ApiResponse<{ enabled: boolean }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/2fa/status`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { data };
      } else {
        return { error: "Failed to get 2FA status" };
      }
    } catch (error) {
      console.error(error);
      return { error: "Network error" };
    }
  },

  async verifyTwoFA(code: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/2fa/verify`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        return { data: undefined };
      } else {
        return { error: "Invalid 2FA code" };
      }
    } catch {
      return { error: "Network error" };
    }
  },

  // Logout Methods
  async logout(): Promise<ApiResponse<{ message: string; success: boolean }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      // Clear credentials on successful logout
      clearCredentials();

      return { data };
    } catch (error) {
      console.error(error);
      // Clear credentials even on error
      clearCredentials();
      return { error: "Logout failed" };
    }
  },

  async logoutSoft(): Promise<
    ApiResponse<{ message: string; success: boolean }>
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout/soft`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      clearCredentials();
      return { data };
    } catch (error) {
      console.error(error);
      clearCredentials();
      return { error: "Soft logout failed" };
    }
  },

  async logoutForce(): Promise<
    ApiResponse<{ message: string; success: boolean }>
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout/force`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      clearCredentials();
      return { data };
    } catch (error) {
      console.error(error);
      clearCredentials();
      return { error: "Force logout failed" };
    }
  },

  async logoutWithRedirect(
    redirectUrl?: string,
  ): Promise<ApiResponse<{ message: string; redirect_url: string }>> {
    try {
      const url = redirectUrl
        ? `${API_BASE_URL}/api/logout/redirect?redirect_url=${encodeURIComponent(redirectUrl)}`
        : `${API_BASE_URL}/api/logout/redirect`;

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      clearCredentials();
      return { data };
    } catch (error) {
      console.error(error);
      clearCredentials();
      return { error: "Redirect logout failed" };
    }
  },

  async clearAuth(): Promise<
    ApiResponse<{ message: string; success: boolean }>
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/clear`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      clearCredentials();
      return { data };
    } catch (error) {
      console.error(error);
      clearCredentials();
      return { error: "Clear auth failed" };
    }
  },
};
