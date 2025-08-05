package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/kinyaelgrande/simple-hospital/middleware"
)

type LogoutHandler struct {
	// In-memory store of invalidated sessions/tokens
	invalidatedSessions map[string]time.Time
}

func NewLogoutHandler() *LogoutHandler {
	return &LogoutHandler{
		invalidatedSessions: make(map[string]time.Time),
	}
}

// LogoutResponse represents the logout response structure
type LogoutResponse struct {
	Message      string            `json:"message"`
	Success      bool              `json:"success"`
	Method       string            `json:"method"`
	Timestamp    time.Time         `json:"timestamp"`
	Instructions map[string]string `json:"instructions,omitempty"`
}

// BasicAuthLogout handles logout for Basic Authentication
// Forces browser to forget credentials by sending 401 with different realm
func (h *LogoutHandler) BasicAuthLogout(w http.ResponseWriter, r *http.Request) {
	// Get user info before logout (optional)
	user, _ := middleware.GetUserFromContext(r)
	username := "unknown"
	if user != nil {
		username = user.Username
	}

	// Force browser to forget credentials with 401 and new realm
	w.Header().Set("WWW-Authenticate", "Basic realm=\"Hospital System - Logged Out - Please Re-authenticate\"")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Try to clear site data (modern browsers)
	w.Header().Set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\", \"executionContexts\"")

	w.WriteHeader(http.StatusUnauthorized)

	response := LogoutResponse{
		Message:   "User " + username + " logged out successfully",
		Success:   true,
		Method:    "basic_auth_invalidation",
		Timestamp: time.Now(),
		Instructions: map[string]string{
			"browser":     "Close browser or use incognito mode for complete logout",
			"alternative": "Clear browser cache and cookies manually",
			"api_client":  "Remove Authorization header from subsequent requests",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// SoftLogout provides a "soft" logout that doesn't force 401
// Useful for applications that want to handle logout gracefully
func (h *LogoutHandler) SoftLogout(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r)
	username := "unknown"
	if user != nil {
		username = user.Username
	}

	// Set headers to prevent caching
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\"")

	w.WriteHeader(http.StatusOK)

	response := LogoutResponse{
		Message:   "User " + username + " logout initiated",
		Success:   true,
		Method:    "soft_logout",
		Timestamp: time.Now(),
		Instructions: map[string]string{
			"frontend": "Clear local authentication state and redirect to login",
			"browser":  "Authentication may persist - consider clearing cache",
			"session":  "Server-side session cleared (if applicable)",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ForceLogout aggressively tries to clear all authentication
func (h *LogoutHandler) ForceLogout(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r)
	username := "unknown"
	if user != nil {
		username = user.Username

		// Add to invalidated sessions (for future session-based auth)
		sessionKey := generateSessionKey(user.Username, time.Now())
		h.invalidatedSessions[sessionKey] = time.Now()
	}

	// Set aggressive cache clearing headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate, private")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "Thu, 01 Jan 1970 00:00:00 GMT")
	w.Header().Set("Clear-Site-Data", "\"*\"")

	// Force authentication challenge with different realm
	w.Header().Set("WWW-Authenticate", "Basic realm=\"LOGGED_OUT_"+time.Now().Format("20060102150405")+"\"")

	// Set additional security headers
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	w.WriteHeader(http.StatusUnauthorized)

	response := LogoutResponse{
		Message:   "User " + username + " forcibly logged out",
		Success:   true,
		Method:    "force_logout",
		Timestamp: time.Now(),
		Instructions: map[string]string{
			"immediate":   "Close all browser windows and restart browser",
			"thorough":    "Clear all browser data (cache, cookies, storage)",
			"alternative": "Use browser's private/incognito mode",
			"api_usage":   "Remove all authentication headers and tokens",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// LogoutStatus checks if a user/session has been logged out
func (h *LogoutHandler) LogoutStatus(w http.ResponseWriter, r *http.Request) {
	user, authenticated := middleware.GetUserFromContext(r)

	var status map[string]interface{}

	if !authenticated || user == nil {
		status = map[string]interface{}{
			"authenticated":  false,
			"message":        "No active authentication",
			"recommendation": "Proceed to login",
		}
	} else {
		// Check if session is invalidated
		sessionKey := generateSessionKey(user.Username, time.Now())
		_, isInvalidated := h.invalidatedSessions[sessionKey]

		status = map[string]interface{}{
			"authenticated":  true,
			"username":       user.Username,
			"session_valid":  !isInvalidated,
			"message":        "Authentication active",
			"recommendation": "Use logout endpoint to terminate session",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// ClearInvalidatedSessions cleans up old invalidated sessions (maintenance)
func (h *LogoutHandler) ClearInvalidatedSessions() {
	cutoff := time.Now().Add(-24 * time.Hour) // Remove sessions older than 24 hours

	for sessionKey, invalidatedAt := range h.invalidatedSessions {
		if invalidatedAt.Before(cutoff) {
			delete(h.invalidatedSessions, sessionKey)
		}
	}
}

// Helper function to generate session keys
func generateSessionKey(username string, timestamp time.Time) string {
	return username + "_" + timestamp.Format("2006-01-02")
}

// LogoutWithRedirect handles logout and provides redirect URL
func (h *LogoutHandler) LogoutWithRedirect(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r)
	username := "unknown"
	if user != nil {
		username = user.Username
	}

	// Get redirect URL from query parameter or use default
	redirectURL := r.URL.Query().Get("redirect_url")
	if redirectURL == "" {
		redirectURL = "/login"
	}

	// Clear authentication
	w.Header().Set("WWW-Authenticate", "Basic realm=\"Logged Out - Redirecting\"")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\"")

	w.WriteHeader(http.StatusUnauthorized)

	response := map[string]interface{}{
		"message":      "User " + username + " logged out",
		"success":      true,
		"redirect_url": redirectURL,
		"method":       "logout_with_redirect",
		"timestamp":    time.Now(),
		"instructions": map[string]string{
			"frontend": "Redirect user to: " + redirectURL,
			"cleanup":  "Clear local authentication state",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// IsSessionInvalidated checks if a session key has been invalidated
func (h *LogoutHandler) IsSessionInvalidated(sessionKey string) bool {
	_, exists := h.invalidatedSessions[sessionKey]
	return exists
}

// InvalidateSession manually invalidates a session
func (h *LogoutHandler) InvalidateSession(username string) {
	sessionKey := generateSessionKey(username, time.Now())
	h.invalidatedSessions[sessionKey] = time.Now()
}
