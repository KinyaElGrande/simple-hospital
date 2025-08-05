// Frontend Logout Service for Hospital Management System
// Provides comprehensive logout functionality with different methods and cleanup strategies

export interface LogoutResponse {
  message: string;
  success: boolean;
  method: string;
  timestamp: string;
  instructions?: Record<string, string>;
  redirect_url?: string;
}

export interface LogoutOptions {
  method?: 'basic' | 'soft' | 'force' | 'redirect' | 'clear';
  clearLocalData?: boolean;
  redirectUrl?: string;
  showInstructions?: boolean;
}

export class LogoutService {
  private readonly baseUrl: string;
  private readonly defaultCredentials: string;

  constructor(baseUrl: string = 'https://localhost:8443') {
    this.baseUrl = baseUrl;
    // Default credentials - in real app, get from auth context
    this.defaultCredentials = btoa('admin:admin123');
  }

  /**
   * Main logout method that handles different logout strategies
   */
  async logout(options: LogoutOptions = {}): Promise<LogoutResponse> {
    const {
      method = 'basic',
      clearLocalData = true,
      redirectUrl = '/login',
      showInstructions = true
    } = options;

    try {
      // Call appropriate logout endpoint
      const response = await this.callLogoutEndpoint(method, redirectUrl);

      // Clear local data if requested
      if (clearLocalData) {
        this.clearLocalData(method);
      }

      // Show instructions if requested
      if (showInstructions && response.instructions) {
        this.showLogoutInstructions(response.instructions, method);
      }

      // Handle redirect
      if (response.redirect_url || method === 'redirect') {
        this.handleRedirect(response.redirect_url || redirectUrl);
      }

      return response;

    } catch (error) {
      console.error('Logout error:', error);

      // Fallback: clear local data even if backend call fails
      if (clearLocalData) {
        this.clearLocalData('emergency');
      }

      // Return emergency response
      return {
        message: 'Logout completed locally due to server error',
        success: true,
        method: 'emergency',
        timestamp: new Date().toISOString(),
        instructions: {
          'browser': 'Close browser for complete security',
          'manual': 'Clear browser cache and cookies manually'
        }
      };
    }
  }

  /**
   * Quick logout - minimal cleanup, fast execution
   */
  async quickLogout(): Promise<void> {
    try {
      await this.callLogoutEndpoint('soft');
    } catch (error) {
      console.error('Quick logout error:', error);
    }

    this.clearEssentialData();
    window.location.href = '/login';
  }

  /**
   * Secure logout - maximum cleanup for shared/public computers
   */
  async secureLogout(): Promise<void> {
    const confirmed = window.confirm(
      'Secure logout will clear all browser data. ' +
      'This is recommended for shared computers. Continue?'
    );

    if (!confirmed) return;

    try {
      await this.callLogoutEndpoint('force');
    } catch (error) {
      console.error('Secure logout error:', error);
    }

    this.clearAllData();
    this.showSecurityMessage();

    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  /**
   * Emergency logout - immediate local cleanup without server call
   */
  emergencyLogout(): void {
    console.warn('Emergency logout - clearing all local data immediately');

    this.clearAllData();
    this.showEmergencyMessage();

    // Immediate redirect
    window.location.href = '/login';
  }

  /**
   * Session-based logout for future session authentication
   */
  async sessionLogout(sessionId: string): Promise<LogoutResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      this.clearLocalData('session');

      return result;
    } catch (error) {
      console.error('Session logout error:', error);
      this.clearLocalData('emergency');
      throw error;
    }
  }

  /**
   * Call the appropriate backend logout endpoint
   */
  private async callLogoutEndpoint(method: string, redirectUrl?: string): Promise<LogoutResponse> {
    const endpoints = {
      basic: '/api/auth/logout',
      soft: '/api/logout/soft',
      force: '/api/logout/force',
      clear: '/api/auth/clear',
      redirect: `/api/logout/redirect${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`
    };

    const endpoint = endpoints[method as keyof typeof endpoints] || endpoints.basic;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.defaultCredentials}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok && response.status !== 401) {
      throw new Error(`Logout request failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Clear local data based on logout method
   */
  private clearLocalData(method: string): void {
    switch (method) {
      case 'force':
      case 'emergency':
        this.clearAllData();
        break;
      case 'soft':
        this.clearEssentialData();
        break;
      default:
        this.clearStandardData();
        break;
    }
  }

  /**
   * Clear essential authentication data only
   */
  private clearEssentialData(): void {
    // Clear authentication tokens
    localStorage.removeItem('auth-token');
    localStorage.removeItem('session-id');
    localStorage.removeItem('medical-app-user');

    // Clear sensitive session data
    sessionStorage.removeItem('auth-token');
    sessionStorage.removeItem('user-session');
  }

  /**
   * Clear standard data for normal logout
   */
  private clearStandardData(): void {
    this.clearEssentialData();

    // Clear additional app data
    localStorage.removeItem('user-preferences');
    localStorage.removeItem('app-settings');

    // Clear session storage
    sessionStorage.clear();

    // Clear domain cookies
    this.clearCookies();
  }

  /**
   * Clear all browser data for maximum security
   */
  private clearAllData(): void {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Clear all cookies
    this.clearAllCookies();

    // Clear cache if supported
    this.clearBrowserCache();

    // Clear IndexedDB if used
    this.clearIndexedDB();
  }

  /**
   * Clear domain-specific cookies
   */
  private clearCookies(): void {
    const cookies = document.cookie.split(';');

    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      if (name) {
        // Clear for current path and domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    });
  }

  /**
   * Clear all cookies including subdomain cookies
   */
  private clearAllCookies(): void {
    const cookies = document.cookie.split(';');
    const hostname = window.location.hostname;

    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      if (name) {
        // Clear for multiple domain variations
        const domains = [
          '',
          hostname,
          `.${hostname}`,
          'localhost',
          '.localhost'
        ];

        domains.forEach(domain => {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;${domain ? `domain=${domain}` : ''}`;
        });
      }
    });
  }

  /**
   * Clear browser cache using Cache API
   */
  private async clearBrowserCache(): Promise<void> {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Browser cache cleared');
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  }

  /**
   * Clear IndexedDB databases
   */
  private async clearIndexedDB(): Promise<void> {
    if ('indexedDB' in window) {
      try {
        // This is a simplified version - in real apps, you'd need to know your DB names
        const databases = ['hospital-app-db', 'user-data-db'];

        databases.forEach(dbName => {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          deleteReq.onsuccess = () => console.log(`${dbName} cleared`);
          deleteReq.onerror = () => console.error(`Error clearing ${dbName}`);
        });
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }
    }
  }

  /**
   * Show logout instructions to user
   */
  private showLogoutInstructions(instructions: Record<string, string>, method: string): void {
    const instructionText = Object.entries(instructions)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Create a temporary notification
    this.showNotification(`Logout completed (${method})`, instructionText, 'info');
  }

  /**
   * Show security message for secure logout
   */
  private showSecurityMessage(): void {
    this.showNotification(
      'Secure Logout Complete',
      'All browser data has been cleared. Close your browser for maximum security.',
      'success'
    );
  }

  /**
   * Show emergency logout message
   */
  private showEmergencyMessage(): void {
    this.showNotification(
      'Emergency Logout',
      'Local data cleared. Close browser immediately for security.',
      'warning'
    );
  }

  /**
   * Show notification to user
   */
  private showNotification(title: string, message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 350px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      ${this.getNotificationStyles(type)}
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 14px; line-height: 1.4;">${message}</div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Get notification styles based on type
   */
  private getNotificationStyles(type: string): string {
    const styles = {
      info: 'background: #f0f9ff; border: 1px solid #0ea5e9; color: #0369a1;',
      success: 'background: #f0fdf4; border: 1px solid #22c55e; color: #15803d;',
      warning: 'background: #fffbeb; border: 1px solid #f59e0b; color: #d97706;'
    };

    return styles[type as keyof typeof styles] || styles.info;
  }

  /**
   * Handle redirect after logout
   */
  private handleRedirect(url: string): void {
    setTimeout(() => {
      window.location.href = url;
    }, 1000);
  }

  /**
   * Check if user should be logged out (for periodic checks)
   */
  async checkLogoutStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/logout/status`);
      const result = await response.json();
      return !result.authenticated;
    } catch (error) {
      console.error('Error checking logout status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const logoutService = new LogoutService();

// Export utility functions for direct use
export const logoutUtils = {
  // Quick logout for navigation
  quick: () => logoutService.quickLogout(),

  // Secure logout for shared computers
  secure: () => logoutService.secureLogout(),

  // Emergency logout for errors
  emergency: () => logoutService.emergencyLogout(),

  // Standard logout with options
  standard: (options?: LogoutOptions) => logoutService.logout(options),
};

// Export types
export type { LogoutOptions, LogoutResponse };
