package models

const (
	ROLE_ADMIN      = "Admin"
	ROLE_DOCTOR     = "Doctor"
	ROLE_NURSE      = "Nurse"
	ROLE_PHARMACIST = "Pharmacist"
)

type Patient struct {
	PatientID        int    `json:"id"`
	FirstName        string `json:"firstName"`
	LastName         string `json:"lastName"`
	DateOfBirth      string `json:"dateOfBirth"`
	Gender           string `json:"gender"`
	ContactInfo      string `json:"phone"`
	Address          string `json:"address"`
	MedicalHistory   string `json:"medicalHistory"`
	Allergies        string `json:"allergies"`
	EmergencyContact string `json:"emergencyContact"`
}

type User struct {
	UserID           int      `json:"id"`
	Username         string   `json:"username"`
	PasswordHash     string   `json:"password_hash"`
	Role             string   `json:"role"`
	FullName         string   `json:"fullName"`
	TwoFASecret      string   `json:"two_fa_secret"`
	TwoFAEnabled     bool     `json:"twoFactorEnabled"`
	TwoFABackupCodes []string `json:"backupCodes"`
}

type MedicalRecord struct {
	RecordID      int    `json:"id"`
	PatientID     int    `json:"patient_id"`
	DoctorID      int    `json:"doctor_id"`
	VisitDate     string `json:"visit_date"`
	Diagnosis     string `json:"diagnosis"`
	TreatmentPlan string `json:"treatment_plan"`
	DoctorNotes   string `json:"doctor_notes"`
}

type MedicalRecordNurseView struct {
	RecordID  int    `json:"id"`
	PatientID int    `json:"patient_id"`
	VisitDate string `json:"visit_date"`
	Diagnosis string `json:"diagnosis"`
}

type Prescription struct {
	PrescriptionID int    `json:"id"`
	PatientID      int    `json:"patientId"`
	DoctorID       int    `json:"doctor_id"`
	PrescribedDate string `json:"prescribedDate"`
	Medication     string `json:"medication"`
	Dosage         string `json:"dosage"`
	Status         string `json:"status"`
	Duration       string `json:"duration"`
	Instructions   string `json:"instructions"`
}

type TwoFASetup struct {
	SecretKey   string   `json:"secretKey"`
	QRCodeUrl   string   `json:"qrCodeUrl"`   // Base64 encoded QR code data URL
	BackupCodes []string `json:"backupCodes"` // Generated during enable
}
