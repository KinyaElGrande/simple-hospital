package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/services"
)

type TwoFAHandler struct {
	userService *services.UserService
}

func NewTwoFAHandler(userService *services.UserService) *TwoFAHandler {
	return &TwoFAHandler{
		userService: userService,
	}
}

// GenerateTwoFASetup generates 2FA setup information
func (h *TwoFAHandler) GenerateTwoFASetup(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	twoFAService := h.userService.GetTwoFAService()
	setup, err := twoFAService.GenerateTwoFASetup(user.Username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(setup)
}

// EnableTwoFA enables 2FA for the authenticated user
func (h *TwoFAHandler) EnableTwoFA(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	type EnableRequest struct {
		Secret string `json:"secret"`
		Code   string `json:"code"`
	}

	var req EnableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	twoFAService := h.userService.GetTwoFAService()
	err := twoFAService.EnableTwoFA(user.UserID, req.Secret, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "2FA enabled successfully"})
}

// DisableTwoFA disables 2FA for the authenticated user
func (h *TwoFAHandler) DisableTwoFA(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	twoFAService := h.userService.GetTwoFAService()
	err := twoFAService.DisableTwoFA(user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "2FA disabled successfully"})
}

// GetTwoFAStatus gets the 2FA status for the authenticated user
func (h *TwoFAHandler) GetTwoFAStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	twoFAService := h.userService.GetTwoFAService()
	enabled, err := twoFAService.GetUserTwoFAStatus(user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"enabled": enabled})
}

// VerifyTwoFACode verifies a 2FA code (for testing purposes)
func (h *TwoFAHandler) VerifyTwoFACode(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	type VerifyRequest struct {
		Code string `json:"code"`
	}

	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	twoFAService := h.userService.GetTwoFAService()
	valid, err := twoFAService.VerifyTwoFA(user.UserID, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"valid": valid})
}
