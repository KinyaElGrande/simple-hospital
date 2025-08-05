package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/kinyaelgrande/simple-hospital/middleware"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// Login endpoint - just returns success if credentials are valid
// (Authentication is handled by middleware)
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	// If we reach here, authentication was successful
	// The user is already in the context from middleware
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"message": "Login successful",
		"user": map[string]interface{}{
			"id":               user.UserID,
			"username":         user.Username,
			"role":             strings.ToLower(user.Role),
			"fullName":         user.FullName,
			"twoFactorEnabled": user.TwoFAEnabled,
		},
	}
	json.NewEncoder(w).Encode(response)
}

// Logout endpoint - clears authentication by sending 401 with WWW-Authenticate header
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Clear any cached credentials by sending a 401 response
	// This forces the browser to forget Basic Auth credentials
	w.Header().Set("WWW-Authenticate", "Basic realm=\"Hospital System - Logged Out\"")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)

	response := map[string]interface{}{
		"message": "Logged out successfully",
		"status":  "unauthorized",
		"action":  "Please close browser or use incognito mode for complete logout",
	}
	json.NewEncoder(w).Encode(response)
}

// ClearAuth endpoint - alternative logout method that returns success but instructs browser cleanup
func (h *AuthHandler) ClearAuth(w http.ResponseWriter, r *http.Request) {
	// Return success but with instructions to clear browser cache
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\"")
	w.WriteHeader(http.StatusOK)

	response := map[string]interface{}{
		"message":     "Authentication cleared",
		"success":     true,
		"instruction": "Browser authentication cache should be cleared",
		"note":        "For complete logout, close browser or use incognito mode",
	}
	json.NewEncoder(w).Encode(response)
}
