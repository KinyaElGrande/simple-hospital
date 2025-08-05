package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/kinyaelgrande/simple-hospital/middleware"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services"
)

type UserHandler struct {
	service *services.UserService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		service: services.NewUserService(),
	}
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	middleware.RequireRole(models.ROLE_ADMIN)
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.CreateUser(&user); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// TODO: create a user response model
	user.PasswordHash = ""
	user.Role = strings.ToLower(user.Role)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := h.service.GetUser(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	// TODO: create a user response model
	user.PasswordHash = ""
	user.Role = strings.ToLower(user.Role)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.service.GetUsers()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// TODO: create a user response model
	for i := range users {
		users[i].PasswordHash = ""
		users[i].Role = strings.ToLower(users[i].Role)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
