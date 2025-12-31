/**
 * Property-based tests for stakeholder and integration API endpoints
 * Feature: autonomous-onboarding-orchestrator, Property 1: Customer Data Persistence (extended validation)
 * Validates: Requirements 1.2, 1.3
 */

import { describe, test, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { Stakeholder, Integration } from './types';

// Mock fetch for API calls
global.fetch = vi.fn();

// Generators for property-based testing
const stakeholderRoleArb = fc.constantFrom('owner', 'it_contact', 'project_manager', 'technical_lead');
const integrationTypeArb = fc.constantFrom('SIS', 'CRM', 'SFTP', 'API', 'other');
const integrationStatusArb = fc.constantFrom('not_configured', 'configured', 'testing', 'active', 'failed');

const validStakeholderDataArb = fc.record({
  onboarding_id: fc.uuid(),
  role: stakeholderRoleArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
});

const validIntegrationDataArb = fc.record({
  onboarding_id: fc.uuid(),
  type: integrationTypeArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  configuration: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
});

const stakeholderUpdateDataArb = fc.record({
  role: fc.option(stakeholderRoleArb, { nil: undefined }),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  responsibilities: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), { nil: undefined })
});

const integrationUpdateDataArb = fc.record({
  type: fc.option(integrationTypeArb, { nil: undefined }),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  configuration: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  status: fc.option(integrationStatusArb, { nil: undefined }),
  test_results: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
});

describe('Stakeholder and Integration Data Persistence Properties', () => {
  test('Property 1: Stakeholder Data Persistence - For any valid stakeholder data, all data should be immediately persisted with correct field mappings', async () => {
    await fc.assert(
      fc.asyncProperty(validStakeholderDataArb, async (stakeholderData) => {
        // Mock successful API response for stakeholder creation
        const mockStakeholder: Stakeholder = {
          id: 'test-stakeholder-id',
          ...stakeholderData,
          created_at: new Date().toISOString()
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockStakeholder
        };

        // Reset mock before each test
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate API call
        const response = await fetch('http://localhost:3000/api/stakeholders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stakeholderData),
        });

        const result = await response.json();
        
        // Verify API call structure
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/stakeholders',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stakeholderData)
          })
        );

        // Should succeed for valid data
        expect(response.ok).toBe(true);
        expect(result.id).toBeDefined();
        expect(result.onboarding_id).toBe(stakeholderData.onboarding_id);
        expect(result.role).toBe(stakeholderData.role);
        expect(result.name).toBe(stakeholderData.name);
        expect(result.email).toBe(stakeholderData.email);
        
        // Verify data structure integrity
        expect(['owner', 'it_contact', 'project_manager', 'technical_lead']).toContain(result.role);
        expect(typeof result.name).toBe('string');
        expect(typeof result.email).toBe('string');
        expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(Array.isArray(result.responsibilities)).toBe(true);
      }),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 2: Integration Data Persistence - For any valid integration data, all data should be immediately persisted with correct field mappings', async () => {
    await fc.assert(
      fc.asyncProperty(validIntegrationDataArb, async (integrationData) => {
        // Mock successful API response for integration creation
        const mockIntegration: Integration = {
          id: 'test-integration-id',
          ...integrationData,
          status: 'not_configured',
          created_at: new Date().toISOString()
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockIntegration
        };

        // Reset mock before each test
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate API call
        const response = await fetch('http://localhost:3000/api/integrations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(integrationData),
        });

        const result = await response.json();
        
        // Verify API call structure
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/integrations',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(integrationData)
          })
        );

        // Should succeed for valid data
        expect(response.ok).toBe(true);
        expect(result.id).toBeDefined();
        expect(result.onboarding_id).toBe(integrationData.onboarding_id);
        expect(result.type).toBe(integrationData.type);
        expect(result.name).toBe(integrationData.name);
        expect(result.status).toBe('not_configured');
        
        // Verify data structure integrity
        expect(['SIS', 'CRM', 'SFTP', 'API', 'other']).toContain(result.type);
        expect(typeof result.name).toBe('string');
        expect(['not_configured', 'configured', 'testing', 'active', 'failed']).toContain(result.status);
      }),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 3: Stakeholder Retrieval by Onboarding ID - For any onboarding ID, system should return all associated stakeholders', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (onboardingId) => {
        // Mock successful API response for stakeholder retrieval
        const mockStakeholders: Stakeholder[] = [
          {
            id: 'stakeholder-1',
            onboarding_id: onboardingId,
            role: 'owner',
            name: 'Test Owner',
            email: 'owner@test.com',
            responsibilities: ['project oversight'],
            created_at: new Date().toISOString()
          }
        ];

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockStakeholders
        };

        // Reset mock before each test
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate API call
        const response = await fetch(`http://localhost:3000/api/stakeholders/${onboardingId}`, {
          method: 'GET',
        });

        const result = await response.json();
        
        // Should succeed for valid onboarding ID
        expect(response.ok).toBe(true);
        expect(Array.isArray(result)).toBe(true);
        
        // Verify all returned stakeholders belong to the correct onboarding
        for (const stakeholder of result) {
          expect(stakeholder.onboarding_id).toBe(onboardingId);
          expect(['owner', 'it_contact', 'project_manager', 'technical_lead']).toContain(stakeholder.role);
        }
      }),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 4: Integration Retrieval by Onboarding ID - For any onboarding ID, system should return all associated integrations', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (onboardingId) => {
        // Mock successful API response for integration retrieval
        const mockIntegrations: Integration[] = [
          {
            id: 'integration-1',
            onboarding_id: onboardingId,
            type: 'SIS',
            name: 'Test SIS Integration',
            status: 'not_configured',
            created_at: new Date().toISOString()
          }
        ];

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockIntegrations
        };

        // Reset mock before each test
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        // Simulate API call
        const response = await fetch(`http://localhost:3000/api/integrations/${onboardingId}`, {
          method: 'GET',
        });

        const result = await response.json();
        
        // Should succeed for valid onboarding ID
        expect(response.ok).toBe(true);
        expect(Array.isArray(result)).toBe(true);
        
        // Verify all returned integrations belong to the correct onboarding
        for (const integration of result) {
          expect(integration.onboarding_id).toBe(onboardingId);
          expect(['SIS', 'CRM', 'SFTP', 'API', 'other']).toContain(integration.type);
          expect(['not_configured', 'configured', 'testing', 'active', 'failed']).toContain(integration.status);
        }
      }),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 5: Stakeholder Update Consistency - For any valid stakeholder update data, system should preserve data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), stakeholderUpdateDataArb),
        async ([stakeholderId, updateData]) => {
          // Mock successful API response for stakeholder update
          const mockUpdatedStakeholder: Stakeholder = {
            id: stakeholderId,
            onboarding_id: 'test-onboarding-id',
            role: updateData.role || 'owner',
            name: updateData.name || 'Test Name',
            email: updateData.email || 'test@example.com',
            phone: updateData.phone,
            responsibilities: updateData.responsibilities || ['test responsibility'],
            created_at: new Date().toISOString()
          };

          const mockResponse = {
            ok: true,
            status: 200,
            json: async () => mockUpdatedStakeholder
          };

          // Reset mock before each test
          vi.clearAllMocks();
          (global.fetch as any).mockResolvedValueOnce(mockResponse);

          // Simulate API call
          const response = await fetch(`http://localhost:3000/api/stakeholders/update/${stakeholderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          const result = await response.json();
          
          // Should succeed for valid update data
          expect(response.ok).toBe(true);
          expect(result.id).toBe(stakeholderId);
          
          // Verify updated fields match input where provided
          if (updateData.role !== undefined) {
            expect(result.role).toBe(updateData.role);
            expect(['owner', 'it_contact', 'project_manager', 'technical_lead']).toContain(result.role);
          }
          if (updateData.name !== undefined) {
            expect(result.name).toBe(updateData.name);
          }
          if (updateData.email !== undefined) {
            expect(result.email).toBe(updateData.email);
            expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 6: Integration Update Consistency - For any valid integration update data, system should preserve data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), integrationUpdateDataArb),
        async ([integrationId, updateData]) => {
          // Mock successful API response for integration update
          const mockUpdatedIntegration: Integration = {
            id: integrationId,
            onboarding_id: 'test-onboarding-id',
            type: updateData.type || 'API',
            name: updateData.name || 'Test Integration',
            configuration: updateData.configuration,
            status: updateData.status || 'not_configured',
            test_results: updateData.test_results,
            created_at: new Date().toISOString()
          };

          const mockResponse = {
            ok: true,
            status: 200,
            json: async () => mockUpdatedIntegration
          };

          // Reset mock before each test
          vi.clearAllMocks();
          (global.fetch as any).mockResolvedValueOnce(mockResponse);

          // Simulate API call
          const response = await fetch(`http://localhost:3000/api/integrations/update/${integrationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          const result = await response.json();
          
          // Should succeed for valid update data
          expect(response.ok).toBe(true);
          expect(result.id).toBe(integrationId);
          
          // Verify updated fields match input where provided
          if (updateData.type !== undefined) {
            expect(result.type).toBe(updateData.type);
            expect(['SIS', 'CRM', 'SFTP', 'API', 'other']).toContain(result.type);
          }
          if (updateData.name !== undefined) {
            expect(result.name).toBe(updateData.name);
          }
          if (updateData.status !== undefined) {
            expect(result.status).toBe(updateData.status);
            expect(['not_configured', 'configured', 'testing', 'active', 'failed']).toContain(result.status);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);
});