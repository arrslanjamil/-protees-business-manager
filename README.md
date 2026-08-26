# Protees Business Manager

A modern, dark, futuristic business management system for Protees — employees, salaries, advances (qarza), units, and expenses, backed by Supabase and controllable by voice.

## Features

- **Employee Management** — add/edit/delete staff, assign to units, track role, phone, salary, status.
- **Salary Management** — record monthly salary payments per employee with full history.
- **Advance / Loan (Qarza) Management** — give employees advances against future salary.
- **Grand Advance Balance** — live outstanding balance per employee (total advanced − total deducted).
- **Auto Salary Deduction** — recording a salary payment automatically suggests deducting the outstanding advance balance (capped at the base salary), and allocates the deduction across the employee's advances oldest-first.
- **Green / Red Progress Bar** — visualizes each employee's advance balance as a percentage of their monthly salary (green < 30%, amber 30–70%, red ≥ 70%).
- **Unit Management** — organize employees and expenses by branch/location/department.
- **Expense Management** — track categorized business expenses, optionally scoped to a unit.
- **Reports Dashboard** — payroll, outstanding advances, expense breakdown, and risk charts.
- **Voice Commands** — say things like *"Give advance 5000 to Ali"*, *"Pay salary to Sara"*, or *"Add expense 2000 for electricity"*; the app parses intent, amount, employee, and category, then lets you confirm before saving.

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark, glassmorphic, neon theme)
- Supabase (Postgres + JS client) for storage
- Recharts for the reports dashboard
- Web Speech API for voice commands (Chrome / Edge)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project & schema

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run everything in [`supabase/schema.sql`](supabase/schema.sql). This creates the `units`, `employees`, `advances`, `salary_payments`, `advance_deductions`, and `expenses` tables, a convenience view, and permissive row-level-security policies suitable for a single-tenant internal tool used with the anon key.
3. Grab your project URL and anon key from Project Settings → API.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the dev server

```bash
npm run dev
```

Open the printed local URL. Voice commands require microphone permission and a Chromium-based browser (Web Speech API isn't supported in Firefox/Safari).

### 5. Build for production

```bash
npm run build
npm run preview
```

## How the advance/salary logic works

- Every advance given to an employee is stored in `advances`.
- Every salary payment is stored in `salary_payments`, with an optional `deduction_amount`.
- When a deduction is applied, it's recorded in `advance_deductions`, linked back to the specific advance(s) it paid down (oldest advance first).
- An employee's **grand advance balance** is `sum(advances.amount) − sum(advance_deductions.amount)`.
- The Salary form auto-suggests a deduction equal to `min(outstanding balance, base salary)`, editable before saving.
- The progress bar on each employee shows `balance / monthly_salary` as a percentage: green (safe), amber (moderate), red (high risk).

## Project structure

```
src/
  components/
    layout/     Sidebar, mobile nav, app shell
    ui/         Modal, ProgressBar, StatCard, Badge, EmptyState
    voice/      Voice command widget
  context/      DataContext — Supabase data + all CRUD/business logic
  hooks/        useVoiceCommand — Web Speech API wrapper
  lib/          supabase client, types, utils, voice command parser
  pages/        Dashboard, Employees, Salary, Advances, Units, Expenses
supabase/
  schema.sql    Full DB schema, view, and RLS policies
```
