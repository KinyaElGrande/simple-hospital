package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	gorillaHandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/handlers"
	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

func generateSelfSignedCert() error {
	// Generate private key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %v", err)
	}

	// Create certificate template
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization:  []string{"Hospital Management System"},
			Country:       []string{"US"},
			Province:      []string{""},
			Locality:      []string{"San Francisco"},
			StreetAddress: []string{""},
			PostalCode:    []string{""},
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour), // Valid for 1 year
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:           []net.IP{net.IPv4(127, 0, 0, 1)},
		DNSNames:              []string{"localhost"},
		BasicConstraintsValid: true,
	}

	// Create certificate
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %v", err)
	}

	// Create certs directory if it doesn't exist
	if err := os.MkdirAll("certs", 0755); err != nil {
		return fmt.Errorf("failed to create certs directory: %v", err)
	}

	// Save certificate
	certOut, err := os.Create("certs/server.crt")
	if err != nil {
		return fmt.Errorf("failed to create cert file: %v", err)
	}
	defer certOut.Close()

	pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: certDER})

	// Save private key
	keyOut, err := os.Create("certs/server.key")
	if err != nil {
		return fmt.Errorf("failed to create key file: %v", err)
	}
	defer keyOut.Close()

	privateKeyDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %v", err)
	}

	pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: privateKeyDER})

	slog.Info("Self-signed certificate generated: certs/server.crt and certs/server.key")
	return nil
}

func main() {
	// Initialize database
	slog.Info("Initializing database")
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	slog.Info("Database initialized")
	defer database.GetDB().Close()

	userService := services.NewUserService()

	// create an admin user
	admin := models.User{
		Username:     "admin",
		PasswordHash: "password",
		Role:         models.ROLE_ADMIN,
		FullName:     "Admin User",
	}
	err := userService.CreateUser(&admin)
	if err != nil && !strings.Contains(err.Error(), "UNIQUE constraint failed") {
		log.Fatal("Error creating admin user:", err)
	}
	if err == nil {
		slog.Info("Admin user created successfully")
	} else {
		slog.Info("Admin user already exists")
	}

	// Create handlers
	patientHandler := handlers.NewPatientHandler()
	userHandler := handlers.NewUserHandler()
	medicalRecordHandler := handlers.NewMedicalRecordHandler()
	prescriptionHandler := handlers.NewPrescriptionHandler()
	authHandler := handlers.NewAuthHandler()
	twoFAHandler := handlers.NewTwoFAHandler(userService)
	sessionAuthHandler := handlers.NewSessionAuthHandler(userService)
	logoutHandler := handlers.NewLogoutHandler()

	// Auth middleware - create single instance to share session manager
	authMiddleware := middleware.NewAuthMiddleware(userService)
	improvedAuthMiddleware := middleware.NewImprovedAuthMiddleware(userService)

	router := mux.NewRouter()

	// Health check endpoint (no auth required)
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "Hospital Management System",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")

	// Public authentication endpoints (no auth middleware)
	authRouter := router.PathPrefix("/api/auth").Subrouter()

	// 2FA authentication endpoints
	authRouter.HandleFunc("/2fa/initiate", improvedAuthMiddleware.Create2FAEndpoint()).Methods("POST")
	authRouter.HandleFunc("/2fa/verify", improvedAuthMiddleware.Verify2FAEndpoint()).Methods("POST")
	authRouter.HandleFunc("/2fa/logout", improvedAuthMiddleware.LogoutEndpoint()).Methods("POST")
	authRouter.HandleFunc("/2fa/transition", improvedAuthMiddleware.BasicAuthTo2FATransitionEndpoint()).Methods("POST")
	// 2FA setup endpoints (work with basic auth)
	authRouter.HandleFunc("/2fa/setup", improvedAuthMiddleware.Setup2FAEndpoint()).Methods("GET")
	authRouter.HandleFunc("/2fa/enable", improvedAuthMiddleware.Enable2FAEndpoint()).Methods("POST")

	// Session-based authentication routes (alternative implementation)
	authRouter.HandleFunc("/login", sessionAuthHandler.Login).Methods("POST")
	authRouter.HandleFunc("/verify-2fa", sessionAuthHandler.Verify2FA).Methods("POST")
	authRouter.HandleFunc("/logout", sessionAuthHandler.Logout).Methods("POST")
	authRouter.HandleFunc("/session", sessionAuthHandler.GetSessionInfo).Methods("GET")

	// Legacy login route with basic auth
	router.Handle("/login", improvedAuthMiddleware.SmartAuth(http.HandlerFunc(authHandler.Login))).Methods("POST")

	// Debug endpoints
	router.HandleFunc("/api/auth/2fa/debug/sessions", func(w http.ResponseWriter, r *http.Request) {
		sessionManager := improvedAuthMiddleware.GetTwoFASessionManager()
		sessionCount := sessionManager.GetSessionCount()

		response := map[string]interface{}{
			"totalSessions": sessionCount,
			"currentTime":   time.Now().Format(time.RFC3339),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")

	logoutRouter := router.PathPrefix("/").Subrouter()
	logoutRouter.Handle("/logout", authMiddleware.BasicAuth(http.HandlerFunc(logoutHandler.BasicAuthLogout))).Methods("POST", "GET")
	logoutRouter.Handle("/api/auth/logout-basic", authMiddleware.BasicAuth(http.HandlerFunc(logoutHandler.BasicAuthLogout))).Methods("POST", "GET")
	logoutRouter.Handle("/api/logout/soft", authMiddleware.BasicAuth(http.HandlerFunc(logoutHandler.SoftLogout))).Methods("POST", "GET")
	logoutRouter.Handle("/api/logout/force", authMiddleware.BasicAuth(http.HandlerFunc(logoutHandler.ForceLogout))).Methods("POST", "GET")
	logoutRouter.Handle("/api/logout/redirect", authMiddleware.BasicAuth(http.HandlerFunc(logoutHandler.LogoutWithRedirect))).Methods("POST", "GET")
	logoutRouter.HandleFunc("/api/logout/status", logoutHandler.LogoutStatus).Methods("GET")
	logoutRouter.Handle("/api/auth/clear", authMiddleware.BasicAuth(http.HandlerFunc(authHandler.ClearAuth))).Methods("POST", "GET")

	// Development mode - check environment variable
	devMode := os.Getenv("DEV_MODE") == "true"
	if devMode {
		slog.Info("Development mode enabled - 2FA requirement bypassed")
	}

	// Protected routes with improved authentication (supports both basic auth and 2FA sessions)
	protectedRouter := router.PathPrefix("/api").Subrouter()
	protectedRouter.Use(authMiddleware.WebappBasicAuth)

	// Patient endpoints
	protectedRouter.HandleFunc("/patients", patientHandler.CreatePatient).Methods("POST")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.GetPatient).Methods("GET")
	protectedRouter.HandleFunc("/patients", patientHandler.GetAllPatients).Methods("GET")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.UpdatePatient).Methods("PUT")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.DeletePatient).Methods("DELETE")

	// User endpoints
	protectedRouter.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	protectedRouter.HandleFunc("/users", userHandler.GetUsers).Methods("GET")
	protectedRouter.HandleFunc("/users/{id}", userHandler.GetUser).Methods("GET")

	// Medical Record endpoints
	protectedRouter.HandleFunc("/medical-records", medicalRecordHandler.CreateMedicalRecord).Methods("POST")
	protectedRouter.HandleFunc("/medical-records", medicalRecordHandler.GetMedicalRecords).Methods("GET")
	protectedRouter.HandleFunc("/medical-records/{id}", medicalRecordHandler.GetMedicalRecord).Methods("GET")
	protectedRouter.HandleFunc("/patients/{patientId}/medical-records", medicalRecordHandler.GetMedicalRecordsByPatient).Methods("GET")

	// Prescription endpoints
	protectedRouter.HandleFunc("/prescriptions", prescriptionHandler.CreatePrescription).Methods("POST")
	protectedRouter.HandleFunc("/prescriptions", prescriptionHandler.GetPrescriptions).Methods("GET")
	protectedRouter.HandleFunc("/prescriptions/{id}", prescriptionHandler.GetPrescription).Methods("GET")
	protectedRouter.HandleFunc("/patients/{patientId}/prescriptions", prescriptionHandler.GetPrescriptionsByPatient).Methods("GET")

	// Two Factor Authentication endpoints (protected routes)
	twoFARouter := protectedRouter.PathPrefix("/2fa").Subrouter()
	twoFARouter.HandleFunc("/setup", twoFAHandler.GenerateTwoFASetup).Methods("GET")
	twoFARouter.HandleFunc("/enable", twoFAHandler.EnableTwoFA).Methods("POST")
	twoFARouter.HandleFunc("/disable", twoFAHandler.DisableTwoFA).Methods("POST")
	twoFARouter.HandleFunc("/status", twoFAHandler.GetTwoFAStatus).Methods("GET")
	twoFARouter.HandleFunc("/verify", twoFAHandler.VerifyTwoFACode).Methods("POST")
	twoFARouter.HandleFunc("/debug/time", twoFAHandler.GetServerTime).Methods("GET")
	twoFARouter.HandleFunc("/debug/generate", twoFAHandler.GenerateCurrentTOTP).Methods("POST")

	// Admin-only session management endpoints
	adminRouter := protectedRouter.PathPrefix("/admin").Subrouter()
	adminRouter.HandleFunc("/sessions/clear-all", improvedAuthMiddleware.ClearAllSessionsEndpoint()).Methods("POST")

	// Check if SSL certificates exist, generate if not
	certPath := "certs/server.crt"
	keyPath := "certs/server.key"

	if _, err := os.Stat(certPath); os.IsNotExist(err) {
		if _, err := os.Stat(keyPath); os.IsNotExist(err) {
			slog.Info("SSL certificates not found, generating self-signed certificates...")
			if err := generateSelfSignedCert(); err != nil {
				log.Fatal("Failed to generate SSL certificates:", err)
			}
		}
	}

	// CORS configuration with proper headers for 2FA
	corsHandler := gorillaHandlers.CORS(
		gorillaHandlers.AllowedOrigins([]string{
			"http://localhost:5173",
			"https://localhost:5173",
			"http://localhost:3000",
			"https://localhost:3000",
		}),
		gorillaHandlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorillaHandlers.AllowedHeaders([]string{
			"Content-Type",
			"Authorization",
			"X-2FA-Session-ID",
			"X-2FA-Code",
			"X-New-2FA-Session-ID",
		}),
		gorillaHandlers.ExposedHeaders([]string{
			"X-New-2FA-Session-ID",
			"WWW-Authenticate",
		}),
		gorillaHandlers.AllowCredentials(),
	)(router)

	// TLS configuration
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		CipherSuites: []uint16{
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	}

	server := &http.Server{
		Addr:         ":8443",
		Handler:      corsHandler,
		TLSConfig:    tlsConfig,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start HTTP redirect server
	go func() {
		redirectHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			target := "https://" + r.Host + r.URL.Path
			if len(r.URL.RawQuery) > 0 {
				target += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, target, http.StatusPermanentRedirect)
		})

		slog.Info("HTTP redirect server started on port 8080")
		log.Fatal(http.ListenAndServe(":8080", redirectHandler))
	}()

	slog.Info("HTTPS server started on port 8443")
	slog.Info("Available endpoints:")
	slog.Info("  Health check: GET /health")
	slog.Info("  2FA Auth: POST /api/auth/2fa/initiate")
	slog.Info("  2FA Verify: POST /api/auth/2fa/verify")
	slog.Info("  2FA Logout: POST /api/auth/2fa/logout")
	slog.Info("  Protected API: /api/* (requires authentication)")
	slog.Info("  Admin endpoints: /api/admin/* (requires admin role)")

	log.Fatal(server.ListenAndServeTLS(certPath, keyPath))
}
