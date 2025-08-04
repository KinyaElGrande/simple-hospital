package services

import (
	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
)

type PrescriptionService struct{}

func NewPrescriptionService() *PrescriptionService {
	return &PrescriptionService{}
}

func (s *PrescriptionService) CreatePrescription(prescription *models.Prescription) error {
	query := `INSERT INTO Prescriptions (patient_id, doctor_id, prescribed_date, medication, dosage, duration, instructions)
              VALUES (?, ?, ?, ?, ?, ?, ?)`
	result, err := database.GetDB().Exec(query, prescription.PatientID, prescription.DoctorID, prescription.PrescribedDate,
		prescription.Medication, prescription.Dosage, prescription.Duration, prescription.Instructions)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	prescription.PrescriptionID = int(id)
	return nil
}

func (s *PrescriptionService) GetPrescription(id int) (*models.Prescription, error) {
	var prescription models.Prescription
	query := `SELECT prescription_id, patient_id, doctor_id, prescribed_date, medication, dosage, duration, instructions
              FROM Prescriptions WHERE prescription_id = ?`
	err := database.GetDB().QueryRow(query, id).Scan(&prescription.PrescriptionID, &prescription.PatientID, &prescription.DoctorID,
		&prescription.PrescribedDate, &prescription.Medication, &prescription.Dosage,
		&prescription.Duration, &prescription.Instructions)
	if err != nil {
		return nil, err
	}
	return &prescription, nil
}
