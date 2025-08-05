package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

type MedicalRecordHandler struct {
	service *services.MedicalRecordService
}

func NewMedicalRecordHandler() *MedicalRecordHandler {
	return &MedicalRecordHandler{
		service: services.NewMedicalRecordService(),
	}
}

func (h *MedicalRecordHandler) CreateMedicalRecord(w http.ResponseWriter, r *http.Request) {
	// middleware.RequireRole(models.ROLE_DOCTOR)

	var record models.MedicalRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.CreateMedicalRecord(&record); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

func (h *MedicalRecordHandler) GetMedicalRecords(w http.ResponseWriter, r *http.Request) {
	// middleware.RequireRole(models.ROLE_DOCTOR, models.ROLE_NURSE)

	// user, ok := middleware.GetUserFromContext(r)
	// if !ok {
	// 	fmt.Printf("GetMedicalRecords: User not authenticated\n")
	// 	http.Error(w, "User not authenticated", http.StatusUnauthorized)
	// 	return
	// }

	// fmt.Printf("GetMedicalRecords: User role = %s\n", user.Role)

	var (
		records interface{}
		err     error
	)

	records, err = h.service.GetNurseViewRecords()

	// if user.Role == models.ROLE_NURSE {
	// 	fmt.Printf("GetMedicalRecords: Fetching nurse view records\n")
	// 	records, err = h.service.GetNurseViewRecords()
	// } else {
	// 	fmt.Printf("GetMedicalRecords: Fetching full medical records\n")
	// 	records, err = h.service.GetMedicalRecords()
	// }

	if err != nil {
		fmt.Printf("GetMedicalRecords: Error fetching records: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("GetMedicalRecords: Successfully fetched records, returning response\n")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

func (h *MedicalRecordHandler) GetMedicalRecord(w http.ResponseWriter, r *http.Request) {
	// middleware.RequireRole(models.ROLE_DOCTOR, models.ROLE_NURSE)

	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid record ID", http.StatusBadRequest)
		return
	}

	var record interface{}
	if user.Role == models.ROLE_NURSE {
		record, err = h.service.GetNurseRecord(id)
	} else {
		record, err = h.service.GetMedicalRecord(id)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Medical record not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

func (h *MedicalRecordHandler) GetMedicalRecordsByPatient(w http.ResponseWriter, r *http.Request) {
	// middleware.RequireRole(models.ROLE_DOCTOR, models.ROLE_NURSE)

	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	patientId, err := strconv.Atoi(vars["patientId"])
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	var records interface{}
	if user.Role == models.ROLE_NURSE {
		records, err = h.service.GetNurseRecordsByPatient(patientId)
	} else {
		records, err = h.service.GetMedicalRecordsByPatient(patientId)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No medical records found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}
