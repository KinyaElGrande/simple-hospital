package handlers

import (
	"database/sql"
	"encoding/json"
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
	middleware.RequireRole(models.ROLE_DOCTOR)

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

func (h *MedicalRecordHandler) GetMedicalRecord(w http.ResponseWriter, r *http.Request) {
	middleware.RequireRole(models.ROLE_DOCTOR, models.ROLE_NURSE)

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
