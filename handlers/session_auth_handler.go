package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
	"golang.org/x/crypto/bcrypt"
)

// Session represents an active user session
type Session struct {
	SessionID      string    `json:"sessionId"`
	UserID         int       `json:"userId"`
	Username       string    `json:"username"`
	Role           string    `json:"role"`
	FullName       string    `json:"fullName"`
	TwoFAEnabled   bool      `json:"twoFactorEnabled"`
	TwoFAVerified  bool      `json:"twoFactorVerified"`
	CreatedAt      time.Time `json:"createdAt"`
	LastAccessedAt time.Time `json:"lastAccessedAt"`
	ExpiresAt      time.Time `json:"expiresAt"`
}

// SessionManager manages user sessions in memory
type SessionManager struct {
	sessions map[string]*Session
}

// NewSessionManager creates a new session manager
func NewSessionManager() *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*Session),
	}
}

// CreateSession creates a new session for a user
func (sm *SessionManager) CreateSession(user *models.User, twoFAVerified bool) (*Session, error) {
	// Generate random session ID
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	sessionID := hex.EncodeToString(bytes)

	// Create session with 24 hour expiry
	session := &Session{
		SessionID:      sessionID,
		UserID:         user.UserID,
		Username:       user.Username,
		Role:           user.Role,
		FullName:       user.FullName,
		TwoFAEnabled:   user.TwoFAEnabled,
		TwoFAVerified:  twoFAVerified,
		CreatedAt:      time.Now(),
		LastAccessedAt: time.Now(),
		ExpiresAt:      time.Now().Add(24 * time.Hour),
	}

	// Store session
	sm.sessions[sessionID] = session

	return session, nil
}

// GetSession retrieves a session by ID
func (sm *SessionManager) GetSession(sessionID string) (*Session, bool) {
	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, false
	}

	// Check if session has expired
	if time.Now().After(session.ExpiresAt) {
		delete(sm.sessions, sessionID)
		return nil, false
	}

	// Update last accessed time
	session.LastAccessedAt = time.Now()
	return session, true
}

// DeleteSession removes a session
func (sm *SessionManager) DeleteSession(sessionID string) {
	delete(sm.sessions, sessionID)
}

// UpdateSession2FA updates the 2FA verification status of a session
func (sm *SessionManager) UpdateSession2FA(sessionID string, verified bool) bool {
	session, exists := sm.sessions[sessionID]
	if !exists {
		return false
	}
	session.TwoFAVerified = verified
	return true
}

// CleanupExpiredSessions removes expired sessions (should be called periodically)
func (sm *SessionManager) CleanupExpiredSessions() {
	now := time.Now()
	for sessionID, session := range sm.sessions {
		if now.After(session.ExpiresAt) {
			delete(sm.sessions, sessionID)
		}
	}
}

// SessionAuthHandler handles session-based authentication
type SessionAuthHandler struct {
	userService    *services.UserService
	sessionManager *SessionManager
}

// NewSessionAuthHandler creates a new session auth handler
func NewSessionAuthHandler(userService *services.UserService) *SessionAuthHandler {
	return &SessionAuthHandler{
		userService:    userService,
		sessionManager: NewSessionManager(),
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents different types of login responses
type LoginResponse struct {
	Success       bool      `json:"success"`
	Message       string    `json:"message"`
	SessionID     string    `json:"sessionId,omitempty"`
	User          *UserInfo `json:"user,omitempty"`
	Requires2FA   bool      `json:"requires2FA,omitempty"`
	TempSessionID string    `json:"tempSessionId,omitempty"` // For 2FA verification
}

// UserInfo represents user information in responses
type UserInfo struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	FullName     string `json:"fullName"`
	Role         string `json:"role"`
	TwoFAEnabled bool   `json:"twoFactorEnabled"`
}

// TwoFAVerifyRequest represents a 2FA verification request
type TwoFAVerifyRequest struct {
	TempSessionID string `json:"tempSessionId"`
	Code          string `json:"code"`
}

// Login handles user login with optional 2FA
func (h *SessionAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Authenticate user
	user, err := h.authenticateUser(req.Username, req.Password)
	if err != nil {
		response := LoginResponse{
			Success: false,
			Message: "Invalid username or password",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Check if user has 2FA enabled
	if user.TwoFAEnabled {
		// Create temporary session for 2FA verification
		tempSession, err := h.sessionManager.CreateSession(user, false)
		if err != nil {
			http.Error(w, "Failed to create session", http.StatusInternalServerError)
			return
		}

		// Set temp session to expire in 5 minutes
		tempSession.ExpiresAt = time.Now().Add(5 * time.Minute)

		response := LoginResponse{
			Success:       false,
			Message:       "2FA verification required",
			Requires2FA:   true,
			TempSessionID: tempSession.SessionID,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Create full session (no 2FA required)
	session, err := h.sessionManager.CreateSession(user, true)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Return successful login
	response := LoginResponse{
		Success:   true,
		Message:   "Login successful",
		SessionID: session.SessionID,
		User: &UserInfo{
			ID:           user.UserID,
			Username:     user.Username,
			FullName:     user.FullName,
			Role:         user.Role,
			TwoFAEnabled: user.TwoFAEnabled,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Verify2FA handles 2FA code verification
func (h *SessionAuthHandler) Verify2FA(w http.ResponseWriter, r *http.Request) {
	var req TwoFAVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get temporary session
	tempSession, exists := h.sessionManager.GetSession(req.TempSessionID)
	if !exists {
		response := LoginResponse{
			Success: false,
			Message: "Invalid or expired session",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Verify 2FA code
	twoFAService := h.userService.GetTwoFAService()
	valid, err := twoFAService.VerifyTwoFA(tempSession.UserID, req.Code)
	if err != nil || !valid {
		response := LoginResponse{
			Success: false,
			Message: "Invalid 2FA code",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Update session to mark 2FA as verified and extend expiry
	tempSession.TwoFAVerified = true
	tempSession.ExpiresAt = time.Now().Add(24 * time.Hour)

	// Get full user info
	user, err := h.userService.GetUser(tempSession.UserID)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}

	// Return successful 2FA verification
	response := LoginResponse{
		Success:   true,
		Message:   "2FA verification successful",
		SessionID: tempSession.SessionID,
		User: &UserInfo{
			ID:           user.UserID,
			Username:     user.Username,
			FullName:     user.FullName,
			Role:         user.Role,
			TwoFAEnabled: user.TwoFAEnabled,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Logout handles user logout
func (h *SessionAuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		http.Error(w, "No session ID provided", http.StatusBadRequest)
		return
	}

	// Delete session
	h.sessionManager.DeleteSession(sessionID)

	response := map[string]interface{}{
		"success": true,
		"message": "Logged out successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetSessionInfo returns information about the current session
func (h *SessionAuthHandler) GetSessionInfo(w http.ResponseWriter, r *http.Request) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		http.Error(w, "No session ID provided", http.StatusBadRequest)
		return
	}

	session, exists := h.sessionManager.GetSession(sessionID)
	if !exists {
		http.Error(w, "Invalid or expired session", http.StatusUnauthorized)
		return
	}

	response := map[string]interface{}{
		"sessionId": session.SessionID,
		"user": &UserInfo{
			ID:           session.UserID,
			Username:     session.Username,
			FullName:     session.FullName,
			Role:         session.Role,
			TwoFAEnabled: session.TwoFAEnabled,
		},
		"twoFactorVerified": session.TwoFAVerified,
		"createdAt":         session.CreatedAt,
		"lastAccessedAt":    session.LastAccessedAt,
		"expiresAt":         session.ExpiresAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// authenticateUser validates username and password
func (h *SessionAuthHandler) authenticateUser(username, password string) (*models.User, error) {
	user, err := h.userService.GetUserByUsername(username)
	if err != nil {
		return nil, err
	}

	// Compare password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, err
	}

	user.PasswordHash = ""
	return user, nil
}

// GetSessionManager returns the session manager (for middleware use)
func (h *SessionAuthHandler) GetSessionManager() *SessionManager {
	return h.sessionManager
}

// SessionMiddleware creates middleware for session-based authentication
func (h *SessionAuthHandler) SessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.Header.Get("X-Session-ID")
		if sessionID == "" {
			http.Error(w, "Session ID required", http.StatusUnauthorized)
			return
		}

		session, exists := h.sessionManager.GetSession(sessionID)
		if !exists {
			http.Error(w, "Invalid or expired session", http.StatusUnauthorized)
			return
		}

		// Check if 2FA is required but not verified
		if session.TwoFAEnabled && !session.TwoFAVerified {
			http.Error(w, "2FA verification required", http.StatusUnauthorized)
			return
		}

		// Create user object for context
		user := &models.User{
			UserID:       session.UserID,
			Username:     session.Username,
			Role:         session.Role,
			FullName:     session.FullName,
			TwoFAEnabled: session.TwoFAEnabled,
		}

		// Add user to context
		ctx := r.Context()
		ctx = middleware.SetUserContext(ctx, user)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
