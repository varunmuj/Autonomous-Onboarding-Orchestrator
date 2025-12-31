-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contract_start_date date not null,
  contact_email text,
  industry text,
  size text check (size in ('small', 'medium', 'large', 'enterprise')),
  created_at timestamp default now()
);

-- Onboardings
create table onboardings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  status text default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  current_stage text,
  go_live_date date,
  time_to_value_days integer,
  created_at timestamp default now(),
  completed_at timestamp
);

-- Onboarding Tasks
create table onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references onboardings(id),
  task_type text not null,
  title text not null,
  description text,
  owner_role text not null,
  assigned_to text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_date date,
  completed_at timestamp,
  is_blocker boolean default false,
  blocker_reason text,
  created_at timestamp default now()
);

-- Stakeholders
create table stakeholders (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references onboardings(id),
  role text not null check (role in ('owner', 'it_contact', 'project_manager', 'technical_lead')),
  name text not null,
  email text not null,
  phone text,
  responsibilities text[],
  created_at timestamp default now()
);

-- Integrations
create table integrations (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references onboardings(id),
  type text not null check (type in ('SIS', 'CRM', 'SFTP', 'API', 'other')),
  name text not null,
  configuration jsonb,
  status text default 'not_configured' check (status in ('not_configured', 'configured', 'testing', 'active', 'failed')),
  test_results jsonb,
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

