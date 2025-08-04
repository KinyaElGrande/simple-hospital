package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/png"
	"strings"

	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

type TwoFAService struct{}

func NewTwoFAService() *TwoFAService {
	return &TwoFAService{}
}

// GenerateTwoFASetup generates 2FA setup information for a user
func (s *TwoFAService) GenerateTwoFASetup(username string) (*models.TwoFASetup, error) {
	// Generate a secret key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Hospital System",
		AccountName: username,
		Algorithm:   otp.AlgorithmSHA1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate 2FA key: %v", err)
	}

	// Generate QR code as base64
	qrCode, err := s.generateQRCodeBase64(key)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %v", err)
	}

	setup := &models.TwoFASetup{
		Secret: key.Secret(),
		QRCode: qrCode,
		URL:    key.URL(),
	}

	return setup, nil
}

// EnableTwoFA enables 2FA for a user after verifying the code
func (s *TwoFAService) EnableTwoFA(userID int, secret string, code string) error {
	// Verify the TOTP code
	valid := totp.Validate(code, secret)
	if !valid {
		return fmt.Errorf("invalid 2FA code")
	}

	// Generate backup codes
	backupCodes := s.generateBackupCodes()

	// Convert backup codes to JSON
	backupCodesJSON, err := json.Marshal(backupCodes)
	if err != nil {
		return fmt.Errorf("failed to marshal backup codes: %v", err)
	}

	// Update user in database
	query := `UPDATE Users SET two_fa_secret = ?, two_fa_enabled = TRUE, two_fa_backup_codes = ? WHERE user_id = ?`
	_, err = database.GetDB().Exec(query, secret, string(backupCodesJSON), userID)
	if err != nil {
		return fmt.Errorf("failed to update user: %v", err)
	}

	return nil
}

func (s *TwoFAService) DisableTwoFA(userID int) error {
	query := `UPDATE Users SET two_fa_secret = '', two_fa_enabled = FALSE, two_fa_backup_codes = '' WHERE user_id = ?`
	_, err := database.GetDB().Exec(query, userID)
	return err
}

// VerifyTwoFA verifies a 2FA code (TOTP or backup code)
func (s *TwoFAService) VerifyTwoFA(userID int, code string) (bool, error) {
	var secret string
	var backupCodesJSON string
	query := `SELECT two_fa_secret, two_fa_backup_codes FROM Users WHERE user_id = ? AND two_fa_enabled = TRUE`
	err := database.GetDB().QueryRow(query, userID).Scan(&secret, &backupCodesJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("2FA not enabled for user")
		}
		return false, fmt.Errorf("failed to get user 2FA info: %v", err)
	}

	// First check if it's a valid TOTP code
	if totp.Validate(code, secret) {
		return true, nil
	}

	// If not TOTP, check backup codes
	var backupCodes []string
	if err := json.Unmarshal([]byte(backupCodesJSON), &backupCodes); err != nil {
		return false, fmt.Errorf("failed to parse backup codes: %v", err)
	}

	// Check if code matches any backup code
	for i, backupCode := range backupCodes {
		if code == backupCode {
			// Remove used backup code
			backupCodes = append(backupCodes[:i], backupCodes[i+1:]...)
			updatedBackupCodesJSON, _ := json.Marshal(backupCodes)

			// Update database with remaining backup codes
			updateQuery := `UPDATE Users SET two_fa_backup_codes = ? WHERE user_id = ?`
			database.GetDB().Exec(updateQuery, string(updatedBackupCodesJSON), userID)

			return true, nil
		}
	}

	return false, nil
}

// GetUserTwoFAStatus gets the 2FA status for a user
func (s *TwoFAService) GetUserTwoFAStatus(userID int) (bool, error) {
	var enabled bool
	query := `SELECT two_fa_enabled FROM Users WHERE user_id = ?`
	err := database.GetDB().QueryRow(query, userID).Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled, nil
}

// generateQRCodeBase64 generates a QR code as base64 string
func (s *TwoFAService) generateQRCodeBase64(key *otp.Key) (string, error) {
	// Generate QR code image
	img, err := key.Image(200, 200)
	if err != nil {
		return "", err
	}

	// Encode to base64
	var buf strings.Builder
	encoder := base64.NewEncoder(base64.StdEncoding, &buf)
	png.Encode(encoder, img)
	encoder.Close()

	return buf.String(), nil
}

// generateBackupCodes generates 10 backup codes
func (s *TwoFAService) generateBackupCodes() []string {
	codes := make([]string, 10)
	for i := range codes {
		codes[i] = s.generateBackupCode()
	}
	return codes
}

// generateBackupCode generates a single backup code
func (s *TwoFAService) generateBackupCode() string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	return strings.ToUpper(fmt.Sprintf("%x", bytes))
}
