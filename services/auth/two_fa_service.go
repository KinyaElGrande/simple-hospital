package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/png"
	"log"
	"strings"
	"time"

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
	// First check if user already has a secret
	var existingSecret string
	query := `SELECT two_fa_secret FROM Users WHERE username = ?`
	err := database.GetDB().QueryRow(query, username).Scan(&existingSecret)

	var secretKey string
	if err != nil || existingSecret == "" {
		// Generate a new secret key only if user doesn't have one
		key, err := totp.Generate(totp.GenerateOpts{
			Issuer:      "Hospital System",
			AccountName: username,
			Algorithm:   otp.AlgorithmSHA1,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to generate 2FA key: %v", err)
		}
		secretKey = key.Secret()

		// Store the secret in database for future use
		updateQuery := `UPDATE Users SET two_fa_secret = ? WHERE username = ?`
		_, err = database.GetDB().Exec(updateQuery, secretKey, username)
		if err != nil {
			return nil, fmt.Errorf("failed to store 2FA secret: %v", err)
		}
	} else {
		// Reuse existing secret
		secretKey = existingSecret
	}

	// Generate QR code as base64 using the secret directly
	qrCode, err := s.generateQRCodeFromSecret(secretKey, username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %v", err)
	}

	setup := &models.TwoFASetup{
		SecretKey:   secretKey,
		QRCodeUrl:   "data:image/png;base64," + qrCode,
		BackupCodes: []string{}, // Empty during setup, filled during enable
	}

	return setup, nil
}

// EnableTwoFA enables 2FA for a user after verifying the code
func (s *TwoFAService) EnableTwoFA(userID int, secret string, code string) ([]string, error) {
	log.Printf("Enabling 2FA for user %d with code: %s", userID, code)
	log.Printf("Secret: %s", secret)
	log.Printf("Current server time: %s", time.Now().Format(time.RFC3339))

	// Verify the TOTP code with time window tolerance
	valid := totp.Validate(code, secret)
	if !valid {
		// Try with time skew tolerance (±1 time step = ±30 seconds)
		now := time.Now()
		for i := -2; i <= 2; i++ {
			testTime := now.Add(time.Duration(i) * 30 * time.Second)
			testCode, err := totp.GenerateCode(secret, testTime)
			if err != nil {
				continue
			}
			log.Printf("Testing code %s for time offset %d (time: %s)", testCode, i, testTime.Format(time.RFC3339))
			if testCode == code {
				log.Printf("2FA code validated with time offset: %d", i)
				valid = true
				break
			}
		}
	}

	if !valid {
		log.Printf("2FA validation failed for user %d, code: %s", userID, code)
		return nil, fmt.Errorf("invalid 2FA code")
	}

	log.Printf("2FA code validated successfully for user %d", userID)

	// Generate backup codes
	backupCodes := s.generateBackupCodes()

	// Convert backup codes to JSON
	backupCodesJSON, err := json.Marshal(backupCodes)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal backup codes: %v", err)
	}

	// Update user in database
	query := `UPDATE Users SET two_fa_secret = ?, two_fa_enabled = TRUE, two_fa_backup_codes = ? WHERE user_id = ?`
	_, err = database.GetDB().Exec(query, secret, string(backupCodesJSON), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}

	return backupCodes, nil
}

func (s *TwoFAService) DisableTwoFA(userID int) error {
	query := `UPDATE Users SET two_fa_secret = '', two_fa_enabled = FALSE, two_fa_backup_codes = '' WHERE user_id = ?`
	_, err := database.GetDB().Exec(query, userID)
	return err
}

// VerifyTwoFA verifies a 2FA code (TOTP or backup code)
func (s *TwoFAService) VerifyTwoFA(userID int, code string) (bool, error) {
	log.Printf("Verifying 2FA for user %d with code: %s", userID, code)

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

	log.Printf("User %d has 2FA secret: %s", userID, secret)
	log.Printf("Current server time: %s", time.Now().Format(time.RFC3339))

	// First check if it's a valid TOTP code with time tolerance
	if totp.Validate(code, secret) {
		log.Printf("TOTP code validated successfully for user %d", userID)
		return true, nil
	}

	// Try with time skew tolerance
	now := time.Now()
	for i := -2; i <= 2; i++ {
		testTime := now.Add(time.Duration(i) * 30 * time.Second)
		testCode, err := totp.GenerateCode(secret, testTime)
		if err != nil {
			continue
		}
		log.Printf("Testing TOTP code %s for time offset %d", testCode, i)
		if testCode == code {
			log.Printf("TOTP code validated with time offset: %d for user %d", i, userID)
			return true, nil
		}
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

// generateQRCodeFromSecret generates a QR code from an existing secret
func (s *TwoFAService) generateQRCodeFromSecret(secret string, username string) (string, error) {
	// Create TOTP URL manually
	url := fmt.Sprintf("otpauth://totp/Hospital%%20System:%s?secret=%s&issuer=Hospital%%20System", username, secret)

	// Create key from URL
	key, err := otp.NewKeyFromURL(url)
	if err != nil {
		return "", fmt.Errorf("failed to create key from URL: %v", err)
	}

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
