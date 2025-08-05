import { api, setCredentials, set2FACode, clear2FACode } from './api';

interface TwoFACredentials {
  username: string;
  password: string;
  twoFACode: string;
}

interface TwoFAApiOptions {
  autoRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

class TwoFAApiWrapper {
  private currentCredentials: TwoFACredentials | null = null;
  private options: Required<TwoFAApiOptions>;
  private isAuthenticated = false;

  constructor(options: TwoFAApiOptions = {}) {
    this.options = {
      autoRetry: true,
      retryDelay: 1000,
      maxRetries: 3,
      ...options,
    };
  }

  /**
   * Set 2FA credentials that will be automatically used for API calls
   */
  setTwoFACredentials(username: string, password: string, twoFACode: string) {
    this.currentCredentials = { username, password, twoFACode };
    setCredentials(username, password);
    set2FACode(twoFACode);
    this.isAuthenticated = true;
  }

  /**
   * Clear all 2FA credentials
   */
  clearTwoFACredentials() {
    this.currentCredentials = null;
    clear2FACode();
    this.isAuthenticated = false;
  }

  /**
   * Update just the 2FA code (useful for TOTP refresh)
   */
  updateTwoFACode(newCode: string) {
    if (this.currentCredentials) {
      this.currentCredentials.twoFACode = newCode;
      set2FACode(newCode);
    }
  }

  /**
   * Check if we have valid 2FA credentials
   */
  isReady(): boolean {
    return this.currentCredentials !== null && this.isAuthenticated;
  }

  /**
   * Make an authenticated API call with automatic 2FA header inclusion
   */
  private async makeAuthenticatedCall<T>(
    apiCall: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    if (!this.isReady()) {
      throw new Error('2FA credentials not set. Call setTwoFACredentials() first.');
    }

    try {
      return await apiCall();
    } catch (error: any) {
      // Check if it's a 2FA-related error
      if (this.is2FAError(error) && this.options.autoRetry && retryCount < this.options.maxRetries) {
        console.warn(`2FA authentication failed, retrying in ${this.options.retryDelay}ms... (${retryCount + 1}/${this.options.maxRetries})`);

        await this.delay(this.options.retryDelay);

        // Re-set the 2FA code in case it was cleared
        if (this.currentCredentials) {
          set2FACode(this.currentCredentials.twoFACode);
        }

        return this.makeAuthenticatedCall(apiCall, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Check if an error is related to 2FA authentication
   */
  private is2FAError(error: any): boolean {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message || error.message || '';
      return message.includes('2FA') || message.includes('Two-Factor') || message.includes('Invalid 2FA');
    }
    return false;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Wrapped API methods with automatic 2FA handling

  async getPatients() {
    return this.makeAuthenticatedCall(() => api.getPatients());
  }

  async getPatient(id: string) {
    return this.makeAuthenticatedCall(() => api.getPatient(id));
  }

  async createPatient(patient: any) {
    return this.makeAuthenticatedCall(() => api.createPatient(patient));
  }

  async updatePatient(id: string, patient: any) {
    return this.makeAuthenticatedCall(() => api.updatePatient(id, patient));
  }

  async deletePatient(id: string) {
    return this.makeAuthenticatedCall(() => api.deletePatient(id));
  }

  async getMedicalRecords() {
    return this.makeAuthenticatedCall(() => api.getMedicalRecords());
  }

  async getMedicalRecord(id: string) {
    return this.makeAuthenticatedCall(() => api.getMedicalRecord(id));
  }

  async createMedicalRecord(record: any) {
    return this.makeAuthenticatedCall(() => api.createMedicalRecord(record));
  }

  async getMedicalRecordsByPatient(patientId: string) {
    return this.makeAuthenticatedCall(() => api.getMedicalRecordsByPatient(patientId));
  }

  async getPrescriptions() {
    return this.makeAuthenticatedCall(() => api.getPrescriptions());
  }

  async getPrescription(id: string) {
    return this.makeAuthenticatedCall(() => api.getPrescription(id));
  }

  async createPrescription(prescription: any) {
    return this.makeAuthenticatedCall(() => api.createPrescription(prescription));
  }

  async getPrescriptionsByPatient(patientId: string) {
    return this.makeAuthenticatedCall(() => api.getPrescriptionsByPatient(patientId));
  }

  async getUsers() {
    return this.makeAuthenticatedCall(() => api.getUsers());
  }

  async getUser(id: string) {
    return this.makeAuthenticatedCall(() => api.getUser(id));
  }

  async createUser(user: any) {
    return this.makeAuthenticatedCall(() => api.createUser(user));
  }

  async getTwoFASetup() {
    return this.makeAuthenticatedCall(() => api.getTwoFASetup());
  }

  async enableTwoFA(secret: string, code: string) {
    return this.makeAuthenticatedCall(() => api.enableTwoFA(secret, code));
  }

  async disableTwoFA() {
    return this.makeAuthenticatedCall(() => api.disableTwoFA());
  }

  async getTwoFAStatus() {
    return this.makeAuthenticatedCall(() => api.getTwoFAStatus());
  }

  async verifyTwoFA(code: string) {
    return this.makeAuthenticatedCall(() => api.verifyTwoFA(code));
  }

  /**
   * Test authentication with current credentials
   */
  async testAuthentication(): Promise<boolean> {
    try {
      await this.getTwoFAStatus();
      return true;
    } catch (error) {
      console.error('Authentication test failed:', error);
      return false;
    }
  }

  /**
   * Authenticate and set credentials in one call
   */
  async authenticateAndStore(username: string, password: string, twoFACode: string): Promise<boolean> {
    try {
      // Temporarily set credentials
      this.setTwoFACredentials(username, password, twoFACode);

      // Test authentication
      const isValid = await this.testAuthentication();

      if (!isValid) {
        this.clearTwoFACredentials();
        return false;
      }

      return true;
    } catch (error) {
      this.clearTwoFACredentials();
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Get current authentication status
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasCredentials: this.currentCredentials !== null,
      username: this.currentCredentials?.username || null,
      has2FACode: Boolean(this.currentCredentials?.twoFACode),
    };
  }
}

// Create a singleton instance
export const twoFAApi = new TwoFAApiWrapper();

// Export the class for custom instances
export { TwoFAApiWrapper };

// Export utility functions
export const with2FA = {
  /**
   * Quick setup for 2FA API
   */
  setup: (username: string, password: string, twoFACode: string) => {
    twoFAApi.setTwoFACredentials(username, password, twoFACode);
  },

  /**
   * Quick authentication test
   */
  test: () => twoFAApi.testAuthentication(),

  /**
   * Update just the 2FA code (useful for TOTP rotation)
   */
  updateCode: (newCode: string) => {
    twoFAApi.updateTwoFACode(newCode);
  },

  /**
   * Check if ready for API calls
   */
  isReady: () => twoFAApi.isReady(),

  /**
   * Get status information
   */
  status: () => twoFAApi.getAuthStatus(),

  /**
   * Clear everything
   */
  clear: () => twoFAApi.clearTwoFACredentials(),
};

// Example usage:
/*
import { twoFAApi, with2FA } from './api-with-2fa';

// Method 1: Direct usage
await twoFAApi.authenticateAndStore('username', 'password', '123456');
const patients = await twoFAApi.getPatients();

// Method 2: Utility functions
with2FA.setup('username', 'password', '123456');
const isReady = with2FA.isReady();
if (isReady) {
  const users = await twoFAApi.getUsers();
}

// Method 3: Update code for TOTP rotation
with2FA.updateCode('654321');
const records = await twoFAApi.getMedicalRecords();
*/
