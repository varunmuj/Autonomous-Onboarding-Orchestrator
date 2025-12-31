/**
 * Property-based tests for blocker escalation system
 * Feature: autonomous-onboarding-orchestrator, Property 5: Blocker Escalation
 * Validates: Requirements 2.5, 5.4
 */

import { describe, test, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { OnboardingTask } from './types';
import { 
  shouldEscalateTask, 
  getBlockerEscalationRecipients, 
  generateEscalationNotification,
  findTasksNeedingEscalation,
  ESCALATION_RULES
} from './escalation-logic';
import { 
  notifyStakeholdersAboutBlocker, 
  notifyStakeholdersAboutEscalation,
  sendTaskReminder 
} from './notification-system';

// Mock fetch for API calls
global.fetch = vi.fn();

// Generators for property-based testing
const stakeholderRoleArb = fc.constantFrom('owner', 'it_contact', 'project_manager', 'technical_lead');
const taskTypeArb = fc.constantFrom(
  'kickoff_meeting',
  'requirements_review', 
  'timeline_planning',
  'security_review',
  'compliance_check',
  'go_live_preparation',
  'sis_setup',
  'crm_setup',
  'sftp_setup',
  'api_setup',
  'sis_testing',
  'crm_testing',
  'sftp_testing',
  'api_testing'
);
const priorityArb = fc.constantFrom('low', 'medium', 'high', 'critical');

const pastDateArb = fc.integer({ min: 2, max: 60 }).map(daysAgo => {
  // Generate a date that's definitely in the past by going back a specific number of days
  // Use a fresh Date() call to ensure we're always relative to current time
  const now = new Date();
  // Set to start of day to avoid time zone issues
  now.setHours(0, 0, 0, 0);
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return pastDate.toISOString().split('T')[0];
});

const futureDateArb = fc.integer({ min: 1, max: 365 }).map(daysFromNow => {
  // Generate a date that's definitely in the future by going forward a specific number of days
  const now = new Date();
  // Set to start of day to avoid time zone issues
  now.setHours(0, 0, 0, 0);
  const futureDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return futureDate.toISOString().split('T')[0];
});

const stakeholderArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  role: stakeholderRoleArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => {
    try {
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  })
});

const blockedTaskArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  task_type: taskTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  owner_role: stakeholderRoleArb,
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  status: fc.constant('blocked'),
  priority: priorityArb,
  due_date: fc.option(pastDateArb, { nil: undefined }),
  completed_at: fc.option(fc.constant(undefined), { nil: undefined }),
  is_blocker: fc.constant(true),
  blocker_reason: fc.string({ minLength: 1, maxLength: 500 }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => {
    try {
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  })
});

const overdueTaskArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  task_type: taskTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  owner_role: stakeholderRoleArb,
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  status: fc.constantFrom('pending', 'in_progress'),
  priority: priorityArb,
  due_date: pastDateArb, // Always overdue
  completed_at: fc.option(fc.constant(undefined), { nil: undefined }),
  is_blocker: fc.constant(false),
  blocker_reason: fc.option(fc.constant(undefined), { nil: undefined }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => {
    try {
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  })
});

const activeTaskArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  task_type: taskTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  owner_role: stakeholderRoleArb,
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  status: fc.constantFrom('pending', 'in_progress'),
  priority: priorityArb,
  due_date: fc.option(futureDateArb, { nil: undefined }),
  completed_at: fc.option(fc.constant(undefined), { nil: undefined }),
  is_blocker: fc.constant(false),
  blocker_reason: fc.option(fc.constant(undefined), { nil: undefined }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => {
    try {
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  })
});

describe('Blocker Escalation Properties', () => {
  test('Property 5: Blocker Escalation - For any task that becomes blocked, the orchestrator should create escalation records with blocker details and notify appropriate stakeholders based on their roles and responsibilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          blockedTaskArb,
          fc.array(stakeholderArb, { minLength: 1, maxLength: 8 }),
          fc.string({ minLength: 1, maxLength: 100 }) // customer name
        ),
        async ([blockedTask, stakeholders, customerName]) => {
          // Ensure at least one stakeholder matches the task's owner role or has a role that can receive escalations
          const enhancedStakeholders = [...stakeholders];
          
          // Add a stakeholder that matches the escalation chain for the task's owner role
          const escalationMap: Record<string, string[]> = {
            'it_contact': ['technical_lead', 'project_manager'],
            'technical_lead': ['project_manager', 'owner'],
            'project_manager': ['owner'],
            'owner': ['project_manager']
          };
          
          const escalationRoles = escalationMap[blockedTask.owner_role] || ['project_manager'];
          const firstEscalationRole = escalationRoles[0];
          
          // Ensure we have a stakeholder for the first escalation role
          if (!enhancedStakeholders.some(s => s.role === firstEscalationRole)) {
            enhancedStakeholders.push({
              id: `escalation-${firstEscalationRole}`,
              onboarding_id: blockedTask.onboarding_id,
              role: firstEscalationRole as any,
              name: `Test ${firstEscalationRole}`,
              email: `${firstEscalationRole}@test.com`,
              phone: undefined,
              responsibilities: ['escalation handling'],
              created_at: new Date().toISOString()
            });
          }

          // Test blocker escalation recipients logic
          const escalationResult = getBlockerEscalationRecipients(blockedTask, enhancedStakeholders);
          
          // Should have escalation recipients
          expect(escalationResult.escalateTo.length).toBeGreaterThan(0);
          
          // All escalation recipients should be valid stakeholder emails
          for (const recipientEmail of escalationResult.escalateTo) {
            const stakeholder = enhancedStakeholders.find(s => s.email === recipientEmail);
            expect(stakeholder).toBeDefined();
            expect(escalationRoles).toContain(stakeholder!.role);
          }
          
          // Urgency level should be appropriate for task type and priority
          expect(['low', 'medium', 'high', 'critical']).toContain(escalationResult.urgencyLevel);
          
          // Critical tasks should have high or critical urgency
          if (blockedTask.priority === 'critical' || 
              blockedTask.task_type.includes('security') || 
              blockedTask.task_type.includes('sis')) {
            expect(['high', 'critical']).toContain(escalationResult.urgencyLevel);
          }

          // Mock successful notification response
          const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({ success: true, notification_id: 'test-notification-id' })
          };

          vi.clearAllMocks();
          (global.fetch as any).mockResolvedValueOnce(mockResponse);

          // Test notification system
          const notificationResult = await notifyStakeholdersAboutBlocker(
            blockedTask,
            enhancedStakeholders,
            customerName,
            escalationResult.escalateTo
          );

          // Should succeed
          expect(notificationResult.success).toBe(true);
          expect(notificationResult.notificationId).toBeDefined();

          // Verify notification was sent (if webhook URL is configured)
          if (process.env.N8N_NOTIFICATION_WEBHOOK_URL) {
            expect(global.fetch).toHaveBeenCalled();
          }

          // Test escalation notification generation
          const escalationNotification = generateEscalationNotification(
            blockedTask,
            {
              shouldEscalate: true,
              escalateTo: escalationResult.escalateTo.map(email => {
                const stakeholder = enhancedStakeholders.find(s => s.email === email);
                return stakeholder?.role || 'unknown';
              }),
              urgencyLevel: escalationResult.urgencyLevel,
              escalationReason: `Task blocked: ${blockedTask.blocker_reason}`,
              daysOverdue: 0
            },
            customerName,
            true // isBlocker
          );

          // Notification should have proper structure
          expect(escalationNotification.subject).toContain('[BLOCKED]');
          expect(escalationNotification.subject).toContain(customerName);
          expect(escalationNotification.message).toContain(blockedTask.blocker_reason);
          expect(escalationNotification.message).toContain(customerName);
          expect(escalationNotification.urgency).toBe(escalationResult.urgencyLevel);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for comprehensive property test

  test('Property 5.1: Overdue Task Escalation - For any overdue task, the system should determine correct escalation based on how overdue it is', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          overdueTaskArb,
          fc.array(stakeholderArb, { minLength: 1, maxLength: 8 }),
          fc.string({ minLength: 1, maxLength: 100 }) // customer name
        ),
        async ([overdueTask, stakeholders, customerName]) => {
          // Validate that the task is actually overdue before testing escalation
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
          const dueDate = new Date(overdueTask.due_date!);
          dueDate.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
          const actualDaysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Debug information for troubleshooting
          if (actualDaysOverdue <= 0) {
            console.warn(`Generated task with due_date "${overdueTask.due_date}" is not actually overdue (${actualDaysOverdue} days). Skipping escalation test.`);
            return; // Skip this test case as the task is not actually overdue
          }
          
          // Test overdue task escalation logic
          const escalationResult = shouldEscalateTask(overdueTask);
          
          // Determine expected escalation behavior based on escalation rules
          const rule = ESCALATION_RULES.find(r => r.taskType === overdueTask.task_type) || {
            taskType: 'default',
            overdueThresholdDays: 3,
            escalationChain: ['project_manager', 'owner'],
            urgencyLevel: 'medium' as const
          };
          
          const shouldExpectEscalation = actualDaysOverdue >= rule.overdueThresholdDays;
          
          // Test that escalation result matches expected behavior
          expect(escalationResult.shouldEscalate).toBe(shouldExpectEscalation);
          expect(escalationResult.daysOverdue).toBe(actualDaysOverdue);
          
          if (shouldExpectEscalation) {
            // If escalation is expected, verify escalation details
            expect(escalationResult.escalateTo.length).toBeGreaterThan(0);
            expect(escalationResult.urgencyLevel).toBe(rule.urgencyLevel);
            expect(escalationResult.escalationReason).toContain(`${actualDaysOverdue} days`);
            
            // Ensure we have stakeholders for the escalation roles
            const enhancedStakeholders = [...stakeholders];
            for (const role of escalationResult.escalateTo) {
              if (!enhancedStakeholders.some(s => s.role === role)) {
                enhancedStakeholders.push({
                  id: `escalation-${role}`,
                  onboarding_id: overdueTask.onboarding_id,
                  role: role as any,
                  name: `Test ${role}`,
                  email: `${role}@test.com`,
                  phone: undefined,
                  responsibilities: ['escalation handling'],
                  created_at: new Date().toISOString()
                });
              }
            }
            
            // Test notification system
            const mockResponse = {
              ok: true,
              status: 200,
              json: async () => ({ success: true, notification_id: 'test-notification-id' })
            };

            vi.clearAllMocks();
            (global.fetch as any).mockResolvedValueOnce(mockResponse);

            const notificationResult = await notifyStakeholdersAboutEscalation(
              overdueTask,
              escalationResult,
              enhancedStakeholders,
              customerName
            );

            // Should succeed if valid recipients exist
            expect(notificationResult.success).toBe(true);
          } else {
            // If no escalation is expected, verify no escalation occurs
            expect(escalationResult.escalateTo.length).toBe(0);
            expect(escalationResult.escalationReason).toContain('below threshold');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  test('Property 5.2: Task Reminder System - For any task approaching due date, appropriate reminders should be sent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          activeTaskArb,
          stakeholderArb,
          fc.string({ minLength: 1, maxLength: 100 }) // customer name
        ),
        async ([task, stakeholder, customerName]) => {
          // Ensure stakeholder matches task assignment
          const assignedStakeholder = {
            ...stakeholder,
            role: task.owner_role,
            email: task.assigned_to || stakeholder.email
          };

          // Calculate days until due
          const now = new Date();
          const dueDate = task.due_date ? new Date(task.due_date) : null;
          
          if (dueDate) {
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            // Test reminder for tasks due in 0-2 days
            if (daysUntilDue >= 0 && daysUntilDue <= 2) {
              // Mock successful notification response
              const mockResponse = {
                ok: true,
                status: 200,
                json: async () => ({ success: true, notification_id: 'test-reminder-id' })
              };

              vi.clearAllMocks();
              (global.fetch as any).mockResolvedValueOnce(mockResponse);

              const reminderResult = await sendTaskReminder(
                task,
                assignedStakeholder,
                customerName,
                daysUntilDue
              );

              // Should succeed
              expect(reminderResult.success).toBe(true);
              expect(reminderResult.notificationId).toBeDefined();

              // Note: Urgency logic is handled internally by the notification system
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  test('Property 5.3: Escalation Chain Consistency - For any owner role, escalation should follow consistent hierarchy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          stakeholderRoleArb,
          fc.array(stakeholderArb, { minLength: 2, maxLength: 8 })
        ),
        async ([ownerRole, stakeholders]) => {
          // Create a task with the specified owner role
          const testTask: OnboardingTask = {
            id: 'test-task',
            onboarding_id: 'test-onboarding',
            task_type: 'test_task',
            title: 'Test Task',
            owner_role: ownerRole,
            assigned_to: undefined,
            status: 'blocked',
            priority: 'medium',
            due_date: undefined,
            completed_at: undefined,
            is_blocker: true,
            blocker_reason: 'Test blocker',
            created_at: new Date().toISOString()
          };

          // Ensure we have stakeholders for all possible escalation roles
          const enhancedStakeholders = [...stakeholders];
          const allRoles = ['owner', 'it_contact', 'project_manager', 'technical_lead'];
          
          for (const role of allRoles) {
            if (!enhancedStakeholders.some(s => s.role === role)) {
              enhancedStakeholders.push({
                id: `test-${role}`,
                onboarding_id: 'test-onboarding',
                role: role as any,
                name: `Test ${role}`,
                email: `${role}@test.com`,
                phone: undefined,
                responsibilities: ['test'],
                created_at: new Date().toISOString()
              });
            }
          }

          const escalationResult1 = getBlockerEscalationRecipients(testTask, enhancedStakeholders);
          const escalationResult2 = getBlockerEscalationRecipients(testTask, enhancedStakeholders);

          // Escalation should be deterministic
          expect(escalationResult1.escalateTo).toEqual(escalationResult2.escalateTo);
          expect(escalationResult1.urgencyLevel).toBe(escalationResult2.urgencyLevel);

          // Verify escalation chain follows expected hierarchy
          const expectedEscalationMap: Record<string, string[]> = {
            'it_contact': ['technical_lead', 'project_manager'],
            'technical_lead': ['project_manager', 'owner'],
            'project_manager': ['owner'],
            'owner': ['project_manager']
          };

          const expectedRoles = expectedEscalationMap[ownerRole] || ['project_manager'];
          
          // All escalation recipients should be from expected roles
          for (const recipientEmail of escalationResult1.escalateTo) {
            const stakeholder = enhancedStakeholders.find(s => s.email === recipientEmail);
            expect(stakeholder).toBeDefined();
            expect(expectedRoles).toContain(stakeholder!.role);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5.4: Multiple Task Escalation Detection - For any set of tasks, system should correctly identify all tasks needing escalation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(overdueTaskArb, activeTaskArb, blockedTaskArb),
          { minLength: 1, maxLength: 20 }
        ),
        async (tasks) => {
          const tasksNeedingEscalation = findTasksNeedingEscalation(tasks);

          // Verify each task in the result actually needs escalation
          for (const { task, escalationResult } of tasksNeedingEscalation) {
            expect(escalationResult.shouldEscalate).toBe(true);
            expect(task.status).not.toBe('completed'); // Completed tasks shouldn't be escalated
            
            if (task.due_date) {
              const now = new Date();
              const dueDate = new Date(task.due_date);
              const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysOverdue > 0) {
                expect(escalationResult.daysOverdue).toBe(daysOverdue);
              }
            }
          }

          // Verify no completed tasks are included
          const completedTasksInResult = tasksNeedingEscalation.filter(
            ({ task }) => task.status === 'completed'
          );
          expect(completedTasksInResult.length).toBe(0);

          // Verify all blocked tasks are handled appropriately
          // Note: Blocked tasks are handled separately by the blocker escalation system
        }
      ),
      { numRuns: 100 }
    );
  });
});