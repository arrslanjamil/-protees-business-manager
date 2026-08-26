-- Protees Business Manager — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Units (branches / locations / departments)
-- ---------------------------------------------------------------------------
create table if not exists units (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  role text,
  unit_id uuid references units(id) on delete set null,
  monthly_salary numeric(12,2) not null default 0,
  joined_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Advances / loans (Qarza) given to an employee
-- ---------------------------------------------------------------------------
create table if not exists advances (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Salary payments
-- ---------------------------------------------------------------------------
create table if not exists salary_payments (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  base_amount numeric(12,2) not null,
  deduction_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null,
  month int not null check (month between 1 and 12),
  year int not null,
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Advance deductions — links a salary payment back to the advance(s) it paid down
-- ---------------------------------------------------------------------------
create table if not exists advance_deductions (
  id uuid primary key default uuid_generate_v4(),
  advance_id uuid references advances(id) on delete set null,
  employee_id uuid not null references employees(id) on delete cascade,
  salary_payment_id uuid references salary_payments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references units(id) on delete set null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_unit on employees(unit_id);
create index if not exists idx_advances_employee on advances(employee_id);
create index if not exists idx_salary_payments_employee on salary_payments(employee_id);
create index if not exists idx_advance_deductions_employee on advance_deductions(employee_id);
create index if not exists idx_expenses_unit on expenses(unit_id);

-- ---------------------------------------------------------------------------
-- View: outstanding advance ("grand") balance per employee
-- ---------------------------------------------------------------------------
create or replace view employee_advance_balance as
select
  e.id as employee_id,
  coalesce(adv.total_advanced, 0) as total_advanced,
  coalesce(ded.total_deducted, 0) as total_deducted,
  coalesce(adv.total_advanced, 0) - coalesce(ded.total_deducted, 0) as balance
from employees e
left join (
  select employee_id, sum(amount) as total_advanced
  from advances
  group by employee_id
) adv on adv.employee_id = e.id
left join (
  select employee_id, sum(amount) as total_deducted
  from advance_deductions
  group by employee_id
) ded on ded.employee_id = e.id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- This app is intended as a single-tenant internal tool used with the
-- Supabase anon key. The policies below allow full read/write access.
-- If you expose this publicly, replace them with auth-scoped policies.
-- ---------------------------------------------------------------------------
alter table units enable row level security;
alter table employees enable row level security;
alter table advances enable row level security;
alter table salary_payments enable row level security;
alter table advance_deductions enable row level security;
alter table expenses enable row level security;

drop policy if exists "allow all" on units;
drop policy if exists "allow all" on employees;
drop policy if exists "allow all" on advances;
drop policy if exists "allow all" on salary_payments;
drop policy if exists "allow all" on advance_deductions;
drop policy if exists "allow all" on expenses;

create policy "allow all" on units for all using (true) with check (true);
create policy "allow all" on employees for all using (true) with check (true);
create policy "allow all" on advances for all using (true) with check (true);
create policy "allow all" on salary_payments for all using (true) with check (true);
create policy "allow all" on advance_deductions for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
