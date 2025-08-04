package handlers

import (
	"encoding/json"
	"net/http"

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
			"user_id":   user.UserID,
			"username":  user.Username,
			"role":      user.Role,
			"full_name": user.FullName,
		},
	}
	json.NewEncoder(w).Encode(response)
}
