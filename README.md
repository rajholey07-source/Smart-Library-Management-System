# 📚 Smart Library Management System

A complete, production-style library management platform for colleges and universities.
Students search, borrow and track books; librarians manage the collection, members,
borrowing, fines and analytics from a secure admin console.

Built with **React + Tailwind CSS + Express + SQLite** (relational SQL with foreign keys,
constraints and transactions — schema is portable to PostgreSQL/Supabase, see below).

---

## ✨ Features

### Public / Student side
- **Home page** — hero with live book search, featured books, recently added, stats, how-it-works, footer
- **Book catalog** — search by title / author / ISBN / category, category + author + availability filters, 4 sort orders, pagination
- **Book details** — full metadata, availability, related books, one-click borrow
- **Registration** (name, email, student ID, password with confirmation) and **login** with remember-me
- **Student dashboard** — borrowed / overdue / returned / total stats, active loans with due dates, recommendations, history
- **My Books** — current loans with overdue indicators, self-service return, filterable history
- **Profile** — update display name, change password

### Admin / Librarian console (role-protected)
- **Dashboard** — KPIs (copies, availability, borrowed, overdue, students, fines), 6-month borrow/return bar chart, category pie chart, popular books, recent transactions
- **Book management** — add / edit / delete (guarded while copies are out), search, filters, featured flag, cover images, copy counters
- **Student management** — search, view details + full borrowing history + fines, edit info, activate / deactivate accounts
- **Borrowing management** — issue books on behalf of students, status tabs (borrowed / overdue / returned / all), mark returns, overdue-check sweep that materializes fines
- **Fine management** — auto-calculated on late return (days × rate), unpaid/paid tabs, mark paid, revert, settle-all per student
- **Reports** — most borrowed books, most active students, monthly trend line chart, overdue list, CSV export
- **Settings** — library name, borrow period, max books per student, fine per day (applied instantly to business logic)

### Smart features
- Rule-based **recommendations** from each student's most-borrowed categories, falling back to globally popular titles
- **Automatic due dates** (today + configurable borrow period)
- **Automatic fine calculation** on return and via the overdue sweep
- **Automatic availability updates** inside SQL transactions (race-safe)
- **In-app notifications** — borrow, return, overdue, fine generated, account status, welcome; unread badge with 30s polling

### Security
- scrypt-salted password hashing, timing-safe comparison
- Signed httpOnly session cookies (8h, or 7 days with remember-me)
- Role-based access control on every admin API + protected client routes
- No demo/bypass accounts — the only admin is created by the seed script
- Field-level validation on both client and server; friendly error messages everywhere

---

## 🚀 Quick start

Prerequisites: **Node.js 18+** (no external database server needed).

```bash
# 1. Install dependencies (server + client)
npm --prefix server install
npm --prefix client install

# 2. Configure environment (optional — sensible defaults work out of the box)
cp server/.env.example server/.env

# 3. Seed the database with realistic sample data
npm --prefix server run reseed

# 4. Build the React client (production bundle served by the API server)
npm --prefix client run build

# 5. Start the server
npm --prefix server start
# → App running at http://localhost:4000  (API + website in one process)
```

**Development mode (hot reload)** — run in two terminals:

```bash
npm run dev:server    # API on http://localhost:4000
npm run dev:client    # Vite dev server on http://localhost:5173 (proxies /api to :4000)
```

### Demo accounts (created by the seed)

| Role    | Email                        | Password      |
|---------|------------------------------|---------------|
| Admin   | `admin@library.edu`          | `Password123` |
| Student | `rahul.verma@student.edu`    | `Password123` |

Other seeded students follow the same password: `priya.nair@`, `arjun.mehta@`, `sneha.kulkarni@`, `vikram.singh@`, `ishita.roy@`, `karthik.iyer@` (all `@student.edu`).

> Change the admin password after first login (Profile → Change password), and set a strong
> `JWT_SECRET` in `server/.env` before any real deployment.

---

## ⚙️ Environment variables (`server/.env`)

| Variable                 | Default                  | Description                                    |
|--------------------------|--------------------------|------------------------------------------------|
| `PORT`                   | `4000`                   | API server port                                |
| `CLIENT_ORIGIN`          | `http://localhost:5173`  | Allowed CORS origin (comma-separate several)   |
| `JWT_SECRET`             | dev fallback             | **Set a long random string in production**     |
| `JWT_EXPIRES_IN`         | `8h`                     | Session lifetime                               |
| `JWT_REMEMBER_EXPIRES_IN`| `7d`                     | Session lifetime with "remember me"            |
| `DB_FILE`                | `./data/library.db`      | SQLite database file location                  |
| `BORROW_DAYS`            | `14`                     | Default borrow period                          |
| `MAX_BOOKS_PER_STUDENT`  | `5`                      | Default concurrent borrow limit                |
| `FINE_PER_DAY`           | `5`                      | Default fine per overdue day                   |
| `SEED_ON_START`          | `true`                   | Auto-seed sample data when the DB is empty     |

(The three library rules can also be changed at runtime from **Admin → Settings**.)

---

## 🗄️ Database schema

Relational SQL with primary keys, foreign keys, check constraints, unique constraints,
timestamps and indexes. Created automatically by `server/src/db.js`; seeded by
`server/src/seed.js`.

```
users(id PK, full_name, email UNIQUE, password_hash, role CHECK(student|admin),
      student_id UNIQUE, is_active, created_at, updated_at)

categories(id PK, name UNIQUE, description, created_at)

books(id PK, title, author, isbn UNIQUE, category_id FK→categories, publisher,
      publication_year CHECK 1500–2100, description,
      total_copies CHECK > 0, available_copies CHECK 0..total_copies,
      cover_url, is_featured, created_at, updated_at)

borrow_records(id PK, book_id FK→books, user_id FK→users, borrowed_at,
      due_date, returned_at, status CHECK(BORROWED|RETURNED), issued_by FK→users,
      CHECK((status=RETURNED AND returned_at NOT NULL) OR
            (status=BORROWED AND returned_at NULL)))
      + indexes on (user_id,status), (book_id,status), (status,due_date)

fines(id PK, borrow_record_id UNIQUE FK→borrow_records, user_id FK→users,
      amount CHECK ≥ 0, days_overdue CHECK ≥ 0, status CHECK(UNPAID|PAID),
      paid_at, created_at)

notifications(id PK, user_id FK→users, title, message,
      type CHECK(info|success|warning|danger), is_read, created_at)

settings(key PK, value, updated_at)  -- finePerDay, borrowDays, maxBooksPerStudent, libraryName
```

**Transaction guarantees:** borrowing verifies availability + per-user limits and
decrements copies atomically; returning flips status, increments copies and creates the
fine atomically. Duplicate borrows, zero-availability borrows, double returns and
negative copies are all impossible at the schema and service level.

### Using PostgreSQL / Supabase instead

The schema is standard SQL. To port: create the same tables in Postgres
(`SERIAL PRIMARY KEY`, `TEXT`, `INTEGER`, `REAL`, `TIMESTAMP DEFAULT now()`), replace
`db.prepare(...).run/get/all` calls with `pg` parameterized queries (`$1, $2 …`), and swap
SQLite-only functions (`strftime`, `julianday`, `date('now')`) for Postgres equivalents
(`to_char`, `now()::date`). All business logic lives in `server/src/library.js` and the
route modules, so the migration surface is small and well-contained.

---

## 🔌 REST API

Base URL: `http://localhost:4000` · Session via httpOnly `token` cookie · JSON everywhere.

| Method | Endpoint                        | Access  | Description                                  |
|--------|---------------------------------|---------|----------------------------------------------|
| POST   | `/api/auth/register`            | Public  | Student registration (auto sign-in)          |
| POST   | `/api/auth/login`               | Public  | Login (`remember` extends session)           |
| POST   | `/api/auth/logout`              | Public  | Clear session                                |
| GET    | `/api/auth/me`                  | Auth    | Current user                                 |
| PUT    | `/api/auth/change-password`     | Auth    | Change own password                          |
| GET    | `/api/books`                    | Public  | Search / filter / sort / paginate            |
| GET    | `/api/books/:id`                | Public  | Details + related books                      |
| GET    | `/api/books/featured` / `recent`| Public  | Home page collections                        |
| GET    | `/api/books/recommendations`    | Auth    | Rule-based picks for the reader              |
| POST   | `/api/books`                    | Admin   | Create (validates ISBN, copies)              |
| PUT    | `/api/books/:id`                | Admin   | Update                                       |
| DELETE | `/api/books/:id`                | Admin   | Delete (blocked while copies are borrowed)   |
| POST   | `/api/borrow`                   | Auth    | Borrow (`user_id` = issue on behalf, admin)  |
| GET    | `/api/borrow`                   | Auth    | Records (students see only their own)        |
| PUT    | `/api/borrow/:id/return`        | Auth    | Return + auto-fine                           |
| POST   | `/api/borrow/overdue-check`     | Admin   | Materialize fines for overdue loans          |
| GET    | `/api/users`                    | Admin   | List / search students                       |
| GET    | `/api/users/:id`                | Admin   | Detail + history + fines                     |
| PUT    | `/api/users/:id`                | Admin   | Edit, activate / deactivate                  |
| PUT    | `/api/users/me/profile`         | Auth    | Update own display name                      |
| GET    | `/api/fines`                    | Auth    | Fines (students see own; admin sees all)     |
| PUT    | `/api/fines/:id/pay`            | Admin   | Mark paid                                    |
| PUT    | `/api/fines/pay-all/:userId`    | Admin   | Settle a student's unpaid fines              |
| GET    | `/api/dashboard/stats`          | Admin   | KPIs, charts, recent transactions            |
| GET    | `/api/dashboard/reports`        | Admin   | Reports datasets                             |
| GET/PUT| `/api/settings`                 | Admin   | Library rules                                |
| GET    | `/api/notifications`            | Auth    | In-app notifications + unread count          |
| PUT    | `/api/notifications/:id/read`, `/read-all` | Auth | Mark read                        |
| GET    | `/api/health`                   | Public  | Health check                                 |

Errors return `{ "error": "Friendly message", "details": [...]? }` with proper status
codes (400 validation, 401 auth, 403 role, 404 missing, 409 conflicts such as duplicate
ISBN / already borrowed / already returned).

---

## 📁 Project structure

```
smart-library/
├── package.json              # convenience scripts (setup / seed / build / start / dev)
├── server/
│   ├── .env.example          # documented environment variables
│   ├── data/library.db       # SQLite database (created on first run)
│   └── src/
│       ├── index.js          # Express app, static client serving, error handling
│       ├── config.js         # env config with safe defaults
│       ├── db.js             # schema + connection (foreign keys ON)
│       ├── seed.js           # realistic sample data (22 books, 8 users, history, fines)
│       ├── library.js        # business logic: borrow/return transactions, fines, recommendations
│       ├── utils.js          # signed tokens, scrypt hashing, date helpers
│       ├── validate.js       # field validation helpers
│       ├── errors.js         # ApiError classes → HTTP status mapping
│       ├── middleware/       # attachUser / requireAuth / requireAdmin, error handler
│       └── routes/           # auth, books, borrow, users, fines, dashboard, notifications, settings
└── client/
    └── src/
        ├── App.jsx           # routes + role guards
        ├── api.js            # typed fetch wrapper for every endpoint
        ├── context/          # Auth, Theme (dark mode), Toast providers
        ├── components/       # Layout (navbar/footer/sidebar), guards, BookCard, UI kit
        ├── hooks/useFetch.js # data fetching with refetch
        └── pages/            # Home, Catalog, BookDetails, Login, Register,
                              # StudentDashboard, MyBooks, Profile
                              # admin/: Dashboard, Books, Students, Borrowing, Fines, Reports, Settings
```

## 🧪 Verified before delivery

- Registration, login (both roles), logout, change password, duplicate/weak-input rejection
- Borrow → due date +14d, duplicate-borrow 409, availability decrement
- Return → availability restore, on-time vs overdue fine creation, double-return guard
- Admin issue-on-behalf, overdue sweep, fine pay/unpay/settle-all
- Book CRUD incl. duplicate ISBN 409, copies validation, delete guard on borrowed titles
- Student can never reach admin APIs (403) or admin pages (redirect)
- Dark/light mode, mobile layout, SPA fallback, CSV exports, CSV of monthly report

---

*Built as a complete academic demonstration of a real-world library management product.*
