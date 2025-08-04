package main

import (
	"log"
	"log/slog"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/handlers"
	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

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
		PasswordHash: "adminPassword",
		Role:         models.ROLE_ADMIN,
		FullName:     "Admin User",
	}
	err := userService.CreateUser(&admin)
	if err != nil {
		log.Fatal("Error creating admin user:", err)
	}

	// Create handlers
	patientHandler := handlers.NewPatientHandler()
	userHandler := handlers.NewUserHandler()
	medicalRecordHandler := handlers.NewMedicalRecordHandler()
	prescriptionHandler := handlers.NewPrescriptionHandler()
	authHandler := handlers.NewAuthHandler()
	twoFAHandler := handlers.NewTwoFAHandler(userService)

	//auth middleware
	authMiddleware := middleware.NewAuthMiddleware(userService)

	router := mux.NewRouter()

	// Login route with basic auth
	router.Handle("/login", authMiddleware.BasicAuth(http.HandlerFunc(authHandler.Login))).Methods("POST")

	// Protected routes with basic authentication
	protectedRouter := router.PathPrefix("/api").Subrouter()
	protectedRouter.Use(authMiddleware.BasicAuth)

	// Patient endpoints
	protectedRouter.HandleFunc("/patients", patientHandler.CreatePatient).Methods("POST")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.GetPatient).Methods("GET")
	protectedRouter.HandleFunc("/patients", patientHandler.GetAllPatients).Methods("GET")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.UpdatePatient).Methods("PUT")
	protectedRouter.HandleFunc("/patients/{id}", patientHandler.DeletePatient).Methods("DELETE")

	// User endpoints
	protectedRouter.HandleFunc("/users", userHandler.CreateUser).Methods("POST")
	protectedRouter.HandleFunc("/users/{id}", userHandler.GetUser).Methods("GET")

	// Two Factor Authentication endpoints
	protectedRouter.HandleFunc("/2fa/setup", twoFAHandler.GenerateTwoFASetup).Methods("GET")
	protectedRouter.HandleFunc("/2fa/enable", twoFAHandler.EnableTwoFA).Methods("POST")
	protectedRouter.HandleFunc("/2fa/disable", twoFAHandler.DisableTwoFA).Methods("POST")
	protectedRouter.HandleFunc("/2fa/status", twoFAHandler.GetTwoFAStatus).Methods("GET")
	protectedRouter.HandleFunc("/2fa/verify", twoFAHandler.VerifyTwoFACode).Methods("POST")

	// Medical Record endpoints
	protectedRouter.HandleFunc("/medical-records", medicalRecordHandler.CreateMedicalRecord).Methods("POST")
	protectedRouter.HandleFunc("/medical-records/{id}", medicalRecordHandler.GetMedicalRecord).Methods("GET")
	//protectedRouter.HandleFunc("/patients/{patientId}/medical-records", medicalRecordHandler.GetMedicalRecordsByPatient).Methods("GET")

	// Prescription endpoints
	protectedRouter.HandleFunc("/prescriptions", prescriptionHandler.CreatePrescription).Methods("POST")
	protectedRouter.HandleFunc("/prescriptions/{id}", prescriptionHandler.GetPrescription).Methods("GET")

	slog.Info("Server started on port 8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
