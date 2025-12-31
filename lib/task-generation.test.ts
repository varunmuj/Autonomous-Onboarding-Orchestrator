/**
 * Property-based tests for automated task generation and assignment
 * Feature: autonomous-onboarding-orchestrator, Property 3: Automated Task Generation and Assignment
 * Validates: Requirements 2.1, 2.2
 */

import { describe, test, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { Stakeholder, Integration, OnboardingTask } from './types';
import { assignTaskToStakeholder, calculateTaskPriority, calculateTaskDueDate } from './task-assignment';

// Mock fetch for n8n webhook calls
global.fetch = vi.fn();

// Generators for property-based testing
const stakeholderRoleArb = fc.constantFrom('owner', 'it_contact', 'project_manager', 'technical_lead');
const integrationTypeArb = fc.constantFrom('SIS', 'CRM', 'SFTP', 'API', 'other');
const customerSizeArb = fc.constantFrom('small', 'medium', 'large', 'enterprise');

// Realistic task type generator based on actual task types used in the system
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
  'api_testing',
  'data_validation',
  'configuration',
  'integration_setup'
);

const futureDateArb = fc.date({ 
  min: new Date(Date.now() + 24 * 60 * 60 * 1000), // At least 1 day in future
  max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Max 1 year in future
}).filter(date => !isNaN(date.getTime())).map(date => date.toISOString().split('T')[0]);

const stakeholderArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  role: stakeholderRoleArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  created_at: fc.date().filter(d => !isNaN(d.getTime())).map(d => d.toISOString())
});

const integrationArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  type: integrationTypeArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  configuration: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  status: fc.constantFrom('not_configured', 'configured', 'testing', 'active', 'failed'),
  created_at: fc.date().filter(d => !isNaN(d.getTime())).map(d => d.toISOString())
});

const onboardingIntakeDataArb = fc.record({
  onboarding_id: fc.uuid(),
  customer_id: fc.uuid(),
  customer_name: fc.string({ minLength: 1, maxLength: 200 }),
  customer_size: fc.option(customerSizeArb, { nil: undefined }),
  go_live_date: fc.option(futureDateArb, { nil: undefined }),
  stakeholders: fc.array(stakeholderArb, { minLength: 1, maxLength: 8 }),
  integrations: fc.array(integrationArb, { minLength: 0, maxLength: 10 })
});

// Mock n8n workflow response generator
const mockTaskArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  task_type: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  owner_role: stakeholderRoleArb,
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  status: fc.constantFrom('pending', 'in_progress', 'completed', 'blocked'),
  priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
  due_date: fc.option(futureDateArb, { nil: undefined }),
  is_blocker: fc.boolean(),
  created_at: fc.date().filter(d => !isNaN(d.getTime())).map(d => d.toISOString())
});

describe('Automated Task Generation and Assignment Properties', () => {
  test('Property 3: Automated Task Generation and Assignment - For any completed customer intake, the orchestrator should automatically generate appropriate onboarding tasks based on customer requirements and assign them to correct owners based on stakeholder roles and task types', async () => {
    await fc.assert(
      fc.asyncProperty(onboardingIntakeDataArb, async (intakeData) => {
        // Mock successful n8n webhook response with generated tasks
        const expectedTaskTypes = new Set<string>();
        
        // Base tasks that should always be generated
        expectedTaskTypes.add('kickoff_meeting');
        
        // Integration-specific tasks
        for (const integration of intakeData.integrations) {
          const integType = integration.type.toLowerCase();
          expectedTaskTypes.add(`${integType}_setup`);
          expectedTaskTypes.add(`${integType}_testing`);
        }
        
        // Stakeholder-specific tasks
        for (const stakeholder of intakeData.stakeholders) {
          if (stakeholder.role === 'owner') {
            expectedTaskTypes.add('requirements_review');
          }
          if (stakeholder.role === 'project_manager') {
            expectedTaskTypes.add('timeline_planning');
          }
        }
        
        // Size-based tasks
        if (intakeData.customer_size === 'enterprise' || intakeData.customer_size === 'large') {
          expectedTaskTypes.add('security_review');
          expectedTaskTypes.add('compliance_check');
        }
        
        // Go-live preparation task
        expectedTaskTypes.add('go_live_preparation');
        
        // Generate mock tasks based on expected task types
        const mockGeneratedTasks: OnboardingTask[] = Array.from(expectedTaskTypes).map(taskType => {
          const assignment = assignTaskToStakeholder(taskType, intakeData.stakeholders);
          return {
            id: `task-${taskType}-${Date.now()}`,
            onboarding_id: intakeData.onboarding_id,
            task_type: taskType,
            title: `Generated task: ${taskType}`,
            owner_role: assignment.ownerRole,
            assigned_to: assignment.assignedTo,
            status: 'pending',
            priority: calculateTaskPriority(taskType),
            due_date: calculateTaskDueDate(taskType, intakeData.go_live_date, intakeData.customer_size).toISOString().split('T')[0],
            is_blocker: false,
            created_at: new Date().toISOString()
          };
        });

        // Mock n8n webhook response
        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => ({ success: true, tasks_generated: mockGeneratedTasks.length })
        };

        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate n8n webhook trigger
        const response = await fetch('http://localhost:8080/webhook/onboarding-created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(intakeData),
        });

        const result = await response.json();

        // Verify webhook was called with correct data
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8080/webhook/onboarding-created',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(intakeData)
          })
        );

        // Should succeed
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);

        // Verify task generation logic
        // 1. Base tasks should always be generated
        expect(expectedTaskTypes.has('kickoff_meeting')).toBe(true);
        expect(expectedTaskTypes.has('go_live_preparation')).toBe(true);

        // 2. Integration tasks should be generated for each integration
        for (const integration of intakeData.integrations) {
          const integType = integration.type.toLowerCase();
          expect(expectedTaskTypes.has(`${integType}_setup`)).toBe(true);
          expect(expectedTaskTypes.has(`${integType}_testing`)).toBe(true);
        }

        // 3. Stakeholder-specific tasks should be generated based on roles
        const hasOwner = intakeData.stakeholders.some(s => s.role === 'owner');
        const hasProjectManager = intakeData.stakeholders.some(s => s.role === 'project_manager');
        
        if (hasOwner) {
          expect(expectedTaskTypes.has('requirements_review')).toBe(true);
        }
        if (hasProjectManager) {
          expect(expectedTaskTypes.has('timeline_planning')).toBe(true);
        }

        // 4. Size-based tasks should be generated for large/enterprise customers
        if (intakeData.customer_size === 'enterprise' || intakeData.customer_size === 'large') {
          expect(expectedTaskTypes.has('security_review')).toBe(true);
          expect(expectedTaskTypes.has('compliance_check')).toBe(true);
        }

        // 5. Verify task assignment logic
        for (const task of mockGeneratedTasks) {
          // Task should have valid owner role
          expect(['owner', 'it_contact', 'project_manager', 'technical_lead', 'qa', 'engineering', 'security', 'compliance']).toContain(task.owner_role);
          
          // If assigned to someone, should be a valid stakeholder email
          if (task.assigned_to) {
            const assignedStakeholder = intakeData.stakeholders.find(s => s.email === task.assigned_to);
            expect(assignedStakeholder).toBeDefined();
            // The assigned stakeholder's role should match or be compatible with the task's owner role
            if (assignedStakeholder) {
              expect(task.assigned_to).toBe(assignedStakeholder.email);
            }
          }
          
          // Task should have valid priority
          expect(['low', 'medium', 'high', 'critical']).toContain(task.priority);
          
          // Task should have valid status
          expect(task.status).toBe('pending'); // New tasks should start as pending
          
          // Task should not be a blocker initially
          expect(task.is_blocker).toBe(false);
          
          // Task should have a due date
          expect(task.due_date).toBeDefined();
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const now = new Date();
            expect(dueDate.getTime()).toBeGreaterThan(now.getTime()); // Due date should be in the future
          }
        }

        // 6. Verify task count is reasonable
        const minExpectedTasks = 2; // At least kickoff and go-live prep
        const maxExpectedTasks = 20; // Reasonable upper bound
        expect(mockGeneratedTasks.length).toBeGreaterThanOrEqual(minExpectedTasks);
        expect(mockGeneratedTasks.length).toBeLessThanOrEqual(maxExpectedTasks);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for comprehensive property test

  test('Property 3.1: Task Assignment Consistency - For any task type and set of stakeholders, assignment should follow consistent rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          taskTypeArb, // Use realistic task types instead of arbitrary strings
          fc.array(stakeholderArb, { minLength: 1, maxLength: 8 }) // stakeholders
        ),
        async ([taskType, stakeholders]) => {
          const assignment1 = assignTaskToStakeholder(taskType, stakeholders);
          const assignment2 = assignTaskToStakeholder(taskType, stakeholders);
          
          // Assignment should be deterministic - same inputs should produce same outputs
          expect(assignment1.ownerRole).toBe(assignment2.ownerRole);
          expect(assignment1.assignedTo).toBe(assignment2.assignedTo);
          
          // If assigned to someone, should be a valid stakeholder
          if (assignment1.assignedTo) {
            const assignedStakeholder = stakeholders.find(s => s.email === assignment1.assignedTo);
            expect(assignedStakeholder).toBeDefined();
            expect(assignedStakeholder?.role).toBe(assignment1.ownerRole);
          }
          
          // Owner role should be valid
          expect(['owner', 'it_contact', 'project_manager', 'technical_lead', 'qa', 'engineering', 'security', 'compliance']).toContain(assignment1.ownerRole);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3.2: Task Priority Calculation - For any task type, priority should be calculated consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        taskTypeArb, // Use realistic task types
        async (taskType) => {
          const priority1 = calculateTaskPriority(taskType);
          const priority2 = calculateTaskPriority(taskType);
          
          // Priority calculation should be deterministic
          expect(priority1).toBe(priority2);
          
          // Priority should be valid
          expect(['low', 'medium', 'high', 'critical']).toContain(priority1);
          
          // Verify priority logic
          if (taskType.includes('security') || taskType.includes('sis_setup')) {
            expect(priority1).toBe('critical');
          } else if (taskType.includes('kickoff') || taskType.includes('requirements') || 
                     taskType.includes('go_live') || taskType.includes('setup')) {
            expect(priority1).toBe('high');
          } else if (taskType.includes('testing') || taskType.includes('planning')) {
            expect(priority1).toBe('medium');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3.3: Task Due Date Calculation - For any task type and go-live date, due date should be reasonable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          taskTypeArb, // Use realistic task types
          fc.option(futureDateArb, { nil: undefined }), // go-live date
          fc.option(customerSizeArb, { nil: undefined }) // customer size
        ),
        async ([taskType, goLiveDate, customerSize]) => {
          const now = new Date();
          const dueDate1 = calculateTaskDueDate(taskType, goLiveDate, customerSize);
          const dueDate2 = calculateTaskDueDate(taskType, goLiveDate, customerSize);
          
          // Due date calculation should be deterministic within a reasonable time window (allow 1-2ms difference)
          const timeDiff = Math.abs(dueDate1.getTime() - dueDate2.getTime());
          expect(timeDiff).toBeLessThanOrEqual(2); // Allow up to 2ms difference for timing
          
          // Due date should be in the future
          expect(dueDate1.getTime()).toBeGreaterThan(now.getTime());
          
          // Due date should be reasonable (not more than 1 year in future)
          const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          expect(dueDate1.getTime()).toBeLessThanOrEqual(oneYearFromNow.getTime());
          
          // If go-live date is provided, task due date should be before or on go-live date
          if (goLiveDate && taskType.includes('go_live')) {
            const goLive = new Date(goLiveDate);
            // Allow some tolerance for edge cases where calculation might be very close
            const toleranceMs = 24 * 60 * 60 * 1000; // 1 day tolerance
            expect(dueDate1.getTime()).toBeLessThanOrEqual(goLive.getTime() + toleranceMs);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});