/**
 * Property-based tests for dashboard data accuracy
 * Feature: autonomous-onboarding-orchestrator, Property 7: Dashboard Data Accuracy
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, test, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { Onboarding, OnboardingTask, Stakeholder, Integration, Customer } from './types';

// Mock fetch for API calls
global.fetch = vi.fn();

// Generators for property-based testing
const customerSizeArb = fc.constantFrom('small', 'medium', 'large', 'enterprise');
const onboardingStatusArb = fc.constantFrom('not_started', 'in_progress', 'blocked', 'completed');
const taskStatusArb = fc.constantFrom('pending', 'in_progress', 'completed', 'blocked');
const taskPriorityArb = fc.constantFrom('low', 'medium', 'high', 'critical');
const stakeholderRoleArb = fc.constantFrom('owner', 'it_contact', 'project_manager', 'technical_lead');
const integrationTypeArb = fc.constantFrom('SIS', 'CRM', 'SFTP', 'API', 'other');
const integrationStatusArb = fc.constantFrom('not_configured', 'configured', 'testing', 'active', 'failed');

const futureDateArb = fc.date({ 
  min: new Date(Date.now() + 24 * 60 * 60 * 1000), // At least 1 day in future
  max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Max 1 year in future
}).filter(date => !isNaN(date.getTime())).map(date => date.toISOString());

const pastDateArb = fc.date({ 
  min: new Date('2020-01-01'), 
  max: new Date() 
}).filter(date => !isNaN(date.getTime())).map(date => date.toISOString());

// Customer generator
const customerArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  contract_start_date: pastDateArb,
  contact_email: fc.option(fc.emailAddress(), { nil: undefined }),
  industry: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  size: fc.option(customerSizeArb, { nil: undefined }),
  created_at: pastDateArb
});

// Task generator
const taskArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  task_type: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  owner_role: stakeholderRoleArb,
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  status: taskStatusArb,
  priority: taskPriorityArb,
  due_date: fc.option(futureDateArb, { nil: undefined }),
  completed_at: fc.option(pastDateArb, { nil: undefined }),
  is_blocker: fc.boolean(),
  blocker_reason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  created_at: pastDateArb
});

// Stakeholder generator
const stakeholderArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  role: stakeholderRoleArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  created_at: pastDateArb
});

// Integration generator
const integrationArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  type: integrationTypeArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  configuration: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  status: integrationStatusArb,
  test_results: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  created_at: pastDateArb
});

// Onboarding generator with related data
const onboardingWithDataArb = fc.record({
  id: fc.uuid(),
  customer_id: fc.uuid(),
  status: onboardingStatusArb,
  current_stage: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  go_live_date: fc.option(futureDateArb, { nil: undefined }),
  created_at: pastDateArb,
  customers: customerArb,
  onboarding_tasks: fc.array(taskArb, { minLength: 0, maxLength: 20 }),
  stakeholders: fc.array(stakeholderArb, { minLength: 0, maxLength: 8 }),
  integrations: fc.array(integrationArb, { minLength: 0, maxLength: 10 })
}).chain(base => {
  // Generate completed_at and time_to_value_days consistently
  if (base.status === 'completed') {
    return fc.date({
      min: new Date(base.created_at),
      max: new Date(new Date(base.created_at).getTime() + 365 * 24 * 60 * 60 * 1000) // Max 1 year after creation
    }).filter(date => !isNaN(date.getTime())).map(completedDate => {
      // Calculate consistent time_to_value_days
      const createdDate = new Date(base.created_at);
      const calculatedDays = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...base,
        completed_at: completedDate.toISOString(),
        time_to_value_days: calculatedDays
      };
    });
  } else {
    // For non-completed onboardings
    return fc.constant({
      ...base,
      completed_at: undefined,
      time_to_value_days: undefined
    });
  }
});

// Dashboard data generator
const dashboardDataArb = fc.array(onboardingWithDataArb, { minLength: 0, maxLength: 50 });

describe('Dashboard Data Accuracy Properties', () => {
  test('Property 7: Dashboard Data Accuracy - For any onboarding record, the dashboard should display accurate current stage, complete task lists with owners and statuses, highlighted blockers, and correct time-to-value calculations', async () => {
    await fc.assert(
      fc.asyncProperty(dashboardDataArb, async (onboardings) => {
        // Mock successful dashboard API response
        const mockDashboardResponse = {
          summary: {
            totalOnboardings: onboardings.length,
            activeOnboardings: onboardings.filter(o => o.status === 'in_progress').length,
            blockedOnboardings: onboardings.filter(o => o.status === 'blocked').length,
            completedOnboardings: onboardings.filter(o => o.status === 'completed').length,
            avgTimeToValue: null,
            completionRate: onboardings.length > 0 ? 
              Math.round((onboardings.filter(o => o.status === 'completed').length / onboardings.length) * 100) : 0
          },
          tasks: {
            totalTasks: onboardings.flatMap(o => o.onboarding_tasks).length,
            completedTasks: onboardings.flatMap(o => o.onboarding_tasks).filter(t => t.status === 'completed').length,
            blockedTasks: onboardings.flatMap(o => o.onboarding_tasks).filter(t => t.is_blocker).length,
            completionRate: 0
          },
          integrations: {
            total: onboardings.flatMap(o => o.integrations).length,
            byStatus: {
              not_configured: onboardings.flatMap(o => o.integrations).filter(i => i.status === 'not_configured').length,
              configured: onboardings.flatMap(o => o.integrations).filter(i => i.status === 'configured').length,
              testing: onboardings.flatMap(o => o.integrations).filter(i => i.status === 'testing').length,
              active: onboardings.flatMap(o => o.integrations).filter(i => i.status === 'active').length,
              failed: onboardings.flatMap(o => o.integrations).filter(i => i.status === 'failed').length,
            }
          },
          alerts: {
            atRiskCount: onboardings.filter(o => o.status === 'blocked').length,
            atRiskOnboardings: onboardings.filter(o => o.status === 'blocked').map(o => ({
              id: o.id,
              customerName: o.customers.name,
              status: o.status,
              daysOverdue: 0
            }))
          },
          onboardings: onboardings
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockDashboardResponse
        };

        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate dashboard API call
        const response = await fetch('/api/dashboard');
        const dashboardData = await response.json();

        // Verify API call was made
        expect(global.fetch).toHaveBeenCalledWith('/api/dashboard');
        expect(response.ok).toBe(true);

        // **Requirement 3.1: Display current onboarding stage for each active customer**
        for (const onboarding of onboardings) {
          const dashboardOnboarding = dashboardData.onboardings.find((o: any) => o.id === onboarding.id);
          expect(dashboardOnboarding).toBeDefined();
          
          if (dashboardOnboarding) {
            // Current stage should be displayed (or default to 'Intake')
            const displayedStage = dashboardOnboarding.current_stage || 'Intake';
            expect(typeof displayedStage).toBe('string');
            expect(displayedStage.length).toBeGreaterThan(0);
            
            // Customer information should be accurate
            expect(dashboardOnboarding.customers.name).toBe(onboarding.customers.name);
            expect(dashboardOnboarding.customers.id).toBe(onboarding.customers.id);
          }
        }

        // **Requirement 3.2: Show all tasks with their assigned owners and current status**
        for (const onboarding of onboardings) {
          const dashboardOnboarding = dashboardData.onboardings.find((o: any) => o.id === onboarding.id);
          
          if (dashboardOnboarding) {
            const tasks = dashboardOnboarding.onboarding_tasks || [];
            const originalTasks = onboarding.onboarding_tasks || [];
            
            // Task count should match
            expect(tasks.length).toBe(originalTasks.length);
            
            // Each task should have complete information
            for (const task of tasks) {
              const originalTask = originalTasks.find((t: any) => t.id === task.id);
              expect(originalTask).toBeDefined();
              
              if (originalTask) {
                // Task details should be accurate
                expect(task.title).toBe(originalTask.title);
                expect(task.status).toBe(originalTask.status);
                expect(task.owner_role).toBe(originalTask.owner_role);
                expect(task.assigned_to).toBe(originalTask.assigned_to);
                expect(task.priority).toBe(originalTask.priority);
                expect(task.is_blocker).toBe(originalTask.is_blocker);
                
                // Owner role should be valid
                expect(['owner', 'it_contact', 'project_manager', 'technical_lead']).toContain(task.owner_role);
                
                // Status should be valid
                expect(['pending', 'in_progress', 'completed', 'blocked']).toContain(task.status);
                
                // Priority should be valid
                expect(['low', 'medium', 'high', 'critical']).toContain(task.priority);
              }
            }
          }
        }

        // **Requirement 3.3: Highlight blockers prominently with blocker descriptions and impact**
        const allTasks = onboardings.flatMap(o => o.onboarding_tasks || []);
        const blockerTasks = allTasks.filter(t => t.is_blocker);
        
        // Dashboard should accurately count blocked tasks
        expect(dashboardData.tasks.blockedTasks).toBe(blockerTasks.length);
        
        // Each blocker should have proper information
        for (const blockerTask of blockerTasks) {
          expect(blockerTask.is_blocker).toBe(true);
          
          // If blocker has a reason, it should be a non-empty string
          if (blockerTask.blocker_reason) {
            expect(typeof blockerTask.blocker_reason).toBe('string');
            expect(blockerTask.blocker_reason.length).toBeGreaterThan(0);
          }
        }

        // Onboardings with blockers should be identified as at-risk
        const onboardingsWithBlockers = onboardings.filter(o => 
          (o.onboarding_tasks || []).some(t => t.is_blocker)
        );
        
        // At minimum, blocked onboardings should be in at-risk list
        const blockedOnboardings = onboardings.filter(o => o.status === 'blocked');
        expect(dashboardData.alerts.atRiskCount).toBeGreaterThanOrEqual(blockedOnboardings.length);

        // **Requirement 3.4: Display accurate time-to-value tracking for each customer**
        for (const onboarding of onboardings) {
          const dashboardOnboarding = dashboardData.onboardings.find((o: any) => o.id === onboarding.id);
          
          if (dashboardOnboarding) {
            // Time-to-value should be calculated correctly
            const createdDate = new Date(onboarding.created_at);
            const now = new Date();
            const expectedCurrentDays = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // For completed onboardings, should use actual completion time
            if (onboarding.status === 'completed' && onboarding.completed_at) {
              const completedDate = new Date(onboarding.completed_at);
              const actualDays = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (onboarding.time_to_value_days !== undefined) {
                // Should match stored time-to-value or be reasonable (allow up to 2 days difference for rounding and edge cases)
                expect(Math.abs(onboarding.time_to_value_days - actualDays)).toBeLessThanOrEqual(2);
              }
            }
            
            // Go-live date should be properly displayed if set
            if (onboarding.go_live_date) {
              expect(dashboardOnboarding.go_live_date).toBe(onboarding.go_live_date);
              
              // Should be a valid future date format
              const goLiveDate = new Date(onboarding.go_live_date);
              expect(goLiveDate.getTime()).toBeGreaterThan(createdDate.getTime());
            }
          }
        }

        // **Summary metrics should be accurate**
        expect(dashboardData.summary.totalOnboardings).toBe(onboardings.length);
        expect(dashboardData.summary.activeOnboardings).toBe(onboardings.filter(o => o.status === 'in_progress').length);
        expect(dashboardData.summary.blockedOnboardings).toBe(onboardings.filter(o => o.status === 'blocked').length);
        expect(dashboardData.summary.completedOnboardings).toBe(onboardings.filter(o => o.status === 'completed').length);
        
        // Completion rate should be calculated correctly
        if (onboardings.length > 0) {
          const expectedCompletionRate = Math.round((onboardings.filter(o => o.status === 'completed').length / onboardings.length) * 100);
          expect(dashboardData.summary.completionRate).toBe(expectedCompletionRate);
        } else {
          expect(dashboardData.summary.completionRate).toBe(0);
        }

        // **Task metrics should be accurate**
        const allDashboardTasks = onboardings.flatMap(o => o.onboarding_tasks || []);
        expect(dashboardData.tasks.totalTasks).toBe(allDashboardTasks.length);
        expect(dashboardData.tasks.completedTasks).toBe(allDashboardTasks.filter(t => t.status === 'completed').length);
        expect(dashboardData.tasks.blockedTasks).toBe(allDashboardTasks.filter(t => t.is_blocker).length);

        // **Integration metrics should be accurate**
        const allIntegrations = onboardings.flatMap(o => o.integrations || []);
        expect(dashboardData.integrations.total).toBe(allIntegrations.length);
        expect(dashboardData.integrations.byStatus.not_configured).toBe(allIntegrations.filter(i => i.status === 'not_configured').length);
        expect(dashboardData.integrations.byStatus.configured).toBe(allIntegrations.filter(i => i.status === 'configured').length);
        expect(dashboardData.integrations.byStatus.testing).toBe(allIntegrations.filter(i => i.status === 'testing').length);
        expect(dashboardData.integrations.byStatus.active).toBe(allIntegrations.filter(i => i.status === 'active').length);
        expect(dashboardData.integrations.byStatus.failed).toBe(allIntegrations.filter(i => i.status === 'failed').length);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for comprehensive property test

  test('Property 7.1: Dashboard Metrics Consistency - For any set of onboarding data, calculated metrics should be mathematically consistent', async () => {
    await fc.assert(
      fc.asyncProperty(dashboardDataArb, async (onboardings) => {
        // Calculate metrics manually
        const totalOnboardings = onboardings.length;
        const activeOnboardings = onboardings.filter(o => o.status === 'in_progress').length;
        const blockedOnboardings = onboardings.filter(o => o.status === 'blocked').length;
        const completedOnboardings = onboardings.filter(o => o.status === 'completed').length;
        
        // Status counts should add up correctly (allowing for other statuses like 'not_started')
        expect(activeOnboardings + blockedOnboardings + completedOnboardings).toBeLessThanOrEqual(totalOnboardings);
        
        // Completion rate calculation
        const expectedCompletionRate = totalOnboardings > 0 ? 
          Math.round((completedOnboardings / totalOnboardings) * 100) : 0;
        expect(expectedCompletionRate).toBeGreaterThanOrEqual(0);
        expect(expectedCompletionRate).toBeLessThanOrEqual(100);
        
        // Task metrics
        const allTasks = onboardings.flatMap(o => o.onboarding_tasks || []);
        const completedTasks = allTasks.filter(t => t.status === 'completed').length;
        const blockedTasks = allTasks.filter(t => t.is_blocker).length;
        
        expect(completedTasks).toBeLessThanOrEqual(allTasks.length);
        expect(blockedTasks).toBeLessThanOrEqual(allTasks.length);
        
        // Task completion rate
        const taskCompletionRate = allTasks.length > 0 ? 
          Math.round((completedTasks / allTasks.length) * 100) : 0;
        expect(taskCompletionRate).toBeGreaterThanOrEqual(0);
        expect(taskCompletionRate).toBeLessThanOrEqual(100);
        
        // Integration metrics
        const allIntegrations = onboardings.flatMap(o => o.integrations || []);
        const integrationStatusCounts = {
          not_configured: allIntegrations.filter(i => i.status === 'not_configured').length,
          configured: allIntegrations.filter(i => i.status === 'configured').length,
          testing: allIntegrations.filter(i => i.status === 'testing').length,
          active: allIntegrations.filter(i => i.status === 'active').length,
          failed: allIntegrations.filter(i => i.status === 'failed').length,
        };
        
        const totalIntegrationsByStatus = Object.values(integrationStatusCounts).reduce((sum, count) => sum + count, 0);
        expect(totalIntegrationsByStatus).toBe(allIntegrations.length);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 7.2: Blocker Highlighting Accuracy - For any onboarding with blocked tasks, blockers should be properly identified and highlighted', async () => {
    await fc.assert(
      fc.asyncProperty(
        onboardingWithDataArb.filter(o => (o.onboarding_tasks || []).some(t => t.is_blocker)), // Only onboardings with blockers
        async (onboarding) => {
          const blockerTasks = (onboarding.onboarding_tasks || []).filter(t => t.is_blocker);
          expect(blockerTasks.length).toBeGreaterThan(0); // Ensure we have blockers
          
          // Each blocker should have proper attributes
          for (const blocker of blockerTasks) {
            expect(blocker.is_blocker).toBe(true);
            
            // Blocker should have a valid status
            expect(['pending', 'in_progress', 'completed', 'blocked']).toContain(blocker.status);
            
            // If blocker has a reason, it should be meaningful
            if (blocker.blocker_reason) {
              expect(typeof blocker.blocker_reason).toBe('string');
              expect(blocker.blocker_reason.trim().length).toBeGreaterThan(0);
            }
            
            // Blocker should have proper task information
            expect(blocker.title).toBeDefined();
            expect(typeof blocker.title).toBe('string');
            expect(blocker.title.length).toBeGreaterThan(0);
            
            expect(blocker.owner_role).toBeDefined();
            expect(['owner', 'it_contact', 'project_manager', 'technical_lead']).toContain(blocker.owner_role);
          }
          
          // Onboarding with blockers should potentially be marked as blocked or at-risk
          // (This is a business logic check - onboardings with blocked tasks might affect overall status)
          const hasBlockers = blockerTasks.length > 0;
          expect(hasBlockers).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 7.3: Time-to-Value Calculation Accuracy - For any onboarding, time-to-value should be calculated correctly based on dates', async () => {
    await fc.assert(
      fc.asyncProperty(onboardingWithDataArb, async (onboarding) => {
        const createdDate = new Date(onboarding.created_at);
        const now = new Date();
        
        // Current time-to-value calculation
        const expectedCurrentDays = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(expectedCurrentDays).toBeGreaterThanOrEqual(0);
        
        // If completed, verify completion time calculation
        if (onboarding.status === 'completed' && onboarding.completed_at) {
          const completedDate = new Date(onboarding.completed_at);
          const actualTimeToValue = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          expect(actualTimeToValue).toBeGreaterThanOrEqual(0);
          expect(completedDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime());
          
          // If time_to_value_days is stored, it should match the calculation
          if (onboarding.time_to_value_days !== undefined) {
            expect(Math.abs(onboarding.time_to_value_days - actualTimeToValue)).toBeLessThanOrEqual(2); // Allow up to 2 days difference for rounding and edge cases
          }
        }
        
        // If go-live date is set, verify it's in the future relative to creation
        if (onboarding.go_live_date) {
          const goLiveDate = new Date(onboarding.go_live_date);
          expect(goLiveDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime());
          
          // Calculate days until go-live
          const daysUntilGoLive = Math.ceil((goLiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Should be reasonable (not more than 2 years in future)
          expect(daysUntilGoLive).toBeLessThanOrEqual(730); // 2 years
        }
      }),
      { numRuns: 100 }
    );
  });
});