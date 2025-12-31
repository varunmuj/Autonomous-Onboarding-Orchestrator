// Data model interfaces for the Autonomous Onboarding Orchestrator

export interface Customer {
  id: string;
  name: string;
  contract_start_date: string; // ISO date string
  contact_email?: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  created_at: string; // ISO timestamp string
}

export interface Onboarding {
  id: string;
  customer_id: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  current_stage?: string;
  go_live_date?: string; // ISO date string
  time_to_value_days?: number;
  created_at: string; // ISO timestamp string
  completed_at?: string; // ISO timestamp string
}

export interface OnboardingTask {
  id: string;
  onboarding_id: string;
  task_type: string;
  title: string;
  description?: string;
  owner_role: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string; // ISO date string
  completed_at?: string; // ISO timestamp string
  is_blocker: boolean;
  blocker_reason?: string;
  created_at: string; // ISO timestamp string
}

export interface Integration {
  id: string;
  onboarding_id: string;
  type: 'SIS' | 'CRM' | 'SFTP' | 'API' | 'other';
  name: string;
  configuration?: Record<string, any>;
  status: 'not_configured' | 'configured' | 'testing' | 'active' | 'failed';
  test_results?: Record<string, any>;
  created_at: string; // ISO timestamp string
}

export interface Stakeholder {
  id: string;
  onboarding_id: string;
  role: 'owner' | 'it_contact' | 'project_manager' | 'technical_lead';
  name: string;
  email: string;
  phone?: string;
  responsibilities: string[];
  created_at: string; // ISO timestamp string
}

export interface EventsAudit {
  id: string;
  entity_type?: string;
  entity_id?: string;
  event_type?: string;
  metadata?: Record<string, any>;
  created_at: string; // ISO timestamp string
}

// Request/Response types for API endpoints
export interface CreateOnboardingRequest {
  customer_name: string;
  contract_start_date: string;
  contact_email?: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  go_live_date?: string;
  stakeholders?: Omit<Stakeholder, 'id' | 'onboarding_id' | 'created_at'>[];
  integrations?: Omit<Integration, 'id' | 'onboarding_id' | 'created_at' | 'status'>[];
}

export interface CreateOnboardingResponse {
  success: boolean;
  onboarding_id: string;
  customer_id: string;
}