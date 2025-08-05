package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

type PatientHandler struct {
	service *services.PatientService
}

func NewPatientHandler() *PatientHandler {
	return &PatientHandler{
		service: services.NewPatientService(),
	}
}

func (h *PatientHandler) CreatePatient(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("CreatePatient handler called for patient creation\n")
	var patient models.Patient
	if err := json.NewDecoder(r.Body).Decode(&patient); err != nil {
		fmt.Printf("Error decoding patient JSON: %v\n", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fmt.Printf("Creating patient: %s %s\n", patient.FirstName, patient.LastName)
	if err := h.service.CreatePatient(&patient); err != nil {
		fmt.Printf("Error creating patient in service: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Patient created successfully with ID: %d\n", patient.PatientID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient)
}

func (h *PatientHandler) GetPatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	patient, err := h.service.GetPatient(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Patient not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient)
}

func (h *PatientHandler) GetAllPatients(w http.ResponseWriter, r *http.Request) {
	patients, err := h.service.GetAllPatients()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patients)
}

func (h *PatientHandler) UpdatePatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	var patient models.Patient
	if err := json.NewDecoder(r.Body).Decode(&patient); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.UpdatePatient(id, &patient); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	patient.PatientID = id
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient)
}

func (h *PatientHandler) DeletePatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	if err := h.service.DeletePatient(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
