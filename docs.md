## TODO: to be updated!!

This application is a simple and secure Hospital Crypto application.

The application is built using Golang on the BE and React TS on the FE.

For security reasons, the application uses HTTPS and TLS encryption which is Generated on the BE using `generateSelfSignedCert` function that generates a self-signed certificate using the `crypto/tls` package. It creates a new private key and a self-signed certificate with the specified domain name and [127.0.0.1] IP addresses.

ON the FE side the application uses HTTPS and TLS encryption by reading the certificate and key files generated on the BE through vite.config.js.

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: './certs/key.pem',
      cert: './certs/cert.pem',
    },
  },
});
```

The application utilizes SQlite database for data storage and management.
Bellow is the database schema:
CREATE TABLE IF NOT EXISTS Patients (
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
            two_fa_enabled BOOLEAN DEFAULT TRUE,
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
			FROM MedicalRecords;`,
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
        );`

For security reasons the two factor authentication is enabled for all users and the backup codes are stored in a secure manner. Additionally, all sensitive data like users password are encrypted at rest and in transit.

The Application has Role-Based Access Control (RBAC) to ensure that only authorized users can access certain features and data.

Admin ==> He only has access to administrative in this case,he is the only one who can create and manage users.
Doctor ==> He only has  read/write access to patients data, medical records and prescriptions.
Nurse ==> He only has read access to patients data, medical records.
Pharmacist ==> He only has read/write access to prescriptions.

### Working FLow
To run this application, you need to have Node.js > 18 installed on your machine. Once you have Node.js installed,then navigate to to the client directory on your terminal and run the following command in your terminal:

```
npm install
```

which installs only the necessary dependencies for the application to run.

```
npm run dev
```

which starts the FE application.

To start the backend server, navigate to the root directory on your terminal and run the following command in your terminal:

```
go run main.go
```

Which will initialize the database and start the server on both HTTP on port 8080 and HTTPS on port 8443.

You should see similar output:

```
2025/08/06 10:49:34 INFO Initializing database
2025/08/06 10:49:34 INFO Database initialized
2025/08/06 10:49:35 INFO Admin user already exists
2025/08/06 10:49:35 INFO HTTPS server started on port 8443
2025/08/06 10:49:35 INFO Available endpoints:
2025/08/06 10:49:35 INFO   Health check: GET /health
2025/08/06 10:49:35 INFO   2FA Auth: POST /api/auth/2fa/initiate
2025/08/06 10:49:35 INFO   2FA Verify: POST /api/auth/2fa/verify
2025/08/06 10:49:35 INFO   2FA Logout: POST /api/auth/2fa/logout
2025/08/06 10:49:35 INFO   Protected API: /api/* (requires authentication)
2025/08/06 10:49:35 INFO   Admin endpoints: /api/admin/* (requires admin role)
2025/08/06 10:49:35 INFO HTTP redirect server started on port 8080
```

After that  visit the FE on  https://localhost:5173/ to interact with the application.

you  can start by using the admins default account which is also created during the initialization process.
`username: admin`
`password: admin123`

After that you'll be requested to enable 2FA, by scanning the QR code displayed on the screen with your favourite authenticator app:
. Google Authenticator (iOS/Android)
• Microsoft Authenticator (iOS/Android)
• Authy (iOS/Android).

Set up your 2FA app and verify the code.

Then proceed to the admin's dashboard to manage users and roles.

Create all the users and roles you need then perform the actions depending on the roles.
