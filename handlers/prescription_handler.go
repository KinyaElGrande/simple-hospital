package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

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
	var prescription models.Prescription
	if err := json.NewDecoder(r.Body).Decode(&prescription); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.CreatePrescription(&prescription); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription)
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
