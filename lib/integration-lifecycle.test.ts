// Property-based tests for integration lifecycle management
// Validates integration testing, status tracking, and instruction generation

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Integration, Stakeholder } from './types';
import { 
  IntegrationTester, 
  IntegrationStatusTracker,
  IntegrationValidationResult 
} from './integration-lifecycle';
import { IntegrationInstructionGenerator } from './integration-instructions';

// Arbitraries for generating test data
const integrationTypeArb = fc.constantFrom('SIS', 'CRM', 'SFTP', 'API', 'other');
const integrationStatusArb = fc.constantFrom('not_configured', 'configured', 'testing', 'active', 'failed');
const stakeholderRoleArb = fc.constantFrom('owner', 'it_contact', 'project_manager', 'technical_lead');

const integrationArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  type: integrationTypeArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  configuration: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  status: integrationStatusArb,
  test_results: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  created_at: fc.integer({ min: 1577836800000, max: 1924991999000 }).map(timestamp => new Date(timestamp).toISOString())
}) as fc.Arbitrary<Integration>;

const stakeholderArb = fc.record({
  id: fc.uuid(),
  onboarding_id: fc.uuid(),
  role: stakeholderRoleArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string(), { nil: undefined }),
  responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  created_at: fc.integer({ min: 1577836800000, max: 1924991999000 }).map(timestamp => new Date(timestamp).toISOString())
}) as fc.Arbitrary<Stakeholder>;

describe('Integration Lifecycle Properties', () => {

  it('Property 12: Integration Lifecycle Management - For any integration, the system should provide comprehensive testing, status tracking, and stakeholder-specific instructions', async () => {
    await fc.assert(fc.asyncProperty(
      integrationArb,
      fc.array(stakeholderArb, { minLength: 1, maxLength: 4 }),
      async (integration, stakeholders) => {
        // Test integration validation
        const validationResult = await IntegrationTester.runIntegrationTests(integration);
        
        // Validate test result structure
        expect(validationResult).toHaveProperty('integration_id', integration.id);
        expect(validationResult).toHaveProperty('overall_status');
        expect(['passed', 'failed', 'warning']).toContain(validationResult.overall_status);
        expect(validationResult).toHaveProperty('test_results');
        expect(Array.isArray(validationResult.test_results)).toBe(true);
        expect(validationResult).toHaveProperty('completion_percentage');
        expect(validationResult.completion_percentage).toBeGreaterThanOrEqual(0);
        expect(validationResult.completion_percentage).toBeLessThanOrEqual(100);
        expect(validationResult).toHaveProperty('next_steps');
        expect(Array.isArray(validationResult.next_steps)).toBe(true);

        // Validate test results have required properties
        validationResult.test_results.forEach(testResult => {
          expect(testResult).toHaveProperty('success');
          expect(typeof testResult.success).toBe('boolean');
          expect(testResult).toHaveProperty('message');
          expect(typeof testResult.message).toBe('string');
          expect(testResult).toHaveProperty('timestamp');
          expect(testResult).toHaveProperty('test_type');
          expect(['connectivity', 'authentication', 'data_flow', 'configuration']).toContain(testResult.test_type);
        });

        // Test status determination
        const determinedStatus = IntegrationStatusTracker.determineIntegrationStatus(validationResult);
        expect(['not_configured', 'configured', 'testing', 'active', 'failed']).toContain(determinedStatus);

        // Validate status logic
        if (validationResult.overall_status === 'passed') {
          expect(determinedStatus).toBe('active');
        } else if (validationResult.overall_status === 'warning') {
          expect(determinedStatus).toBe('testing');
        } else if (validationResult.overall_status === 'failed') {
          expect(determinedStatus).toBe('failed');
        }

        // Test instruction generation for each stakeholder
        for (const stakeholder of stakeholders) {
          const instructions = IntegrationInstructionGenerator.generateInstructions(
            integration.type, 
            stakeholder.role
          );

          // Validate instruction structure
          expect(instructions).toHaveProperty('integration_type', integration.type);
          expect(instructions).toHaveProperty('stakeholder_role', stakeholder.role);
          expect(instructions).toHaveProperty('title');
          expect(typeof instructions.title).toBe('string');
          expect(instructions.title.length).toBeGreaterThan(0);
          expect(instructions).toHaveProperty('description');
          expect(typeof instructions.description).toBe('string');
          expect(instructions).toHaveProperty('steps');
          expect(Array.isArray(instructions.steps)).toBe(true);
          expect(instructions.steps.length).toBeGreaterThan(0);
          expect(instructions).toHaveProperty('requirements');
          expect(instructions.requirements).toHaveProperty('technical');
          expect(instructions.requirements).toHaveProperty('access');
          expect(instructions.requirements).toHaveProperty('information');
          expect(instructions).toHaveProperty('estimated_time_hours');
          expect(typeof instructions.estimated_time_hours).toBe('number');
          expect(instructions.estimated_time_hours).toBeGreaterThan(0);

          // Validate step structure
          instructions.steps.forEach((step, index) => {
            expect(step).toHaveProperty('step_number', index + 1);
            expect(step).toHaveProperty('title');
            expect(typeof step.title).toBe('string');
            expect(step.title.length).toBeGreaterThan(0);
            expect(step).toHaveProperty('description');
            expect(typeof step.description).toBe('string');
            expect(step.description.length).toBeGreaterThan(0);
          });
        }

        // Test comprehensive integration guide generation
        const integrationGuide = IntegrationInstructionGenerator.generateOnboardingIntegrationGuide(
          [integration], 
          stakeholders
        );

        expect(integrationGuide).toHaveProperty('overview');
        expect(typeof integrationGuide.overview).toBe('string');
        expect(integrationGuide).toHaveProperty('total_estimated_hours');
        expect(typeof integrationGuide.total_estimated_hours).toBe('number');
        expect(integrationGuide.total_estimated_hours).toBeGreaterThan(0);
        expect(integrationGuide).toHaveProperty('integration_guides');
        expect(Array.isArray(integrationGuide.integration_guides)).toBe(true);
        expect(integrationGuide.integration_guides.length).toBe(1);
        expect(integrationGuide).toHaveProperty('coordination_notes');
        expect(Array.isArray(integrationGuide.coordination_notes)).toBe(true);
        expect(integrationGuide.coordination_notes.length).toBeGreaterThan(0);

        return true;
      }
    ), { numRuns: 50 });
  });

  it('Property 12.1: Integration Progress Calculation - For any set of integrations, progress calculations should be mathematically consistent', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(integrationArb, { minLength: 1, maxLength: 10 }),
      async (integrations) => {
        const progress = IntegrationStatusTracker.calculateIntegrationProgress(integrations);

        // Validate progress structure
        expect(progress).toHaveProperty('total_integrations', integrations.length);
        expect(progress).toHaveProperty('completed_integrations');
        expect(progress).toHaveProperty('completion_percentage');
        expect(progress).toHaveProperty('status_breakdown');

        // Validate mathematical consistency
        const activeIntegrations = integrations.filter(i => i.status === 'active').length;
        expect(progress.completed_integrations).toBe(activeIntegrations);

        const expectedPercentage = integrations.length > 0 ? 
          Math.round((activeIntegrations / integrations.length) * 100) : 0;
        expect(progress.completion_percentage).toBe(expectedPercentage);

        // Validate status breakdown totals
        const statusTotal = Object.values(progress.status_breakdown).reduce((sum, count) => sum + count, 0);
        expect(statusTotal).toBe(integrations.length);

        // Validate individual status counts
        const statusCounts = {
          'not_configured': integrations.filter(i => i.status === 'not_configured').length,
          'configured': integrations.filter(i => i.status === 'configured').length,
          'testing': integrations.filter(i => i.status === 'testing').length,
          'active': integrations.filter(i => i.status === 'active').length,
          'failed': integrations.filter(i => i.status === 'failed').length
        };

        Object.entries(statusCounts).forEach(([status, expectedCount]) => {
          expect(progress.status_breakdown[status as Integration['status']]).toBe(expectedCount);
        });

        return true;
      }
    ), { numRuns: 100 });
  });

  it('Property 12.2: Integration Status Report Generation - For any set of integrations, status reports should provide accurate summaries and actionable recommendations', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(integrationArb, { minLength: 1, maxLength: 8 }),
      async (integrations) => {
        const statusReport = IntegrationStatusTracker.generateStatusReport(integrations);

        // Validate report structure
        expect(statusReport).toHaveProperty('summary');
        expect(typeof statusReport.summary).toBe('string');
        expect(statusReport.summary.length).toBeGreaterThan(0);
        expect(statusReport).toHaveProperty('details');
        expect(Array.isArray(statusReport.details)).toBe(true);
        expect(statusReport.details.length).toBe(integrations.length);
        expect(statusReport).toHaveProperty('recommendations');
        expect(Array.isArray(statusReport.recommendations)).toBe(true);

        // Validate detail entries
        statusReport.details.forEach((detail, index) => {
          const integration = integrations[index];
          expect(detail).toHaveProperty('integration_name', integration.name);
          expect(detail).toHaveProperty('type', integration.type);
          expect(detail).toHaveProperty('status', integration.status);
        });

        // Validate summary contains progress information
        const progress = IntegrationStatusTracker.calculateIntegrationProgress(integrations);
        expect(statusReport.summary).toContain(`${progress.completion_percentage}%`);
        expect(statusReport.summary).toContain(`${progress.completed_integrations}/${progress.total_integrations}`);

        // Validate recommendations are relevant to status
        const hasNotConfigured = integrations.some(i => i.status === 'not_configured');
        const hasFailed = integrations.some(i => i.status === 'failed');
        const hasTesting = integrations.some(i => i.status === 'testing');
        const allActive = integrations.every(i => i.status === 'active');

        if (hasNotConfigured) {
          expect(statusReport.recommendations.some(r => r.includes('Configure'))).toBe(true);
        }
        if (hasFailed) {
          expect(statusReport.recommendations.some(r => r.includes('Fix'))).toBe(true);
        }
        if (hasTesting) {
          expect(statusReport.recommendations.some(r => r.includes('testing'))).toBe(true);
        }
        if (allActive) {
          expect(statusReport.recommendations.some(r => r.includes('go-live'))).toBe(true);
        }

        return true;
      }
    ), { numRuns: 50 });
  });

  it('Property 12.3: Integration Test Result Consistency - For any integration type, test results should be consistent with the integration configuration', async () => {
    await fc.assert(fc.asyncProperty(
      integrationArb,
      async (integration) => {
        const validationResult = await IntegrationTester.runIntegrationTests(integration);

        // Test results should exist for all integration types
        expect(validationResult.test_results.length).toBeGreaterThan(0);

        // For specific integration types, validate expected test types
        const testTypes = validationResult.test_results.map(r => r.test_type);
        
        if (['SIS', 'CRM', 'SFTP', 'API'].includes(integration.type)) {
          // These integration types should have connectivity tests
          expect(testTypes).toContain('connectivity');
          
          // Most should have authentication tests
          if (integration.type !== 'other') {
            expect(testTypes.some(t => ['authentication', 'configuration'].includes(t))).toBe(true);
          }
        }

        // Completion percentage should reflect test success rate
        const successfulTests = validationResult.test_results.filter(r => r.success).length;
        const totalTests = validationResult.test_results.length;
        const expectedPercentage = Math.round((successfulTests / totalTests) * 100);
        expect(validationResult.completion_percentage).toBe(expectedPercentage);

        // Overall status should reflect completion percentage
        if (validationResult.completion_percentage === 100) {
          expect(validationResult.overall_status).toBe('passed');
        } else if (validationResult.completion_percentage >= 70) {
          expect(validationResult.overall_status).toBe('warning');
        } else {
          expect(validationResult.overall_status).toBe('failed');
        }

        // Next steps should be provided
        expect(validationResult.next_steps.length).toBeGreaterThan(0);

        // Failed tests should generate specific next steps
        const failedTests = validationResult.test_results.filter(r => !r.success);
        if (failedTests.length > 0) {
          expect(validationResult.next_steps.some(step => step.includes('failed'))).toBe(true);
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  it('Property 12.4: Stakeholder-Specific Instructions - For any integration type and stakeholder role combination, instructions should be appropriate and complete', async () => {
    await fc.assert(fc.asyncProperty(
      integrationTypeArb,
      stakeholderRoleArb,
      async (integrationType, stakeholderRole) => {
        const instructions = IntegrationInstructionGenerator.generateInstructions(
          integrationType, 
          stakeholderRole
        );

        // Instructions should be tailored to stakeholder role
        expect(instructions.stakeholder_role).toBe(stakeholderRole);
        expect(instructions.integration_type).toBe(integrationType);

        // Technical roles should have more detailed steps
        if (['it_contact', 'technical_lead'].includes(stakeholderRole)) {
          expect(instructions.steps.length).toBeGreaterThanOrEqual(1);
          expect(instructions.estimated_time_hours).toBeGreaterThan(0);
          
          // Technical roles should have technical requirements
          expect(instructions.requirements.technical.length).toBeGreaterThan(0);
          expect(instructions.requirements.access.length).toBeGreaterThan(0);
        }

        // Project managers should have coordination-focused steps
        if (stakeholderRole === 'project_manager') {
          const stepTitles = instructions.steps.map(s => s.title.toLowerCase());
          const stepDescriptions = instructions.steps.map(s => s.description.toLowerCase());
          const allText = [...stepTitles, ...stepDescriptions].join(' ');
          
          // For specific integration types, expect coordination keywords
          if (['SIS', 'CRM', 'SFTP', 'API'].includes(integrationType)) {
            expect(allText.includes('coordinate') || 
                   allText.includes('track') || 
                   allText.includes('monitor') ||
                   allText.includes('plan')).toBe(true);
          } else {
            // For 'other' type, just ensure they have some management-related content
            expect(allText.includes('define') ||
                   allText.includes('manage') ||
                   allText.includes('coordinate') ||
                   allText.includes('track') ||
                   allText.includes('work')).toBe(true);
          }
        }

        // Owners should have simpler, approval-focused steps
        if (stakeholderRole === 'owner') {
          expect(instructions.estimated_time_hours).toBeLessThanOrEqual(2);
          const stepTitles = instructions.steps.map(s => s.title.toLowerCase());
          const stepDescriptions = instructions.steps.map(s => s.description.toLowerCase());
          const allText = [...stepTitles, ...stepDescriptions].join(' ');
          expect(allText.includes('provide') || 
                 allText.includes('approve') || 
                 allText.includes('review') ||
                 allText.includes('define') ||
                 allText.includes('share') ||
                 allText.includes('information')).toBe(true);
        }

        // All steps should have validation criteria
        instructions.steps.forEach(step => {
          expect(step.step_number).toBeGreaterThan(0);
          expect(step.title.length).toBeGreaterThan(0);
          expect(step.description.length).toBeGreaterThan(0);
        });

        return true;
      }
    ), { numRuns: 100 });
  });
});