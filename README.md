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

Note: Passwords are stored as plaintext in the `password` column.

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
- Passwords are stored as plaintext.
- Uploads are stored on the local filesystem under `/uploads` for backward compatibility.
- New uploads are sent to S3 and return a public URL.

## AWS RDS + S3 Notes
### RDS
1. Set `DATABASE_URL` to your RDS PostgreSQL connection string.
2. Run:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

### S3 Uploads
Required environment variables:
- `AWS_REGION`
- `AWS_S3_BUCKET`

Optional:
- `PUBLIC_UPLOAD_BASE_URL` (e.g. CloudFront URL)
- `AWS_S3_PUBLIC_READ=true` to set ACL `public-read` on each upload (if bucket allows ACLs)
- `MAX_UPLOAD_MB` to control file size limit (default 5MB)
- `ALLOWED_UPLOAD_MIME_TYPES` (comma-separated) to restrict file types

If `AWS_S3_PUBLIC_READ` is false, ensure your bucket policy allows public reads
for the `uploads/*` prefix.
