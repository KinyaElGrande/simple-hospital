# Scope


-> The Health professional/doctors should enter notes to record the
administration of therapies and drugs.
-> The Pharmacists should access doctors prescription to issues
drugs
-> The nurses should be able to access non-sensitive patient records

== Users table with different roles depending on professional
--> Have a different table for patients

--> Nurses will only have access to patients names, phone numbers,


CREATE TABLE Patients (
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
);

CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('Doctor', 'Nurse', 'Pharmacist')),
    full_name TEXT NOT NULL
);


CREATE TABLE MedicalRecords (
    record_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    treatment_plan TEXT,
    doctor_notes TEXT,       -- only visible to doctors
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Users(user_id)
);


CREATE TABLE Prescriptions (
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
);
