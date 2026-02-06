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
npx prisma migrate dev
npm run seed
npm run dev
```

The server runs on `http://localhost:4000`.

## Seeded Admin User
- **Username:** admin
- **Email:** admin@karnataka.gov.in
- **Phone:** 9000000000
- **Password:** Admin@123

Note: The database stores plaintext passwords in the `password` column. No
hashing is performed in code.

## API Endpoints
### Auth
- `POST /auth/login`
  - body: `{ email, password }`

### Categories
- `GET /categories`
  - returns counts per category

### Employees
- `GET /employees?category=&searchMode=name|kgid&query=&page=&limit=`
  - category is optional; if omitted, data is aggregated across categories
- `GET /employees/suggestions?category=&searchMode=name|kgid&query=&limit=`
  - category is optional; if omitted, suggestions are aggregated
- `GET /employees/:id?category=`
  - category is optional; if omitted, backend searches all categories
- `POST /employees/:id/transfers?category=`
  - category is optional; if omitted, backend searches all categories
  - body: `{ toCity, toPosition, toHospital?, toHospitalName?, effectiveFrom }`

### Exports
- `GET /exports/employees.csv`
- `GET /exports/employees.pdf`
