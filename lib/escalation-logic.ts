// Escalation logic for overdue tasks and blockers

import { OnboardingTask, Stakeholder } from './types';

export interface EscalationRule {
  taskType: string;
  overdueThresholdDays: number;
  escalationChain: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EscalationResult {
  shouldEscalate: boolean;
  escalateTo: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  escalationReason: string;
  daysOverdue: number;
}

// Escalation rules based on task type and priority
export const ESCALATION_RULES: EscalationRule[] = [
  {
    taskType: 'kickoff_meeting',
    overdueThresholdDays: 1,
    escalationChain: ['project_manager', 'owner'],
    urgencyLevel: 'high'
  },
  {
    taskType: 'sis_setup',
    overdueThresholdDays: 2,
    escalationChain: ['technical_lead', 'project_manager', 'owner'],
    urgencyLevel: 'critical'
  },
  {
    taskType: 'crm_setup',
    overdueThresholdDays: 3,
    escalationChain: ['technical_lead', 'project_manager'],
    urgencyLevel: 'high'
  },
  {
    taskType: 'sftp_setup',
    overdueThresholdDays: 3,
    escalationChain: ['technical_lead', 'project_manager'],
    urgencyLevel: 'high'
  },
  {
    taskType: 'api_setup',
    overdueThresholdDays: 3,
    escalationChain: ['technical_lead', 'project_manager'],
    urgencyLevel: 'high'
  },
  {
    taskType: 'security_review',
    overdueThresholdDays: 2,
    escalationChain: ['technical_lead', 'project_manager', 'owner'],
    urgencyLevel: 'critical'
  },
  {
    taskType: 'compliance_check',
    overdueThresholdDays: 2,
    escalationChain: ['technical_lead', 'project_manager', 'owner'],
    urgencyLevel: 'critical'
  },
  {
    taskType: 'go_live_preparation',
    overdueThresholdDays: 1,
    escalationChain: ['project_manager', 'owner'],
    urgencyLevel: 'critical'
  }
];

// Default escalation rule for unknown task types
const DEFAULT_ESCALATION_RULE: EscalationRule = {
  taskType: 'default',
  overdueThresholdDays: 3,
  escalationChain: ['project_manager', 'owner'],
  urgencyLevel: 'medium'
};

/**
 * Determines if a task should be escalated based on its overdue status
 */
export function shouldEscalateTask(task: OnboardingTask): EscalationResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  
  if (!dueDate) {
    return {
      shouldEscalate: false,
      escalateTo: [],
      urgencyLevel: 'low',
      escalationReason: 'No due date set',
      daysOverdue: 0
    };
  }

  dueDate.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysOverdue <= 0) {
    return {
      shouldEscalate: false,
      escalateTo: [],
      urgencyLevel: 'low',
      escalationReason: 'Task not overdue',
      daysOverdue: 0
    };
  }

  // Find applicable escalation rule
  const rule = ESCALATION_RULES.find(r => r.taskType === task.task_type) || DEFAULT_ESCALATION_RULE;
  
  if (daysOverdue < rule.overdueThresholdDays) {
    return {
      shouldEscalate: false,
      escalateTo: [],
      urgencyLevel: 'low',
      escalationReason: `Task overdue by ${daysOverdue} days, but below threshold of ${rule.overdueThresholdDays} days`,
      daysOverdue
    };
  }

  // Determine escalation level based on how overdue the task is
  let escalationLevel = 0;
  if (daysOverdue >= rule.overdueThresholdDays * 3) {
    escalationLevel = Math.min(rule.escalationChain.length - 1, 2); // Escalate to highest level
  } else if (daysOverdue >= rule.overdueThresholdDays * 2) {
    escalationLevel = Math.min(rule.escalationChain.length - 1, 1); // Escalate to middle level
  } else {
    escalationLevel = 0; // Escalate to first level
  }

  const escalateTo = rule.escalationChain.slice(0, escalationLevel + 1);
  
  return {
    shouldEscalate: true,
    escalateTo,
    urgencyLevel: rule.urgencyLevel,
    escalationReason: `Task overdue by ${daysOverdue} days (threshold: ${rule.overdueThresholdDays} days)`,
    daysOverdue
  };
}

/**
 * Determines escalation recipients for a blocked task
 */
export function getBlockerEscalationRecipients(
  task: OnboardingTask,
  stakeholders: Stakeholder[]
): { escalateTo: string[]; urgencyLevel: 'low' | 'medium' | 'high' | 'critical' } {
  // Escalation map based on current task owner role
  const escalationMap: Record<string, string[]> = {
    'it_contact': ['technical_lead', 'project_manager'],
    'technical_lead': ['project_manager', 'owner'],
    'project_manager': ['owner'],
    'owner': ['project_manager'], // Escalate back to PM for resolution support
  };

  const escalationRoles = escalationMap[task.owner_role] || ['project_manager'];
  
  // Find actual stakeholders for these roles
  const escalationRecipients: string[] = [];
  for (const role of escalationRoles) {
    const stakeholder = stakeholders.find(s => s.role === role);
    if (stakeholder) {
      escalationRecipients.push(stakeholder.email);
    }
  }

  // Determine urgency based on task type and priority
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  if (task.priority === 'critical' || task.task_type.includes('security') || task.task_type.includes('sis')) {
    urgencyLevel = 'critical';
  } else if (task.priority === 'high' || task.task_type.includes('setup') || task.task_type.includes('go_live')) {
    urgencyLevel = 'high';
  } else if (task.priority === 'low') {
    urgencyLevel = 'low';
  }

  return {
    escalateTo: escalationRecipients,
    urgencyLevel
  };
}

/**
 * Generates escalation notification content
 */
export function generateEscalationNotification(
  task: OnboardingTask,
  escalationResult: EscalationResult,
  customerName: string,
  isBlocker: boolean = false
): {
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
} {
  const escalationType = isBlocker ? 'BLOCKED' : 'OVERDUE';
  const subject = `[${escalationType}] Task Escalation: ${task.title} - ${customerName}`;
  
  const message = `
TASK ESCALATION NOTICE

Customer: ${customerName}
Task: ${task.title}
Type: ${task.task_type}
Priority: ${task.priority?.toUpperCase()}
Current Owner: ${task.assigned_to || task.owner_role}

${isBlocker ? 
  `BLOCKER REASON: ${task.blocker_reason}` : 
  `OVERDUE: ${escalationResult.daysOverdue} days past due date`
}

Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}
Escalation Reason: ${escalationResult.escalationReason}

This task requires immediate attention to prevent further delays in the customer onboarding process.

Please log into the onboarding dashboard to review and take action.

Airr 3.0 Onboarding System
  `.trim();

  return {
    subject,
    message,
    urgency: escalationResult.urgencyLevel
  };
}

/**
 * Checks all tasks for a given onboarding and returns those that need escalation
 */
export function findTasksNeedingEscalation(tasks: OnboardingTask[]): {
  task: OnboardingTask;
  escalationResult: EscalationResult;
}[] {
  const tasksNeedingEscalation: { task: OnboardingTask; escalationResult: EscalationResult }[] = [];
  
  for (const task of tasks) {
    // Skip completed tasks
    if (task.status === 'completed') {
      continue;
    }
    
    const escalationResult = shouldEscalateTask(task);
    if (escalationResult.shouldEscalate) {
      tasksNeedingEscalation.push({ task, escalationResult });
    }
  }
  
  return tasksNeedingEscalation;
}