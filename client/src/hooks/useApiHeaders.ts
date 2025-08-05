import { useCallback, useMemo } from 'react';
import { useAuth } from '../components/auth-context';
import {
  getCombinedHeaders,
  getSessionHeaders,
  get2FAHeaders,
  setSession,
  set2FACode,
  clear2FACode,
} from '../lib/api';

interface ApiHeadersConfig {
  sessionId?: string;
  twoFACode?: string;
  useBasicAuth?: boolean;
  includeBoth?: boolean;
}

interface ApiHeadersReturn {
  // Header generation functions
  getHeaders: (config?: ApiHeadersConfig) => HeadersInit;
  getSessionHeaders: (sessionId?: string) => HeadersInit;
  get2FAHeaders: (twoFACode?: string) => HeadersInit;
  getCombinedHeaders: (sessionId?: string, twoFACode?: string) => HeadersInit;

  // Authentication state
  hasSession: boolean;
  hasAuthenticated: boolean;
  sessionId: string | null;

  // Helper functions
  setTwoFACode: (code: string) => void;
  clearTwoFACode: () => void;

  // Make authenticated requests
  makeRequest: (url: string, options?: RequestInit, config?: ApiHeadersConfig) => Promise<Response>;

  // Current auth status
  authStatus: {
    method: 'session' | 'basic' | 'none';
    sessionId: string | null;
    authenticated: boolean;
    requires2FA: boolean;
  };
}

export function useApiHeaders(): ApiHeadersReturn {
  const { user, session } = useAuth();

  // Memoized auth status
  const authStatus = useMemo(() => {
    if (!user) {
      return {
        method: 'none' as const,
        sessionId: null,
        authenticated: false,
        requires2FA: false,
      };
    }

    if (session?.sessionId && session.authenticated) {
      return {
        method: 'session' as const,
        sessionId: session.sessionId,
        authenticated: true,
        requires2FA: false,
      };
    }

    return {
      method: 'basic' as const,
      sessionId: session?.sessionId || null,
      authenticated: session?.authenticated || false,
      requires2FA: session?.requires2FA || false,
    };
  }, [user, session]);

  // Main header generation function
  const getHeaders = useCallback((config: ApiHeadersConfig = {}): HeadersInit => {
    const {
      sessionId = authStatus.sessionId,
      twoFACode,
      useBasicAuth = false,
      includeBoth = false,
    } = config;

    if (includeBoth || (sessionId && twoFACode)) {
      return getCombinedHeaders(sessionId || undefined, twoFACode);
    }

    if (!useBasicAuth && sessionId && authStatus.authenticated) {
      return getSessionHeaders(sessionId);
    }

    if (twoFACode) {
      return get2FAHeaders(twoFACode);
    }

    // Fallback to combined headers (will include basic auth if needed)
    return getCombinedHeaders(sessionId || undefined);
  }, [authStatus]);

  // Session headers
  const getSessionHeadersWrapper = useCallback((sessionId?: string) => {
    return getSessionHeaders(sessionId || authStatus.sessionId || undefined);
  }, [authStatus.sessionId]);

  // 2FA headers
  const get2FAHeadersWrapper = useCallback((twoFACode?: string) => {
    return get2FAHeaders(twoFACode);
  }, []);

  // Combined headers
  const getCombinedHeadersWrapper = useCallback((sessionId?: string, twoFACode?: string) => {
    return getCombinedHeaders(
      sessionId || authStatus.sessionId || undefined,
      twoFACode
    );
  }, [authStatus.sessionId]);

  // Helper functions
  const setTwoFACodeWrapper = useCallback((code: string) => {
    set2FACode(code);
  }, []);

  const clearTwoFACodeWrapper = useCallback(() => {
    clear2FACode();
  }, []);

  // Make authenticated request
  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    config: ApiHeadersConfig = {}
  ): Promise<Response> => {
    const headers = getHeaders(config);

    // Ensure URL is absolute
    const fullUrl = url.startsWith('http') ? url : `https://localhost:8443${url}`;

    return fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  }, [getHeaders]);

  return {
    // Header generation functions
    getHeaders,
    getSessionHeaders: getSessionHeadersWrapper,
    get2FAHeaders: get2FAHeadersWrapper,
    getCombinedHeaders: getCombinedHeadersWrapper,

    // Authentication state
    hasSession: !!authStatus.sessionId,
    hasAuthenticated: authStatus.authenticated,
    sessionId: authStatus.sessionId,

    // Helper functions
    setTwoFACode: setTwoFACodeWrapper,
    clearTwoFACode: clearTwoFACodeWrapper,

    // Make authenticated requests
    makeRequest,

    // Current auth status
    authStatus,
  };
}

// Additional hook for specific use cases
export function useSessionHeaders() {
  const { getSessionHeaders, hasSession, sessionId } = useApiHeaders();

  return {
    headers: getSessionHeaders(),
    hasSession,
    sessionId,
  };
}

export function use2FAHeaders() {
  const { get2FAHeaders, setTwoFACode, clearTwoFACode } = useApiHeaders();

  return {
    getHeaders: get2FAHeaders,
    setCode: setTwoFACode,
    clearCode: clearTwoFACode,
  };
}

// Hook for making authenticated API calls
export function useAuthenticatedApi() {
  const { makeRequest, authStatus, getHeaders } = useApiHeaders();

  const get = useCallback((url: string, config?: ApiHeadersConfig) => {
    return makeRequest(url, { method: 'GET' }, config);
  }, [makeRequest]);

  const post = useCallback((url: string, data?: any, config?: ApiHeadersConfig) => {
    return makeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }, [makeRequest]);

  const put = useCallback((url: string, data?: any, config?: ApiHeadersConfig) => {
    return makeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }, [makeRequest]);

  const del = useCallback((url: string, config?: ApiHeadersConfig) => {
    return makeRequest(url, { method: 'DELETE' }, config);
  }, [makeRequest]);

  return {
    get,
    post,
    put,
    delete: del,
    makeRequest,
    authStatus,
    getHeaders,
  };
}

// Example usage:
/*
import { useApiHeaders, useAuthenticatedApi } from '../hooks/useApiHeaders';

function MyComponent() {
  const { getHeaders, hasSession, authStatus } = useApiHeaders();
  const { get, post } = useAuthenticatedApi();

  // Method 1: Get headers and use with fetch
  const fetchPatients = async () => {
    const headers = getHeaders();
    const response = await fetch('/api/patients', { headers });
    return response.json();
  };

  // Method 2: Use authenticated API wrapper
  const fetchPatientsEasy = async () => {
    const response = await get('/api/patients');
    return response.json();
  };

  // Method 3: Use specific header type
  const fetchWithSession = async () => {
    const headers = getHeaders({ sessionId: 'specific-session-id' });
    const response = await fetch('/api/users', { headers });
    return response.json();
  };

  // Method 4: Use with 2FA code
  const fetchWith2FA = async (code: string) => {
    const headers = getHeaders({ twoFACode: code });
    const response = await fetch('/api/medical-records', { headers });
    return response.json();
  };

  // Method 5: Use both session and 2FA
  const fetchWithBoth = async (code: string) => {
    const headers = getHeaders({
      sessionId: authStatus.sessionId,
      twoFACode: code,
      includeBoth: true
    });
    const response = await fetch('/api/prescriptions', { headers });
    return response.json();
  };

  return (
    <div>
      <p>Has Session: {hasSession ? 'Yes' : 'No'}</p>
      <p>Auth Method: {authStatus.method}</p>
      <p>Authenticated: {authStatus.authenticated ? 'Yes' : 'No'}</p>
    </div>
  );
}
*/
