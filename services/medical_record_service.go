package services

import (
	"database/sql"
	"fmt"

	"github.com/kinyaelgrande/simple-hospital/database"
	"github.com/kinyaelgrande/simple-hospital/models"
)

type MedicalRecordService struct{}

func NewMedicalRecordService() *MedicalRecordService {
	return &MedicalRecordService{}
}

func (s *MedicalRecordService) CreateMedicalRecord(record *models.MedicalRecord) error {
	query := `INSERT INTO MedicalRecords (patient_id, doctor_id, visit_date, diagnosis, treatment_plan, doctor_notes)
              VALUES (?, ?, ?, ?, ?, ?)`
	result, err := database.GetDB().Exec(query, record.PatientID, record.DoctorID, record.VisitDate, record.Diagnosis,
		record.TreatmentPlan, record.DoctorNotes)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	record.RecordID = int(id)
	return nil
}

func (s *MedicalRecordService) GetMedicalRecord(id int) (*models.MedicalRecord, error) {
	var record models.MedicalRecord

	query := `SELECT record_id, patient_id, doctor_id, visit_date, diagnosis, treatment_plan, doctor_notes FROM MedicalRecords WHERE record_id = ?`

	err := database.GetDB().QueryRow(query, id).Scan(
		&record.RecordID,
		&record.PatientID,
		&record.DoctorID,
		&record.VisitDate,
		&record.Diagnosis,
		&record.TreatmentPlan,
		&record.DoctorNotes,
	)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

func (s *MedicalRecordService) GetNurseRecord(recordID int) (*models.MedicalRecordNurseView, error) {
	query := "SELECT record_id, patient_id, visit_date, diagnosis FROM nurse_view WHERE record_id = ?"
	row := database.GetDB().QueryRow(query, recordID)

	var record models.MedicalRecordNurseView
	err := row.Scan(&record.RecordID, &record.PatientID, &record.VisitDate, &record.Diagnosis)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no record found with ID %d", recordID)
		}
		return nil, err
	}

	return &record, nil
}

func (s *MedicalRecordService) GetNurseViewRecords() ([]models.MedicalRecordNurseView, error) {
	query := "SELECT record_id, patient_id, visit_date, diagnosis FROM nurse_medical_records_view"
	rows, err := database.GetDB().Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []models.MedicalRecordNurseView
	for rows.Next() {
		var record models.MedicalRecordNurseView
		err := rows.Scan(&record.RecordID, &record.PatientID, &record.VisitDate, &record.Diagnosis)
		if err != nil {
			return nil, err
		}
		records = append(records, record)
	}

	return records, nil
}
