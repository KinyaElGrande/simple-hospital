package services

import (
	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
)

type PatientService struct{}

func NewPatientService() *PatientService {
	return &PatientService{}
}

func (s *PatientService) CreatePatient(patient *models.Patient) error {
	query := `INSERT INTO Patients (first_name, last_name, date_of_birth, gender, contact_info, address, medical_history, allergies, emergency_contact)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	result, err := database.GetDB().Exec(query, patient.FirstName, patient.LastName, patient.DateOfBirth, patient.Gender,
		patient.ContactInfo, patient.Address, patient.MedicalHistory, patient.Allergies, patient.EmergencyContact)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	patient.PatientID = int(id)
	return nil
}

func (s *PatientService) GetPatient(id int) (*models.Patient, error) {
	var patient models.Patient
	query := `SELECT patient_id, first_name, last_name, date_of_birth, gender, contact_info, address, medical_history, allergies, emergency_contact
              FROM Patients WHERE patient_id = ?`
	err := database.GetDB().QueryRow(query, id).Scan(&patient.PatientID, &patient.FirstName, &patient.LastName, &patient.DateOfBirth,
		&patient.Gender, &patient.ContactInfo, &patient.Address, &patient.MedicalHistory,
		&patient.Allergies, &patient.EmergencyContact)
	if err != nil {
		return nil, err
	}
	return &patient, nil
}

func (s *PatientService) GetAllPatients() ([]models.Patient, error) {
	rows, err := database.GetDB().Query(`SELECT patient_id, first_name, last_name, date_of_birth, gender, contact_info, address, medical_history, allergies, emergency_contact
                           FROM Patients`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patients []models.Patient
	for rows.Next() {
		var patient models.Patient
		err := rows.Scan(&patient.PatientID, &patient.FirstName, &patient.LastName, &patient.DateOfBirth,
			&patient.Gender, &patient.ContactInfo, &patient.Address, &patient.MedicalHistory,
			&patient.Allergies, &patient.EmergencyContact)
		if err != nil {
			return nil, err
		}
		patients = append(patients, patient)
	}
	return patients, nil
}

func (s *PatientService) UpdatePatient(id int, patient *models.Patient) error {
	query := `UPDATE Patients SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?,
              contact_info = ?, address = ?, medical_history = ?, allergies = ?, emergency_contact = ?
              WHERE patient_id = ?`
	_, err := database.GetDB().Exec(query, patient.FirstName, patient.LastName, patient.DateOfBirth, patient.Gender,
		patient.ContactInfo, patient.Address, patient.MedicalHistory, patient.Allergies,
		patient.EmergencyContact, id)
	return err
}

func (s *PatientService) DeletePatient(id int) error {
	_, err := database.GetDB().Exec("DELETE FROM Patients WHERE patient_id = ?", id)
	return err
}
