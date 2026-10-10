# Loan Management System

Borrower portal (4-step loan application) + role-guarded Operations Dashboard (Sales, Sanction, Disbursement, Collection).

**Stack:** Next.js (App Router) + TypeScript + Tailwind · Express + TypeScript · MongoDB + Mongoose · JWT + bcrypt

## Setup

Requires Node 20+ and a running MongoDB (local or Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run seed                # creates one account per role
npm run dev                 # http://localhost:5000

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Optional: `cd backend && npm run smoke` runs an API end-to-end test (RBAC, BRE, upload, loan math, full lifecycle) against an in-memory MongoDB.

## Login credentials (created by seed, password for all: `Password@123`)

| Role | Email |
|---|---|
| Admin (all modules) | admin@lms.com |
| Sales | sales@lms.com |
| Sanction | sanction@lms.com |
| Disbursement | disbursement@lms.com |
| Collection | collection@lms.com |
| Borrower | borrower@lms.com |

New borrowers can also sign up at `/signup` (public signup always creates the `borrower` role).

## Design

**Collections**
- `User` — name, email (unique), passwordHash (bcrypt), `role` enum.
- `Application` — one loan per borrower flow: personal details, salary slip metadata, amount, tenure, simple interest, total repayment, `totalPaid`, `status`, stage timestamps.
- `Payment` — application ref, `utr` (**unique index**), amount, paidOn, recordedBy.

**Status transitions** (each enforced server-side with an atomic conditional update)

```
PERSONAL_DETAILS (draft) → APPLIED → SANCTIONED → DISBURSED → CLOSED
                              └────→ REJECTED (reason required)
```
| Transition | Who |
|---|---|
| draft → APPLIED | borrower |
| APPLIED → SANCTIONED / REJECTED | sanction (admin) |
| SANCTIONED → DISBURSED | disbursement (admin) |
| DISBURSED → CLOSED | automatic when `totalPaid == totalRepayment` |

**BRE** (age 23–50, salary ≥ ₹25,000, PAN `^[A-Z]{5}[0-9]{4}[A-Z]$`, not Unemployed) runs on the **server** (authoritative; the client can be bypassed) and is mirrored on the client only for instant feedback.

**Loan math:** `SI = P × 12 × T / (365 × 100)`, `Total = P + SI` — recomputed on the server; client values are never trusted. Amount 50,000–5,00,000, tenure 30–365 days.

**Collection validations:** loan must be `DISBURSED`; amount > 0 and ≤ outstanding (`totalRepayment − totalPaid`); UTR unique across all payments (409 on duplicate); date not in the future.

**RBAC:** `role` stored on the user and embedded in the JWT. `authenticate` middleware → `401` if missing/invalid token; `requireRole(...)` → `403` if the role is not allowed (admin passes every dashboard module, but not borrower routes). Frontend: `proxy.ts` (role cookie redirect) + `RoleGuard` + role-filtered navigation — the API is the real enforcement.

## API

| Method & path | Roles |
|---|---|
| `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me` | public / any |
| `GET /api/borrower/application`, `POST /personal-details`, `POST /salary-slip`, `POST /apply` | borrower |
| `GET /api/sales/leads` | sales, admin |
| `GET /api/sanction/applications`, `POST /:id/approve`, `POST /:id/reject` | sanction, admin |
| `GET /api/disbursement/loans`, `POST /:id/disburse` | disbursement, admin |
| `GET /api/collection/loans`, `GET /:id`, `POST /:id/payments` | collection, admin |

Salary slips (PDF/JPG/PNG, ≤ 5 MB) are stored on disk in `backend/uploads/` and linked to the application.
