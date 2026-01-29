# employee-transfer-backend
Backend code for Employee Transfer application.

## Tech
- Node.js + Express
- Prisma ORM + SQLite
- JWT authentication
- Zod validation
- PDF export via pdfkit

## Setup
```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

The server runs on `http://localhost:4000`.

## Seeded Admin User
- **Username:** admin
- **Email:** admin@karnataka.gov.in
- **Phone:** 9000000000
- **Password:** Admin@123

## API Endpoints
### Auth
- `POST /auth/login`
  - body: `{ username?, email?, phone?, password }`

### Employees
- `GET /employees?searchMode=name|kgid&query=&page=&limit=`
- `GET /employees/suggestions?searchMode=name|kgid&query=&limit=`
- `GET /employees/:id`
- `POST /employees/:id/transfers`
  - body: `{ toCity, toPosition, effectiveFrom }`

### Exports
- `GET /exports/employees.csv`
- `GET /exports/employees.pdf`
