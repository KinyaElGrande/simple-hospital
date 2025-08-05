package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const UserContextKey contextKey = "user"

type TwoFASession struct {
	SessionID     string    `json:"sessionId"`
	UserID        int       `json:"userId"`
	Username      string    `json:"username"`
	CreatedAt     time.Time `json:"createdAt"`
	ExpiresAt     time.Time `json:"expiresAt"`
	Authenticated bool      `json:"authenticated"`
}

type TwoFASessionManager struct {
	sessions map[string]*TwoFASession
	mutex    sync.RWMutex
}

func NewTwoFASessionManager() *TwoFASessionManager {
	manager := &TwoFASessionManager{
		sessions: make(map[string]*TwoFASession),
	}

	// Start cleanup goroutine
	go manager.cleanup()
	return manager
}

// CreateSession creates a new 2FA session
func (sm *TwoFASessionManager) CreateSession(userID int, username string) (*TwoFASession, error) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	// Generate random session ID
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	sessionID := hex.EncodeToString(bytes)

	session := &TwoFASession{
		SessionID:     sessionID,
		UserID:        userID,
		Username:      username,
		CreatedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(15 * time.Minute), // 15 minute expiry
		Authenticated: false,
	}

	sm.sessions[sessionID] = session
	log.Printf("Created 2FA session %s for user %d (%s), expires at %s", sessionID, userID, username, session.ExpiresAt.Format(time.RFC3339))
	return session, nil
}

// GetSession retrieves a session by ID
func (sm *TwoFASessionManager) GetSession(sessionID string) (*TwoFASession, bool) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, false
	}

	// Check if session has expired
	if time.Now().After(session.ExpiresAt) {
		// Don't delete here due to read lock, let cleanup handle it
		return nil, false
	}

	log.Printf("Retrieved 2FA session %s for user %d, authenticated: %t, expires at %s", sessionID, session.UserID, session.Authenticated, session.ExpiresAt.Format(time.RFC3339))
	return session, true
}

// MarkAuthenticated marks a session as fully authenticated
func (sm *TwoFASessionManager) MarkAuthenticated(sessionID string) bool {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists || time.Now().After(session.ExpiresAt) {
		return false
	}

	session.Authenticated = true
	// Extend expiry to 24 hours once fully authenticated
	session.ExpiresAt = time.Now().Add(24 * time.Hour)
	log.Printf("Marked 2FA session %s as authenticated, extended expiry to %s", sessionID, session.ExpiresAt.Format(time.RFC3339))
	return true
}

// DeleteSession removes a session
func (sm *TwoFASessionManager) DeleteSession(sessionID string) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()
	if _, exists := sm.sessions[sessionID]; exists {
		log.Printf("Deleted 2FA session %s", sessionID)
	}
	delete(sm.sessions, sessionID)
}

// cleanup removes expired sessions
func (sm *TwoFASessionManager) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		sm.mutex.Lock()
		now := time.Now()
		expiredCount := 0
		for sessionID, session := range sm.sessions {
			if now.After(session.ExpiresAt) {
				delete(sm.sessions, sessionID)
				expiredCount++
			}
		}
		if expiredCount > 0 {
			log.Printf("Cleaned up %d expired 2FA sessions", expiredCount)
		}
		sm.mutex.Unlock()
	}
}

// GetSessionCount returns the current number of sessions for debugging
func (sm *TwoFASessionManager) GetSessionCount() int {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()
	return len(sm.sessions)
}

// ImprovedAuthMiddleware handles authentication with better 2FA support
type ImprovedAuthMiddleware struct {
	userService         *services.UserService
	twoFASessionManager *TwoFASessionManager
}

// NewImprovedAuthMiddleware creates a new improved auth middleware
func NewImprovedAuthMiddleware(userService *services.UserService) *ImprovedAuthMiddleware {
	return &ImprovedAuthMiddleware{
		userService:         userService,
		twoFASessionManager: NewTwoFASessionManager(),
	}
}

type AuthResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	Requires2FA   bool   `json:"requires2FA,omitempty"`
	TempSessionID string `json:"tempSessionId,omitempty"`
}

func GetUserFromContext(r *http.Request) (*models.User, bool) {
	user, ok := r.Context().Value(UserContextKey).(*models.User)
	return user, ok
}

func (am *ImprovedAuthMiddleware) SmartAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("SmartAuth: Processing request to %s", r.URL.Path)

		// Check for existing 2FA session first
		sessionID := r.Header.Get("X-2FA-Session-ID")
		if sessionID != "" {
			log.Printf("SmartAuth: Found session ID: %s", sessionID)

			// Special handling for basic-auth transition to 2FA
			if sessionID == "basic-auth" {
				log.Printf("SmartAuth: Handling basic-auth transition")
				am.handleBasicAuthTo2FATransition(w, r, next)
				return
			}

			// Check if we also have a 2FA code for verification
			if r.Header.Get("X-2FA-Code") != "" {
				log.Printf("SmartAuth: Handling 2FA verification")
				am.handle2FAVerification(w, r, next, sessionID)
				return
			}

			// Handle existing authenticated session
			log.Printf("SmartAuth: Handling existing session")
			am.handle2FASession(w, r, next, sessionID)
			return
		}

		log.Printf("SmartAuth: No session ID found, falling back to basic auth")
		// Fall back to basic auth
		am.handleBasicAuth(w, r, next)
	})
}

// handle2FASession handles requests with existing 2FA sessions
func (am *ImprovedAuthMiddleware) handle2FASession(w http.ResponseWriter, r *http.Request, next http.Handler, sessionID string) {
	session, exists := am.twoFASessionManager.GetSession(sessionID)
	if !exists {
		log.Printf("2FA session not found or expired: %s", sessionID)
		am.sendJSONError(w, "Invalid or expired 2FA session. Please login again.", http.StatusUnauthorized)
		return
	}

	if !session.Authenticated {
		log.Printf("2FA session not authenticated: %s", sessionID)
		am.sendJSONError(w, "2FA verification required. Please provide your authentication code.", http.StatusUnauthorized)
		return
	}

	// Get user and add to context
	user, err := am.userService.GetUser(session.UserID)
	if err != nil {
		log.Printf("User not found for session %s: %v", sessionID, err)
		am.sendJSONError(w, "User not found", http.StatusUnauthorized)
		return
	}

	// Clear password hash for security
	userCopy := *user
	userCopy.PasswordHash = ""
	ctx := context.WithValue(r.Context(), UserContextKey, &userCopy)
	log.Printf("2FA session authenticated successfully for user %s", user.Username)
	next.ServeHTTP(w, r.WithContext(ctx))
}

// handle2FAVerification handles 2FA code verification
func (am *ImprovedAuthMiddleware) handle2FAVerification(w http.ResponseWriter, r *http.Request, next http.Handler, sessionID string) {
	session, exists := am.twoFASessionManager.GetSession(sessionID)
	if !exists {
		log.Printf("2FA session not found for verification: %s", sessionID)
		am.sendJSONError(w, "Invalid or expired 2FA session. Please login again.", http.StatusUnauthorized)
		return
	}

	twoFACode := r.Header.Get("X-2FA-Code")
	if twoFACode == "" {
		am.sendJSONError(w, "2FA code required", http.StatusUnauthorized)
		return
	}

	// Verify 2FA code
	twoFAService := am.userService.GetTwoFAService()
	log.Printf("Verifying 2FA code for session %s, user %d", sessionID, session.UserID)
	valid, err := twoFAService.VerifyTwoFA(session.UserID, twoFACode)
	if err != nil || !valid {
		log.Printf("2FA verification failed for session %s: valid=%t, error=%v", sessionID, valid, err)
		am.sendJSONError(w, "Invalid 2FA code", http.StatusUnauthorized)
		return
	}

	// Mark session as authenticated
	if !am.twoFASessionManager.MarkAuthenticated(sessionID) {
		log.Printf("Failed to mark session %s as authenticated", sessionID)
		am.sendJSONError(w, "Session expired during verification", http.StatusUnauthorized)
		return
	}

	user, err := am.userService.GetUser(session.UserID)
	if err != nil {
		log.Printf("User not found after 2FA verification: %v", err)
		am.sendJSONError(w, "User not found", http.StatusUnauthorized)
		return
	}

	userCopy := *user
	userCopy.PasswordHash = ""
	ctx := context.WithValue(r.Context(), UserContextKey, &userCopy)
	log.Printf("2FA verification successful for user %s", user.Username)
	next.ServeHTTP(w, r.WithContext(ctx))
}

// handleBasicAuth handles traditional basic authentication
func (am *ImprovedAuthMiddleware) handleBasicAuth(w http.ResponseWriter, r *http.Request, next http.Handler) {
	username, password, ok := r.BasicAuth()
	if !ok {
		log.Printf("No basic auth credentials provided")
		w.Header().Set("WWW-Authenticate", `Basic realm="Hospital Management System"`)
		am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
		return
	}

	log.Printf("Attempting basic auth for user: %s", username)
	user, err := am.authenticateUser(username, password)
	if err != nil {
		log.Printf("Basic auth failed for user %s: %v", username, err)
		am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Check if 2FA is enabled
	if user.TwoFAEnabled {
		log.Printf("User %s has 2FA enabled", username)
		// Check if 2FA code is provided in this request
		twoFACode := r.Header.Get("X-2FA-Code")
		if twoFACode != "" {
			twoFAService := am.userService.GetTwoFAService()
			valid, err := twoFAService.VerifyTwoFA(user.UserID, twoFACode)
			if err != nil || !valid {
				log.Printf("2FA verification failed for user %s: %v", username, err)
				am.sendJSONError(w, "Invalid 2FA code", http.StatusUnauthorized)
				return
			}
			log.Printf("2FA verification successful for user %s", username)
		} else {
			// Create temporary 2FA session
			session, err := am.twoFASessionManager.CreateSession(user.UserID, user.Username)
			if err != nil {
				log.Printf("Failed to create 2FA session for user %s: %v", username, err)
				http.Error(w, "Failed to create 2FA session", http.StatusInternalServerError)
				return
			}

			log.Printf("Created 2FA session %s for user %s", session.SessionID, username)
			response := AuthResponse{
				Success:       false,
				Message:       "2FA code required",
				Requires2FA:   true,
				TempSessionID: session.SessionID,
			}

			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("WWW-Authenticate", `Basic realm="Hospital Management System", 2FA required`)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	// Add user to context and proceed
	userCopy := *user
	userCopy.PasswordHash = ""
	ctx := context.WithValue(r.Context(), UserContextKey, &userCopy)
	log.Printf("Basic auth successful for user %s", username)
	next.ServeHTTP(w, r.WithContext(ctx))
}

// handleBasicAuthTo2FATransition handles the transition from basic auth to 2FA session
func (am *ImprovedAuthMiddleware) handleBasicAuthTo2FATransition(w http.ResponseWriter, r *http.Request, next http.Handler) {
	user, ok := GetUserFromContext(r)

	spew.Dump("weee", user)

	username, password, ok := r.BasicAuth()
	if !ok {
		log.Printf("No basic auth credentials for 2FA transition")
		am.sendJSONError(w, "Authorization required for 2FA transition", http.StatusUnauthorized)
		return
	}

	// Authenticate the user
	user, err := am.authenticateUser(username, password)
	if err != nil {
		log.Printf("Authentication failed for 2FA transition: %v", err)
		am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Check if user has 2FA enabled
	if !user.TwoFAEnabled {
		log.Printf("User %s doesn't have 2FA enabled, proceeding with basic auth", username)
		userCopy := *user
		userCopy.PasswordHash = ""
		ctx := context.WithValue(r.Context(), UserContextKey, &userCopy)
		next.ServeHTTP(w, r.WithContext(ctx))
		return
	}

	// User has 2FA enabled, create a new 2FA session
	session, err := am.twoFASessionManager.CreateSession(user.UserID, user.Username)
	if err != nil {
		log.Printf("Failed to create 2FA session for basic-auth transition: %v", err)
		am.sendJSONError(w, "Failed to create 2FA session", http.StatusInternalServerError)
		return
	}

	log.Printf("Created new 2FA session %s for basic-auth transition, user: %s", session.SessionID, username)

	// Return response indicating 2FA is required with the new session ID
	response := AuthResponse{
		Success:       false,
		Message:       "2FA verification required. Please provide your authentication code.",
		Requires2FA:   true,
		TempSessionID: session.SessionID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-New-2FA-Session-ID", session.SessionID) // Provide new session ID in header
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(response)
}

// authenticateUser validates username and password
func (am *ImprovedAuthMiddleware) authenticateUser(username, password string) (*models.User, error) {
	user, err := am.userService.GetUserByUsername(username)
	if err != nil {
		return nil, err
	}

	// Compare password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, err
	}

	return user, nil
}

// sendJSONError sends a JSON error response
func (am *ImprovedAuthMiddleware) sendJSONError(w http.ResponseWriter, message string, statusCode int) {
	response := AuthResponse{
		Success: false,
		Message: message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func (am *ImprovedAuthMiddleware) GetTwoFASessionManager() *TwoFASessionManager {
	return am.twoFASessionManager
}

func (am *ImprovedAuthMiddleware) Setup2FAEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if !ok {
			am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := am.authenticateUser(username, password)
		if err != nil {
			am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Allow access to 2FA setup regardless of current 2FA status
		// Add user to context and proceed to next handler (which will be the 2FA setup handler)
		userCopy := *user
		userCopy.PasswordHash = ""
		_ = context.WithValue(r.Context(), UserContextKey, &userCopy)

		// For setup endpoint, we'll call the 2FA handler directly
		twoFAService := am.userService.GetTwoFAService()
		setup, err := twoFAService.GenerateTwoFASetup(user.Username)
		if err != nil {
			http.Error(w, "Failed to generate 2FA setup", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(setup)
	}
}

func (am *ImprovedAuthMiddleware) Enable2FAEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if !ok {
			am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := am.authenticateUser(username, password)
		if err != nil {
			am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
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

		twoFAService := am.userService.GetTwoFAService()
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
}

// The rest of the endpoint methods remain the same...
// (Create2FAEndpoint, Verify2FAEndpoint, LogoutEndpoint, etc.)

// Create2FAEndpoint creates an endpoint for 2FA initiation
func (am *ImprovedAuthMiddleware) Create2FAEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if !ok {
			am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := am.authenticateUser(username, password)
		if err != nil {
			am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		if !user.TwoFAEnabled {
			// User doesn't have 2FA enabled, require setup
			response := AuthResponse{
				Success:       false,
				Message:       "2FA setup required",
				Requires2FA:   true,
				TempSessionID: "setup-required",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPreconditionRequired)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Create 2FA session
		session, err := am.twoFASessionManager.CreateSession(user.UserID, user.Username)
		if err != nil {
			http.Error(w, "Failed to create 2FA session", http.StatusInternalServerError)
			return
		}

		response := AuthResponse{
			Success:       true,
			Message:       "2FA verification required",
			Requires2FA:   true,
			TempSessionID: session.SessionID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-New-2FA-Session-ID", session.SessionID)
		json.NewEncoder(w).Encode(response)
	}
}

// Create2FAMiddleware creates middleware for 2FA initiation that can be chained
func (am *ImprovedAuthMiddleware) Create2FAMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if !ok {
			am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := am.authenticateUser(username, password)
		if err != nil {
			am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		if !user.TwoFAEnabled {
			// User doesn't have 2FA enabled, add user to context and pass to next middleware
			userCopy := *user
			userCopy.PasswordHash = ""
			ctx := context.WithValue(r.Context(), UserContextKey, &userCopy)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Create 2FA session
		session, err := am.twoFASessionManager.CreateSession(user.UserID, user.Username)
		if err != nil {
			http.Error(w, "Failed to create 2FA session", http.StatusInternalServerError)
			return
		}

		response := AuthResponse{
			Success:       true,
			Message:       "2FA verification required",
			Requires2FA:   true,
			TempSessionID: session.SessionID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-New-2FA-Session-ID", session.SessionID)
		json.NewEncoder(w).Encode(response)
	})
}

// Verify2FAEndpoint creates an endpoint for 2FA verification
func (am *ImprovedAuthMiddleware) Verify2FAEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		type Verify2FARequest struct {
			SessionID string `json:"sessionId"`
			Code      string `json:"code"`
		}

		var req Verify2FARequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			am.sendJSONError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		session, exists := am.twoFASessionManager.GetSession(req.SessionID)
		if !exists {
			am.sendJSONError(w, "Invalid or expired 2FA session. Please login again.", http.StatusUnauthorized)
			return
		}

		// Verify 2FA code
		twoFAService := am.userService.GetTwoFAService()
		valid, err := twoFAService.VerifyTwoFA(session.UserID, req.Code)
		if err != nil || !valid {
			am.sendJSONError(w, "Invalid 2FA code", http.StatusUnauthorized)
			return
		}

		// Mark session as authenticated
		am.twoFASessionManager.MarkAuthenticated(req.SessionID)

		response := AuthResponse{
			Success: true,
			Message: "2FA verification successful",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// LogoutEndpoint creates an endpoint to handle logout
func (am *ImprovedAuthMiddleware) LogoutEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.Header.Get("X-2FA-Session-ID")
		if sessionID == "" {
			sessionID = r.URL.Query().Get("sessionId")
		}

		if sessionID == "" {
			response := map[string]interface{}{
				"success": false,
				"message": "No session ID provided",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Delete the session
		am.twoFASessionManager.DeleteSession(sessionID)

		response := map[string]interface{}{
			"success": true,
			"message": "Logged out successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// BasicAuthTo2FATransitionEndpoint creates an endpoint to handle basic-auth to 2FA transition
func (am *ImprovedAuthMiddleware) BasicAuthTo2FATransitionEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get basic auth credentials
		username, password, ok := r.BasicAuth()
		if !ok {
			am.sendJSONError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		// Authenticate the user
		user, err := am.authenticateUser(username, password)
		if err != nil {
			am.sendJSONError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Check if user has 2FA enabled
		if !user.TwoFAEnabled {
			response := AuthResponse{
				Success:     true,
				Message:     "User does not have 2FA enabled",
				Requires2FA: false,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		// Create new 2FA session
		session, err := am.twoFASessionManager.CreateSession(user.UserID, user.Username)
		if err != nil {
			log.Printf("Failed to create 2FA session for transition: %v", err)
			am.sendJSONError(w, "Failed to create 2FA session", http.StatusInternalServerError)
			return
		}

		log.Printf("Created 2FA transition session %s for user %s", session.SessionID, username)

		response := AuthResponse{
			Success:       true,
			Message:       "2FA session created. Please provide your authentication code.",
			Requires2FA:   true,
			TempSessionID: session.SessionID,
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-New-2FA-Session-ID", session.SessionID)
		json.NewEncoder(w).Encode(response)
	}
}

// ClearAllSessionsEndpoint creates an endpoint to clear all sessions (admin only)
func (am *ImprovedAuthMiddleware) ClearAllSessionsEndpoint() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get current user from context
		user, ok := GetUserFromContext(r)
		if !ok {
			response := map[string]interface{}{
				"success": false,
				"message": "Authentication required",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Check if user is admin
		if user.Role != "admin" {
			response := map[string]interface{}{
				"success": false,
				"message": "Admin privileges required",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Clear all sessions
		am.twoFASessionManager.mutex.Lock()
		sessionCount := len(am.twoFASessionManager.sessions)
		am.twoFASessionManager.sessions = make(map[string]*TwoFASession)
		am.twoFASessionManager.mutex.Unlock()

		response := map[string]interface{}{
			"success":         true,
			"message":         "All sessions cleared",
			"clearedSessions": sessionCount,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
