// Task assignment and ownership logic for the Autonomous Onboarding Orchestrator

import { Stakeholder, OnboardingTask, Integration } from './types';

export interface TaskAssignmentRule {
  taskType: string;
  preferredRoles: string[];
  fallbackRole: string;
}

// Task assignment rules based on task type and stakeholder roles
export const TASK_ASSIGNMENT_RULES: TaskAssignmentRule[] = [
  {
    taskType: 'kickoff_meeting',
    preferredRoles: ['project_manager', 'owner'],
    fallbackRole: 'project_manager'
  },
  {
    taskType: 'requirements_review',
    preferredRoles: ['owner', 'project_manager'],
    fallbackRole: 'owner'
  },
  {
    taskType: 'timeline_planning',
    preferredRoles: ['project_manager'],
    fallbackRole: 'project_manager'
  },
  {
    taskType: 'security_review',
    preferredRoles: ['technical_lead', 'it_contact'],
    fallbackRole: 'technical_lead'
  },
  {
    taskType: 'compliance_check',
    preferredRoles: ['technical_lead', 'owner'],
    fallbackRole: 'technical_lead'
  },
  {
    taskType: 'go_live_preparation',
    preferredRoles: ['project_manager', 'technical_lead'],
    fallbackRole: 'project_manager'
  }
];

// Integration-specific task assignment rules
export const INTEGRATION_TASK_RULES: Record<string, TaskAssignmentRule> = {
  'sis_setup': {
    taskType: 'sis_setup',
    preferredRoles: ['it_contact', 'technical_lead'],
    fallbackRole: 'it_contact'
  },
  'crm_setup': {
    taskType: 'crm_setup',
    preferredRoles: ['it_contact', 'technical_lead'],
    fallbackRole: 'it_contact'
  },
  'sftp_setup': {
    taskType: 'sftp_setup',
    preferredRoles: ['technical_lead', 'it_contact'],
    fallbackRole: 'technical_lead'
  },
  'api_setup': {
    taskType: 'api_setup',
    preferredRoles: ['technical_lead'],
    fallbackRole: 'technical_lead'
  },
  'sis_testing': {
    taskType: 'sis_testing',
    preferredRoles: ['technical_lead', 'it_contact'],
    fallbackRole: 'technical_lead'
  },
  'crm_testing': {
    taskType: 'crm_testing',
    preferredRoles: ['technical_lead', 'it_contact'],
    fallbackRole: 'technical_lead'
  },
  'sftp_testing': {
    taskType: 'sftp_testing',
    preferredRoles: ['technical_lead'],
    fallbackRole: 'technical_lead'
  },
  'api_testing': {
    taskType: 'api_testing',
    preferredRoles: ['technical_lead'],
    fallbackRole: 'technical_lead'
  }
};

/**
 * Assigns a task to the most appropriate stakeholder based on task type and available stakeholders
 */
export function assignTaskToStakeholder(
  taskType: string,
  stakeholders: Stakeholder[]
): { ownerRole: string; assignedTo?: string } {
  // Check for integration-specific rules first
  const integrationRule = INTEGRATION_TASK_RULES[taskType];
  const rule = integrationRule || TASK_ASSIGNMENT_RULES.find(r => r.taskType === taskType);
  
  if (!rule) {
    // Default assignment for unknown task types
    return {
      ownerRole: 'project_manager',
      assignedTo: stakeholders.find(s => s.role === 'project_manager')?.email
    };
  }

  // Ensure rule has valid preferredRoles array
  if (!rule.preferredRoles || !Array.isArray(rule.preferredRoles)) {
    return {
      ownerRole: rule.fallbackRole || 'project_manager',
      assignedTo: stakeholders.find(s => s.role === (rule.fallbackRole || 'project_manager'))?.email
    };
  }

  // Try to find a stakeholder with preferred roles
  for (const preferredRole of rule.preferredRoles) {
    const stakeholder = stakeholders.find(s => s.role === preferredRole);
    if (stakeholder) {
      return {
        ownerRole: preferredRole,
        assignedTo: stakeholder.email
      };
    }
  }

  // Fall back to fallback role
  const fallbackStakeholder = stakeholders.find(s => s.role === rule.fallbackRole);
  return {
    ownerRole: rule.fallbackRole,
    assignedTo: fallbackStakeholder?.email
  };
}

/**
 * Calculates task priority based on task type and integration requirements
 */
export function calculateTaskPriority(
  taskType: string,
  integration?: Integration
): 'low' | 'medium' | 'high' | 'critical' {
  // Critical tasks
  if (taskType.includes('security') || taskType.includes('sis_setup')) {
    return 'critical';
  }

  // High priority tasks
  if (taskType.includes('kickoff') || taskType.includes('requirements') || 
      taskType.includes('go_live') || taskType.includes('setup')) {
    return 'high';
  }

  // Medium priority tasks
  if (taskType.includes('testing') || taskType.includes('planning')) {
    return 'medium';
  }

  // Default to medium
  return 'medium';
}

/**
 * Calculates due date based on task type and go-live date
 */
export function calculateTaskDueDate(
  taskType: string,
  goLiveDate?: string,
  customerSize?: string
): Date {
  const now = new Date();
  let dueDays = 7; // Default

  // Task-specific due date calculations
  if (taskType.includes('kickoff')) {
    dueDays = 1;
  } else if (taskType.includes('requirements')) {
    dueDays = 2;
  } else if (taskType.includes('setup')) {
    dueDays = taskType.includes('sis') ? 3 : 5;
  } else if (taskType.includes('testing')) {
    dueDays = taskType.includes('sis') ? 5 : 7;
  } else if (taskType.includes('security') || taskType.includes('compliance')) {
    dueDays = customerSize === 'enterprise' ? 5 : 7;
  } else if (taskType.includes('go_live')) {
    if (goLiveDate) {
      const goLive = new Date(goLiveDate);
      const daysUntilGoLive = Math.floor((goLive.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      dueDays = Math.max(1, daysUntilGoLive - 2); // 2 days before go-live, minimum 1 day
    } else {
      dueDays = 14;
    }
  }

  return new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
}

/**
 * Generates notification content for task assignment
 */
export function generateTaskNotification(
  task: Partial<OnboardingTask>,
  stakeholder: Stakeholder,
  customerName: string
): {
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
} {
  const urgencyMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'low': 'low',
    'medium': 'medium', 
    'high': 'high',
    'critical': 'critical'
  };

  const urgency = urgencyMap[task.priority || 'medium'];
  
  const subject = `New Task Assignment: ${task.title} - ${customerName}`;
  
  const message = `
Hello ${stakeholder.name},

You have been assigned a new onboarding task for ${customerName}:

Task: ${task.title}
Priority: ${task.priority?.toUpperCase()}
Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}
Description: ${task.description || 'No additional details provided'}

Please log into the onboarding dashboard to view full details and update the task status.

Best regards,
Airr 3.0 Onboarding System
  `.trim();

  return { subject, message, urgency };
}