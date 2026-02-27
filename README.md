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
# Fill required env values in .env
npm run check:env:migrate
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
  - body: `{ email? | username? | identifier?, password }`

### Uploads
- `POST /uploads`
  - multipart/form-data with `file`
  - uploads file to S3
  - returns `{ name, sizeKB, uploadedAt, downloadUrl }`

### Employees
- `GET /employees?page=1&pageSize=50&search=&category=`
  - server-side pagination (`pageSize` default 50, max 200)
  - returns `{ data, page, pageSize, limit, total, totalPages }`
- `GET /employees/export`
  - streams CSV for all matching employees
- `GET /employees/suggestions?searchMode=name|kgid&query=&limit=&category=`
- `GET /employees/:id`
- `POST /employees` (Data Officer)
- `PUT /employees/:id` (Admin)
- `DELETE /employees/:id` (Admin)
- `POST /employees/:id/transfers` (Admin)
  - body: `{ toCity, toPosition, toHospitalName?, effectiveFrom }`

### Exports
- `GET /exports/employees.csv`
- `GET /exports/employees.pdf`

### Roles
- **ADMIN**: can edit, delete, and transfer employees
- **DATA_OFFICER**: can create employees, view data

### Notes
- Passwords are stored as plaintext in `password`.
- Document uploads are stored in S3 and return a URL.

## AWS RDS + S3 Notes
### RDS
1. Set `DATABASE_URL` to your RDS PostgreSQL connection string.
2. Run:
   ```bash
   npm run check:env:migrate
   npx prisma migrate deploy
   npm run seed
   ```

Optional env checks:
- `npm run check:env:migrate` validates migration-time variables.
- `npm run check:env` validates runtime variables used by the API.

### S3 Uploads
Required environment variables:
- `AWS_REGION`
- `AWS_S3_BUCKET`

Optional:
- `PUBLIC_UPLOAD_BASE_URL` (e.g. CloudFront URL)
- `AWS_S3_PUBLIC_READ=true` to set ACL `public-read` on each upload (if bucket allows ACLs)
- `MAX_UPLOAD_MB` to control file size limit (default 5MB)
- `ALLOWED_UPLOAD_MIME_TYPES` (comma-separated) to restrict file types
- `MIN_GZIP_BYTES` minimum file size to attempt gzip compression (default 1024 bytes)
- `MIN_GZIP_SAVINGS_BYTES` minimum bytes saved required to keep gzipped version (default 256)

If `AWS_S3_PUBLIC_READ` is false, ensure your bucket policy allows public reads
for the `uploads/*` prefix.

Uploads are pre-compressed before S3 when possible:
- JPEG/PNG images are resized/compressed to JPEG.
- Other non-image documents are gzipped only when meaningful size reduction is achieved.

### Upload smoke test (SSM-friendly)
Use the script below to validate auth + `/uploads` end-to-end:

```bash
chmod +x scripts/smoke-test-upload.sh
```

With existing JWT:

```bash
scripts/smoke-test-upload.sh \
  --base-url "http://localhost:4000" \
  --token "<JWT_TOKEN>" \
  --file "/tmp/test.pdf"
```

With login credentials:

```bash
scripts/smoke-test-upload.sh \
  --base-url "http://localhost:4000" \
  --username "dataofficer" \
  --password "Data@1234" \
  --file "/tmp/test.pdf"
```

If your endpoint uses self-signed TLS, add `--insecure`.
