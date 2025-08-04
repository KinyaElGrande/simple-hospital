package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// Initialize database
func InitDB() (err error) {
	DB, err = sql.Open("sqlite3", "./hospital.db")
	if err != nil {
		log.Fatal(err)
		return err
	}

	// Create tables
	err = createTables()
	if err != nil {
		return err
	}

	return nil
}

func createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS Patients (
            patient_id INTEGER PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth DATE,
            gender TEXT,
            contact_info TEXT,
            address TEXT,
            medical_history TEXT,
            allergies TEXT,
            emergency_contact TEXT
        );`,
		`CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('Admin','Doctor', 'Nurse', 'Pharmacist')),
            full_name TEXT NOT NULL,
            two_fa_secret TEXT,
            two_fa_enabled BOOLEAN DEFAULT FALSE,
            two_fa_backup_codes TEXT
        );`,
		`CREATE TABLE IF NOT EXISTS MedicalRecords (
            record_id INTEGER PRIMARY KEY,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            visit_date DATE NOT NULL,
            diagnosis TEXT,
            treatment_plan TEXT,
            doctor_notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
            FOREIGN KEY (doctor_id) REFERENCES Users(user_id)
        );`,
		`CREATE VIEW IF NOT EXISTS nurse_medical_records_view AS
			SELECT
				record_id,
				patient_id,
				visit_date,
				diagnosis
			FROM medical_records;`,
		`CREATE TABLE IF NOT EXISTS Prescriptions (
            prescription_id INTEGER PRIMARY KEY,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            prescribed_date DATE NOT NULL,
            medication TEXT NOT NULL,
            dosage TEXT,
            duration TEXT,
            instructions TEXT,
            FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
            FOREIGN KEY (doctor_id) REFERENCES Users(user_id)
        );`,
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Fatal("Error creating table:", err)
			return err
		}
	}

	return nil
}

func GetDB() *sql.DB {
	return DB
}
