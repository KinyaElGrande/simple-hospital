package models

const (
	ROLE_ADMIN      = "Admin"
	ROLE_DOCTOR     = "Doctor"
	ROLE_NURSE      = "Nurse"
	ROLE_PHARMACIST = "Pharmacist"
)

type Patient struct {
	PatientID        int    `json:"patient_id"`
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	DateOfBirth      string `json:"date_of_birth"`
	Gender           string `json:"gender"`
	ContactInfo      string `json:"contact_info"`
	Address          string `json:"address"`
	MedicalHistory   string `json:"medical_history"`
	Allergies        string `json:"allergies"`
	EmergencyContact string `json:"emergency_contact"`
}

type User struct {
	UserID           int      `json:"user_id"`
	Username         string   `json:"username"`
	PasswordHash     string   `json:"password_hash"`
	Role             string   `json:"role"`
	FullName         string   `json:"full_name"`
	TwoFASecret      string   `json:"two_fa_secret"`
	TwoFAEnabled     bool     `json:"two_fa_enabled"`
	TwoFABackupCodes []string `json:"two_fa_backup_codes"`
}

type MedicalRecord struct {
	RecordID      int    `json:"record_id"`
	PatientID     int    `json:"patient_id"`
	DoctorID      int    `json:"doctor_id"`
	VisitDate     string `json:"visit_date"`
	Diagnosis     string `json:"diagnosis"`
	TreatmentPlan string `json:"treatment_plan"`
	DoctorNotes   string `json:"doctor_notes"`
}

type MedicalRecordNurseView struct {
	RecordID  int    `json:"record_id"`
	PatientID int    `json:"patient_id"`
	VisitDate string `json:"visit_date"`
	Diagnosis string `json:"diagnosis"`
}

type Prescription struct {
	PrescriptionID int    `json:"prescription_id"`
	PatientID      int    `json:"patient_id"`
	DoctorID       int    `json:"doctor_id"`
	PrescribedDate string `json:"prescribed_date"`
	Medication     string `json:"medication"`
	Dosage         string `json:"dosage"`
	Duration       string `json:"duration"`
	Instructions   string `json:"instructions"`
}

type TwoFASetup struct {
	Secret string `json:"secret"`
	QRCode string `json:"qr_code"` // Base64 encoded QR code
	URL    string `json:"url"`     // TOTP URL for manual entry
}
