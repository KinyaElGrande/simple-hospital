package services

import (
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/davecgh/go-spew/spew"
	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/kinyaelgrande/simple-hospital/services/auth"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	twoFAService *auth.TwoFAService
}

func NewUserService() *UserService {
	return &UserService{
		twoFAService: auth.NewTwoFAService(),
	}
}

func (s *UserService) CreateUser(user *models.User) error {
	spew.Dump("Svx", user)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hashedPassword)

	if strings.HasPrefix(user.Username, "doc") {
		user.Role = models.ROLE_DOCTOR
	}

	if strings.HasPrefix(user.Username, "nrs") {
		user.Role = models.ROLE_NURSE
	}

	if strings.HasPrefix(user.Username, "pha") {
		user.Role = models.ROLE_PHARMACIST
	}

	query := `INSERT INTO Users (username, password_hash, role, full_name, two_fa_secret, two_fa_enabled, two_fa_backup_codes)
              VALUES (?, ?, ?, ?, ?, ?, ?)`
	result, err := database.GetDB().Exec(query, user.Username, user.PasswordHash, user.Role, user.FullName,
		user.TwoFASecret, user.TwoFAEnabled, "")
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	user.UserID = int(id)
	return nil
}

func (s *UserService) GetUser(id int) (*models.User, error) {
	var user models.User
	var backupCodesJSON sql.NullString
	query := `SELECT user_id, username, password_hash, role, full_name, two_fa_secret, two_fa_enabled, two_fa_backup_codes
              FROM Users WHERE user_id = ?`
	err := database.GetDB().QueryRow(query, id).Scan(&user.UserID, &user.Username, &user.PasswordHash, &user.Role,
		&user.FullName, &user.TwoFASecret, &user.TwoFAEnabled, &backupCodesJSON)
	if err != nil {
		return nil, err
	}

	// Parse backup codes if they exist
	if backupCodesJSON.Valid && backupCodesJSON.String != "" {
		json.Unmarshal([]byte(backupCodesJSON.String), &user.TwoFABackupCodes)
	}

	return &user, nil
}

func (s *UserService) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	var backupCodesJSON sql.NullString
	query := `SELECT user_id, username, password_hash, role, full_name, two_fa_secret, two_fa_enabled, two_fa_backup_codes
              FROM Users WHERE username = ?`
	err := database.GetDB().QueryRow(query, username).Scan(&user.UserID, &user.Username, &user.PasswordHash, &user.Role,
		&user.FullName, &user.TwoFASecret, &user.TwoFAEnabled, &backupCodesJSON)
	if err != nil {
		return nil, err
	}

	// Parse backup codes if they exist
	if backupCodesJSON.Valid && backupCodesJSON.String != "" {
		json.Unmarshal([]byte(backupCodesJSON.String), &user.TwoFABackupCodes)
	}

	return &user, nil
}

func (s *UserService) GetTwoFAService() *auth.TwoFAService {
	return s.twoFAService
}
