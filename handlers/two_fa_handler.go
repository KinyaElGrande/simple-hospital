package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/services"
	"github.com/pquerna/otp/totp"
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
	backupCodes, err := twoFAService.EnableTwoFA(user.UserID, req.Secret, req.Code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"message":     "2FA enabled successfully",
		"backupCodes": backupCodes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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
	json.NewEncoder(w).Encode(map[string]any{"enabled": enabled, "user": user})
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

// GetServerTime returns the current server time for debugging time sync issues
func (h *TwoFAHandler) GetServerTime(w http.ResponseWriter, r *http.Request) {
	serverTime := time.Now()

	response := map[string]interface{}{
		"serverTime": serverTime.Format(time.RFC3339),
		"unix":       serverTime.Unix(),
		"utc":        serverTime.UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GenerateCurrentTOTP generates the current TOTP code for debugging
func (h *TwoFAHandler) GenerateCurrentTOTP(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	type GenerateRequest struct {
		Secret string `json:"secret"`
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Secret == "" {
		http.Error(w, "Secret is required", http.StatusBadRequest)
		return
	}

	// Generate current TOTP code
	currentCode, err := totp.GenerateCode(req.Secret, time.Now())
	if err != nil {
		http.Error(w, "Failed to generate TOTP code", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"currentCode": currentCode,
		"serverTime":  time.Now().Format(time.RFC3339),
		"unix":        time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
