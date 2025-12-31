// Demo data for testing the application without Supabase
import { Customer, Onboarding, OnboardingTask, Stakeholder, Integration } from './types';

export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here';

// Mock customers
export const mockCustomers: Customer[] = [
  {
    id: 'customer-1',
    name: 'Acme University',
    contract_start_date: '2024-01-15',
    contact_email: 'admin@acme-university.edu',
    industry: 'Higher Education',
    size: 'large',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'customer-2', 
    name: 'TechCorp Solutions',
    contract_start_date: '2024-02-01',
    contact_email: 'it@techcorp.com',
    industry: 'Technology',
    size: 'medium',
    created_at: '2024-02-01T14:30:00Z'
  },
  {
    id: 'customer-3',
    name: 'Global Enterprises Inc',
    contract_start_date: '2024-01-20',
    contact_email: 'onboarding@global-ent.com',
    industry: 'Manufacturing',
    size: 'enterprise',
    created_at: '2024-01-20T09:15:00Z'
  }
];

// Mock onboardings
export const mockOnboardings: Onboarding[] = [
  {
    id: 'onboarding-1',
    customer_id: 'customer-1',
    status: 'in_progress',
    current_stage: 'Integration Setup',
    go_live_date: '2024-03-15',
    time_to_value_days: 45,
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'onboarding-2',
    customer_id: 'customer-2',
    status: 'blocked',
    current_stage: 'Stakeholder Approval',
    go_live_date: '2024-03-01',
    created_at: '2024-02-01T14:30:00Z'
  },
  {
    id: 'onboarding-3',
    customer_id: 'customer-3',
    status: 'completed',
    current_stage: 'Go-Live',
    go_live_date: '2024-02-28',
    time_to_value_days: 39,
    created_at: '2024-01-20T09:15:00Z',
    completed_at: '2024-02-28T16:00:00Z'
  }
];

// Mock stakeholders
export const mockStakeholders: Stakeholder[] = [
  {
    id: 'stakeholder-1',
    onboarding_id: 'onboarding-1',
    role: 'owner',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@acme-university.edu',
    phone: '+1-555-0123',
    responsibilities: ['Project oversight', 'Budget approval'],
    created_at: '2024-01-15T10:05:00Z'
  },
  {
    id: 'stakeholder-2',
    onboarding_id: 'onboarding-1',
    role: 'it_contact',
    name: 'Mike Chen',
    email: 'mike.chen@acme-university.edu',
    responsibilities: ['Technical implementation', 'System integration'],
    created_at: '2024-01-15T10:05:00Z'
  },
  {
    id: 'stakeholder-3',
    onboarding_id: 'onboarding-2',
    role: 'project_manager',
    name: 'Lisa Rodriguez',
    email: 'lisa.rodriguez@techcorp.com',
    responsibilities: ['Timeline management', 'Stakeholder coordination'],
    created_at: '2024-02-01T14:35:00Z'
  },
  {
    id: 'stakeholder-4',
    onboarding_id: 'onboarding-3',
    role: 'technical_lead',
    name: 'David Kim',
    email: 'david.kim@global-ent.com',
    responsibilities: ['Architecture design', 'Integration testing'],
    created_at: '2024-01-20T09:20:00Z'
  }
];

// Mock integrations
export const mockIntegrations: Integration[] = [
  {
    id: 'integration-1',
    onboarding_id: 'onboarding-1',
    type: 'SIS',
    name: 'PowerSchool SIS',
    status: 'testing',
    configuration: { endpoint: 'https://acme.powerschool.com/api', version: 'v2' },
    created_at: '2024-01-15T10:10:00Z'
  },
  {
    id: 'integration-2',
    onboarding_id: 'onboarding-1',
    type: 'CRM',
    name: 'Salesforce CRM',
    status: 'configured',
    configuration: { instance: 'acme.salesforce.com', api_version: '58.0' },
    created_at: '2024-01-15T10:10:00Z'
  },
  {
    id: 'integration-3',
    onboarding_id: 'onboarding-2',
    type: 'SFTP',
    name: 'Data Transfer SFTP',
    status: 'failed',
    configuration: { host: 'sftp.techcorp.com', port: 22 },
    test_results: { error: 'Connection timeout', last_test: '2024-02-15T10:00:00Z' },
    created_at: '2024-02-01T14:40:00Z'
  },
  {
    id: 'integration-4',
    onboarding_id: 'onboarding-3',
    type: 'API',
    name: 'Custom API Integration',
    status: 'active',
    configuration: { endpoint: 'https://api.global-ent.com/v1', auth_type: 'oauth2' },
    created_at: '2024-01-20T09:25:00Z'
  }
];

// Mock tasks
export const mockTasks: OnboardingTask[] = [
  {
    id: 'task-1',
    onboarding_id: 'onboarding-1',
    task_type: 'integration_setup',
    title: 'Configure PowerSchool SIS Integration',
    description: 'Set up API connection and test data sync',
    owner_role: 'it_contact',
    assigned_to: 'Mike Chen',
    status: 'in_progress',
    priority: 'high',
    due_date: '2024-02-20',
    is_blocker: false,
    created_at: '2024-01-15T10:15:00Z'
  },
  {
    id: 'task-2',
    onboarding_id: 'onboarding-1',
    task_type: 'stakeholder_approval',
    title: 'Get budget approval for additional licenses',
    owner_role: 'owner',
    assigned_to: 'Sarah Johnson',
    status: 'pending',
    priority: 'medium',
    due_date: '2024-02-25',
    is_blocker: false,
    created_at: '2024-01-15T10:15:00Z'
  },
  {
    id: 'task-3',
    onboarding_id: 'onboarding-2',
    task_type: 'integration_setup',
    title: 'Fix SFTP connection issues',
    description: 'Resolve timeout errors in SFTP connection',
    owner_role: 'technical_lead',
    status: 'blocked',
    priority: 'critical',
    due_date: '2024-02-10',
    is_blocker: true,
    blocker_reason: 'Network firewall blocking SFTP port 22',
    created_at: '2024-02-01T14:45:00Z'
  },
  {
    id: 'task-4',
    onboarding_id: 'onboarding-3',
    task_type: 'go_live',
    title: 'Production deployment completed',
    owner_role: 'technical_lead',
    assigned_to: 'David Kim',
    status: 'completed',
    priority: 'high',
    completed_at: '2024-02-28T16:00:00Z',
    is_blocker: false,
    created_at: '2024-01-20T09:30:00Z'
  }
];

// Helper function to get demo dashboard data
export function getDemoDashboardData() {
  return mockOnboardings.map(onboarding => ({
    ...onboarding,
    customers: mockCustomers.find(c => c.id === onboarding.customer_id),
    onboarding_tasks: mockTasks.filter(t => t.onboarding_id === onboarding.id),
    stakeholders: mockStakeholders.filter(s => s.onboarding_id === onboarding.id),
    integrations: mockIntegrations.filter(i => i.onboarding_id === onboarding.id)
  }));
}

// Helper function to create a new demo onboarding
export function createDemoOnboarding(data: any) {
  const newCustomerId = `customer-${Date.now()}`;
  const newOnboardingId = `onboarding-${Date.now()}`;
  
  const newCustomer: Customer = {
    id: newCustomerId,
    name: data.customer_name,
    contract_start_date: data.contract_start_date,
    contact_email: data.contact_email,
    industry: data.industry,
    size: data.size,
    created_at: new Date().toISOString()
  };

  const newOnboarding: Onboarding = {
    id: newOnboardingId,
    customer_id: newCustomerId,
    status: 'not_started',
    current_stage: 'Intake',
    go_live_date: data.go_live_date,
    created_at: new Date().toISOString()
  };

  // Add to mock data (in a real app, this would persist)
  mockCustomers.push(newCustomer);
  mockOnboardings.push(newOnboarding);

  // Add stakeholders if provided
  if (data.stakeholders && data.stakeholders.length > 0) {
    data.stakeholders.forEach((stakeholder: any, index: number) => {
      mockStakeholders.push({
        id: `stakeholder-${Date.now()}-${index}`,
        onboarding_id: newOnboardingId,
        ...stakeholder,
        created_at: new Date().toISOString()
      });
    });
  }

  // Add integrations if provided
  if (data.integrations && data.integrations.length > 0) {
    data.integrations.forEach((integration: any, index: number) => {
      mockIntegrations.push({
        id: `integration-${Date.now()}-${index}`,
        onboarding_id: newOnboardingId,
        ...integration,
        status: 'not_configured',
        created_at: new Date().toISOString()
      });
    });
  }

  return {
    success: true,
    onboarding_id: newOnboardingId,
    customer_id: newCustomerId
  };
}