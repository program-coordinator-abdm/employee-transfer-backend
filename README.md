# employee-transfer-backend
Backend code for Employee Transfer application.

## Tech
- Node.js + Express
- Prisma ORM + PostgreSQL (Neon compatible)
- JWT authentication
- Zod validation
- PDF export via pdfkit

## Setup
```bash
npm install
cp .env.example .env
# Set DATABASE_URL to your Neon connection string
npx prisma migrate deploy
npm run seed
npm run dev
```

The server runs on `http://localhost:4000`.

## Seeded Users
**Admin**
- **Username:** admin
- **Email:** admin@karnataka.gov.in
- **Phone:** 9000000000
- **Password:** Admin@123

**Data Officer**
- **Username:** dataofficer
- **Email:** dataofficer@karnataka.gov.in
- **Phone:** 9000000001
- **Password:** Data@1234

Note: The database stores plaintext passwords in the `password` column. No
hashing is performed in code.

## API Endpoints
### Auth
- `POST /auth/login`
  - body: `{ email?, username?, password }`

### Uploads
- `POST /uploads`
  - multipart/form-data with `file`
  - returns `{ name, sizeKB, uploadedAt, downloadUrl }`

### Employees
- `GET /employees?searchMode=name|kgid&query=&page=&limit=&category=`
- `GET /employees/suggestions?searchMode=name|kgid&query=&limit=&category=`
- `GET /employees/:id`
- `POST /employees` (Data Officer)
- `PUT /employees/:id` (Admin)
- `POST /employees/:id/transfers` (Admin)
  - body: `{ toCity, toPosition, toHospitalName?, effectiveFrom }`

### Exports
- `GET /exports/employees.csv`
- `GET /exports/employees.pdf`

### Roles
- **ADMIN**: can edit and transfer employees
- **DATA_OFFICER**: can create employees, view data

### Notes
- Passwords are plaintext (no hashing).
- Uploads are stored on the local filesystem under `/uploads` (dev-only).
