// Stakeholder notification system for blockers and escalations

import { Stakeholder, OnboardingTask } from './types';
import { EscalationResult } from './escalation-logic';

export interface NotificationPayload {
  type: 'blocker_created' | 'task_escalated' | 'task_reminder' | 'blocker_resolved';
  recipients: string[];
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Sends notification to stakeholders about blockers
 */
export async function notifyStakeholdersAboutBlocker(
  task: OnboardingTask,
  stakeholders: Stakeholder[],
  customerName: string,
  escalationRecipients: string[]
): Promise<NotificationResult> {
  try {
    const notification: NotificationPayload = {
      type: 'blocker_created',
      recipients: escalationRecipients,
      subject: `[BLOCKED] Task Blocked: ${task.title} - ${customerName}`,
      message: generateBlockerNotificationMessage(task, customerName),
      urgency: task.priority === 'critical' ? 'critical' : 'high',
      metadata: {
        task_id: task.id,
        onboarding_id: task.onboarding_id,
        blocker_reason: task.blocker_reason,
        task_type: task.task_type,
        customer_name: customerName
      }
    };

    return await sendNotification(notification);
  } catch (error) {
    console.error('Failed to notify stakeholders about blocker:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends escalation notification to stakeholders
 */
export async function notifyStakeholdersAboutEscalation(
  task: OnboardingTask,
  escalationResult: EscalationResult,
  stakeholders: Stakeholder[],
  customerName: string
): Promise<NotificationResult> {
  try {
    // Find stakeholder emails for escalation roles
    const recipients: string[] = [];
    for (const role of escalationResult.escalateTo) {
      const stakeholder = stakeholders.find(s => s.role === role);
      if (stakeholder) {
        recipients.push(stakeholder.email);
      }
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipients found for escalation'
      };
    }

    const notification: NotificationPayload = {
      type: 'task_escalated',
      recipients,
      subject: `[OVERDUE] Task Escalation: ${task.title} - ${customerName}`,
      message: generateEscalationNotificationMessage(task, escalationResult, customerName),
      urgency: escalationResult.urgencyLevel,
      metadata: {
        task_id: task.id,
        onboarding_id: task.onboarding_id,
        days_overdue: escalationResult.daysOverdue,
        escalation_reason: escalationResult.escalationReason,
        task_type: task.task_type,
        customer_name: customerName
      }
    };

    return await sendNotification(notification);
  } catch (error) {
    console.error('Failed to notify stakeholders about escalation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends task reminder notification
 */
export async function sendTaskReminder(
  task: OnboardingTask,
  stakeholder: Stakeholder,
  customerName: string,
  daysUntilDue: number
): Promise<NotificationResult> {
  try {
    const urgency = daysUntilDue <= 1 ? 'high' : 'medium';
    
    const notification: NotificationPayload = {
      type: 'task_reminder',
      recipients: [stakeholder.email],
      subject: `[REMINDER] Task Due ${daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}: ${task.title} - ${customerName}`,
      message: generateReminderNotificationMessage(task, customerName, daysUntilDue),
      urgency,
      metadata: {
        task_id: task.id,
        onboarding_id: task.onboarding_id,
        days_until_due: daysUntilDue,
        task_type: task.task_type,
        customer_name: customerName
      }
    };

    return await sendNotification(notification);
  } catch (error) {
    console.error('Failed to send task reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Notifies stakeholders when a blocker is resolved
 */
export async function notifyBlockerResolution(
  task: OnboardingTask,
  stakeholders: Stakeholder[],
  customerName: string,
  resolutionNotes?: string
): Promise<NotificationResult> {
  try {
    // Notify the task owner and project manager
    const recipients: string[] = [];
    
    if (task.assigned_to) {
      recipients.push(task.assigned_to);
    }
    
    const projectManager = stakeholders.find(s => s.role === 'project_manager');
    if (projectManager && !recipients.includes(projectManager.email)) {
      recipients.push(projectManager.email);
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipients found for blocker resolution notification'
      };
    }

    const notification: NotificationPayload = {
      type: 'blocker_resolved',
      recipients,
      subject: `[RESOLVED] Blocker Cleared: ${task.title} - ${customerName}`,
      message: generateBlockerResolutionMessage(task, customerName, resolutionNotes),
      urgency: 'medium',
      metadata: {
        task_id: task.id,
        onboarding_id: task.onboarding_id,
        resolution_notes: resolutionNotes,
        task_type: task.task_type,
        customer_name: customerName
      }
    };

    return await sendNotification(notification);
  } catch (error) {
    console.error('Failed to notify blocker resolution:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Core notification sending function
 */
async function sendNotification(notification: NotificationPayload): Promise<NotificationResult> {
  try {
    // In production, this would integrate with email service, Slack, etc.
    // For now, we'll use the n8n notification webhook if available
    
    if (process.env.N8N_NOTIFICATION_WEBHOOK_URL) {
      const response = await fetch(process.env.N8N_NOTIFICATION_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: notification.type,
          recipients: notification.recipients,
          subject: notification.subject,
          message: notification.message,
          urgency: notification.urgency,
          metadata: notification.metadata
        }),
      });

      if (!response.ok) {
        throw new Error(`Notification webhook failed: ${response.status}`);
      }

      return {
        success: true,
        notificationId: `n8n-${Date.now()}`
      };
    } else {
      // Fallback: log notification (for development/demo)
      console.log('📧 Notification:', {
        type: notification.type,
        recipients: notification.recipients,
        subject: notification.subject,
        urgency: notification.urgency
      });
      
      return {
        success: true,
        notificationId: `log-${Date.now()}`
      };
    }
  } catch (error) {
    console.error('Notification sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Message generation functions

function generateBlockerNotificationMessage(task: OnboardingTask, customerName: string): string {
  return `
TASK BLOCKED - IMMEDIATE ATTENTION REQUIRED

Customer: ${customerName}
Task: ${task.title}
Type: ${task.task_type}
Priority: ${task.priority?.toUpperCase()}
Current Owner: ${task.assigned_to || task.owner_role}

BLOCKER REASON: ${task.blocker_reason}

Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}

This task is currently blocked and requires immediate resolution to prevent delays in the customer onboarding process.

Please log into the onboarding dashboard to review the blocker details and coordinate resolution.

Airr 3.0 Onboarding System
  `.trim();
}

function generateEscalationNotificationMessage(
  task: OnboardingTask, 
  escalationResult: EscalationResult, 
  customerName: string
): string {
  return `
TASK ESCALATION - OVERDUE TASK REQUIRES ATTENTION

Customer: ${customerName}
Task: ${task.title}
Type: ${task.task_type}
Priority: ${task.priority?.toUpperCase()}
Current Owner: ${task.assigned_to || task.owner_role}

OVERDUE: ${escalationResult.daysOverdue} days past due date
Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}
Escalation Reason: ${escalationResult.escalationReason}

This task is significantly overdue and may impact the customer's go-live timeline. Please review and take appropriate action.

Please log into the onboarding dashboard to review task details and coordinate resolution.

Airr 3.0 Onboarding System
  `.trim();
}

function generateReminderNotificationMessage(
  task: OnboardingTask, 
  customerName: string, 
  daysUntilDue: number
): string {
  const dueDateText = daysUntilDue === 0 ? 'today' : 
                     daysUntilDue === 1 ? 'tomorrow' : 
                     `in ${daysUntilDue} days`;

  return `
TASK REMINDER - DUE ${dueDateText.toUpperCase()}

Customer: ${customerName}
Task: ${task.title}
Type: ${task.task_type}
Priority: ${task.priority?.toUpperCase()}
Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}

This task is due ${dueDateText}. Please ensure it is completed on time to maintain the customer's onboarding schedule.

Please log into the onboarding dashboard to update the task status.

Airr 3.0 Onboarding System
  `.trim();
}

function generateBlockerResolutionMessage(
  task: OnboardingTask, 
  customerName: string, 
  resolutionNotes?: string
): string {
  return `
BLOCKER RESOLVED - TASK UNBLOCKED

Customer: ${customerName}
Task: ${task.title}
Type: ${task.task_type}
Priority: ${task.priority?.toUpperCase()}

The blocker for this task has been resolved and the task is now ready to proceed.

${resolutionNotes ? `Resolution Notes: ${resolutionNotes}` : ''}

Please log into the onboarding dashboard to continue work on this task.

Airr 3.0 Onboarding System
  `.trim();
}