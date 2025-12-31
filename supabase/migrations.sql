-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contract_start_date date not null,
  created_at timestamp default now()
);

-- Onboardings
create table onboardings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  status text default 'not_started',
  created_at timestamp default now(),
  time_to_value_days integer
);

-- Onboarding Tasks
create table onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references onboardings(id),
  task_type text not null,
  owner_role text not null,
  status text default 'pending',
  due_date date,
  completed_at timestamp,
  is_blocker boolean default false,
  created_at timestamp default now()
);

-- Audit Events
create table events_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  event_type text,
  metadata jsonb,
  created_at timestamp default now()
);

