package middleware

import (
	"context"
	"net/http"
	"slices"

	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
	"golang.org/x/crypto/bcrypt"
)

// Context key for storing user info
type contextKey string

const UserContextKey contextKey = "user"

// AuthMiddleware handles basic authentication
type AuthMiddleware struct {
	userService *services.UserService
}

func NewAuthMiddleware(userService *services.UserService) *AuthMiddleware {
	return &AuthMiddleware{
		userService: userService,
	}
}

// BasicAuth middleware function
func (am *AuthMiddleware) BasicAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if !ok {
			http.Error(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		user, err := am.authenticateUser(username, password)
		if err != nil {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// if 2FA is enabled for this user
		if user.TwoFAEnabled {
			twoFACode := r.Header.Get("X-2FA-Code")
			if twoFACode == "" {
				// Return 401 with a custom header indicating 2FA is required
				w.Header().Set("WWW-Authenticate", "Basic realm=\"Simple Hospital System\", 2FA required")
				http.Error(w, "2FA code required", http.StatusUnauthorized)
				return
			}

			// Verify 2FA code
			twoFAService := am.userService.GetTwoFAService()
			valid, err := twoFAService.VerifyTwoFA(user.UserID, twoFACode)
			if err != nil || !valid {
				http.Error(w, "Invalid 2FA code", http.StatusUnauthorized)
				return
			}
		}

		// Add user to context
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// authenticateUser validates username and password
func (am *AuthMiddleware) authenticateUser(username, password string) (*models.User, error) {
	user, err := am.userService.GetUserByUsername(username)
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

func GetUserFromContext(r *http.Request) (*models.User, bool) {
	user, ok := r.Context().Value(UserContextKey).(*models.User)
	return user, ok
}

// RequireRole middleware to check user role
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := GetUserFromContext(r)
			if !ok {
				http.Error(w, "User not authenticated", http.StatusUnauthorized)
				return
			}

			// add admin by default
			allowedRoles = append(allowedRoles, models.ROLE_ADMIN)

			// Check if user role is in allowed roles
			allowed := slices.Contains(allowedRoles, user.Role)

			if !allowed {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
