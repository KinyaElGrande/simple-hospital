package services

import (
	"fmt"

	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
)

type PrescriptionService struct{}

func NewPrescriptionService() *PrescriptionService {
	return &PrescriptionService{}
}

func (s *PrescriptionService) CreatePrescription(prescription *models.Prescription) error {
	fmt.Printf("Creating prescription in service: PatientID=%d, DoctorID=%d, Date=%s, Medication=%s\n",
		prescription.PatientID, prescription.DoctorID, prescription.PrescribedDate, prescription.Medication)

	query := `INSERT INTO Prescriptions (patient_id, doctor_id, prescribed_date, medication, dosage, duration, instructions)
              VALUES (?, ?, ?, ?, ?, ?, ?)`
	result, err := database.GetDB().Exec(query, prescription.PatientID, prescription.DoctorID, prescription.PrescribedDate,
		prescription.Medication, prescription.Dosage, prescription.Duration, prescription.Instructions)
	if err != nil {
		fmt.Printf("Error executing prescription insert query: %v\n", err)
		return err
	}

	id, _ := result.LastInsertId()
	prescription.PrescriptionID = int(id)
	fmt.Printf("Prescription created successfully with ID: %d\n", prescription.PrescriptionID)
	return nil
}

func (s *PrescriptionService) GetPrescriptions() ([]*models.Prescription, error) {
	var prescriptions []*models.Prescription
	query := `SELECT prescription_id, patient_id, doctor_id, prescribed_date, medication, dosage, duration, instructions
              FROM Prescriptions`
	rows, err := database.GetDB().Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var prescription models.Prescription
		err := rows.Scan(&prescription.PrescriptionID, &prescription.PatientID, &prescription.DoctorID,
			&prescription.PrescribedDate, &prescription.Medication, &prescription.Dosage,
			&prescription.Duration, &prescription.Instructions)
		if err != nil {
			return nil, err
		}
		prescriptions = append(prescriptions, &prescription)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return prescriptions, nil
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

	// TODO: Implement status check
	if prescription.Status == "" {
		prescription.Status = "active"
	}

	return &prescription, nil
}

func (s *PrescriptionService) GetPrescriptionsByPatient(patientId int) ([]models.Prescription, error) {
	var prescriptions []models.Prescription
	query := `SELECT prescription_id, patient_id, doctor_id, prescribed_date, medication, dosage, duration, instructions
              FROM Prescriptions WHERE patient_id = ?`
	rows, err := database.GetDB().Query(query, patientId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var prescription models.Prescription
		err := rows.Scan(&prescription.PrescriptionID, &prescription.PatientID, &prescription.DoctorID,
			&prescription.PrescribedDate, &prescription.Medication, &prescription.Dosage,
			&prescription.Duration, &prescription.Instructions)
		if err != nil {
			return nil, err
		}

		// TODO: Implement status check
		if prescription.Status == "" {
			prescription.Status = "active"
		}

		prescriptions = append(prescriptions, prescription)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return prescriptions, nil
}
