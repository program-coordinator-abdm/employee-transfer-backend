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
# Set DATABASE_URL to your PostgreSQL (AWS RDS) connection string
npx prisma migrate deploy
npm run seed
npm run dev
```

The server runs on `http://localhost:4000`.

## Seeded Users
- Seed data is loaded from `scripts/users.csv` using `npm run seed`.
- Seeding upserts `DATA_OFFICER` users by username/email and skips existing `ADMIN` users.
- Passwords are stored as plaintext in the `password` column.

## API Endpoints
### Auth
- `POST /auth/login`
  - body: `{ email?, username?, password }`

### Uploads
- `POST /uploads`
  - multipart/form-data with `file`
  - stores binary in RDS (`UploadedDocument` table)
  - returns `{ id, name, sizeKB, uploadedAt, downloadUrl }`
- `GET /uploads/:id/download`
  - downloads a file from RDS by upload id

### Employees
- `GET /employees?searchMode=name|kgid&query=&page=&limit=&category=`
  - returns all matching employees in a single response (frontend handles pagination)
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
- Passwords are stored as plaintext in `password`.
- Document uploads are stored in RDS and served through `/uploads/:id/download`.

## AWS RDS Notes
### RDS
1. Set `DATABASE_URL` to your RDS PostgreSQL connection string.
2. Run:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
