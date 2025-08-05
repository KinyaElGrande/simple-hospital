package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/davecgh/go-spew/spew"
	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

type PrescriptionHandler struct {
	service *services.PrescriptionService
}

func NewPrescriptionHandler() *PrescriptionHandler {
	return &PrescriptionHandler{
		service: services.NewPrescriptionService(),
	}
}

func (h *PrescriptionHandler) CreatePrescription(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("CreatePrescription handler called\n")
	var prescription models.Prescription
	if err := json.NewDecoder(r.Body).Decode(&prescription); err != nil {
		fmt.Printf("Error decoding prescription JSON: %v\n", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fmt.Printf("Decoded prescription: %+v\n", prescription)
	spew.Dump("prescription", prescription)

	if err := h.service.CreatePrescription(&prescription); err != nil {
		fmt.Printf("Error creating prescription in service: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Prescription created successfully with ID: %d\n", prescription.PrescriptionID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription)
}

func (h *PrescriptionHandler) GetPrescriptions(w http.ResponseWriter, r *http.Request) {
	prescriptions, err := h.service.GetPrescriptions()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescriptions)
}

func (h *PrescriptionHandler) GetPrescription(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid prescription ID", http.StatusBadRequest)
		return
	}

	prescription, err := h.service.GetPrescription(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Prescription not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription)
}

func (h *PrescriptionHandler) GetPrescriptionsByPatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	patientId, err := strconv.Atoi(vars["patientId"])
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	prescriptions, err := h.service.GetPrescriptionsByPatient(patientId)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No prescriptions found for patient", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescriptions)
}
