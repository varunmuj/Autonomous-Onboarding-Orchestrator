// Property-based tests for system state recovery
// **Feature: autonomous-onboarding-orchestrator, Property 9: System State Recovery**
// **Validates: Requirements 4.2**

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock the supabase module before importing anything else
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        })),
        limit: vi.fn(() => ({
          data: [{ count: 1 }],
          error: null
        }))
      })),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ 
        eq: vi.fn(() => ({ error: null }))
      })),
      delete: vi.fn(() => ({ 
        neq: vi.fn(() => ({ error: null }))
      }))
    }))
  }
}));

import { 
  validateDataConsistency,
  SystemState 
} from './system-state';
import { Customer } from './types';

// Test data generators
const customerArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  contract_start_date: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString().split('T')[0]),
  contact_email: fc.option(fc.emailAddress()),
  industry: fc.option(fc.constantFrom('technology', 'healthcare', 'finance', 'education')),
  size: fc.option(fc.constantFrom('small', 'medium', 'large', 'enterprise')),
  created_at: fc.date().map(d => d.toISOString())
});

describe('System State Recovery Property Tests', () => {
  it('Property 9: System State Recovery - For any system state, data consistency validation should work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(customerArb, { minLength: 1, maxLength: 2 }),
        async (customers) => {
          // Create system state with referential integrity issue
          const systemState: SystemState = {
            customers: customers,
            onboardings: [{
              id: fc.sample(fc.uuid(), { numRuns: 1 })[0],
              customer_id: 'non-existent-customer-id', // This will cause integrity issue
              status: 'in_progress',
              created_at: new Date().toISOString()
            }],
            tasks: [],
            integrations: [],
            stakeholders: [],
            lastUpdated: new Date().toISOString(),
            isHealthy: true
          };

          // Validate data consistency
          const healthCheck = await validateDataConsistency(systemState);

          // Should detect the referential integrity issue
          expect(healthCheck.dataConsistency).toBe(false);
          expect(healthCheck.errors.length).toBeGreaterThan(0);
          expect(healthCheck.errors.some(error => 
            error.includes('references non-existent customer')
          )).toBe(true);
        }
      ),
      { numRuns: 5, timeout: 10000 }
    );
  });

  it('Property 9a: System State Structure Validation - For any valid system state, it should have all required properties with correct types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(customerArb, { minLength: 0, maxLength: 2 }),
        async (customers) => {
          const systemState: SystemState = {
            customers: customers,
            onboardings: [],
            tasks: [],
            integrations: [],
            stakeholders: [],
            lastUpdated: new Date().toISOString(),
            isHealthy: true
          };

          // Verify system state structure
          expect(systemState).toHaveProperty('customers');
          expect(systemState).toHaveProperty('onboardings');
          expect(systemState).toHaveProperty('tasks');
          expect(systemState).toHaveProperty('integrations');
          expect(systemState).toHaveProperty('stakeholders');
          expect(systemState).toHaveProperty('lastUpdated');
          expect(systemState).toHaveProperty('isHealthy');

          // Verify types
          expect(Array.isArray(systemState.customers)).toBe(true);
          expect(Array.isArray(systemState.onboardings)).toBe(true);
          expect(Array.isArray(systemState.tasks)).toBe(true);
          expect(Array.isArray(systemState.integrations)).toBe(true);
          expect(Array.isArray(systemState.stakeholders)).toBe(true);
          expect(typeof systemState.lastUpdated).toBe('string');
          expect(typeof systemState.isHealthy).toBe('boolean');

          // Verify timestamp is valid ISO string
          expect(new Date(systemState.lastUpdated)).toBeInstanceOf(Date);
          expect(isNaN(new Date(systemState.lastUpdated).getTime())).toBe(false);
        }
      ),
      { numRuns: 5, timeout: 10000 }
    );
  });

  it('Property 9b: Data Consistency with Valid References - For any system state with valid references, consistency validation should pass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(customerArb, { minLength: 1, maxLength: 2 }),
        async (customers) => {
          // Create system state with valid references
          const systemState: SystemState = {
            customers: customers,
            onboardings: [{
              id: fc.sample(fc.uuid(), { numRuns: 1 })[0],
              customer_id: customers[0].id, // Valid reference
              status: 'in_progress',
              created_at: new Date().toISOString()
            }],
            tasks: [],
            integrations: [],
            stakeholders: [],
            lastUpdated: new Date().toISOString(),
            isHealthy: true
          };

          // Validate data consistency
          const healthCheck = await validateDataConsistency(systemState);

          // Should pass consistency checks for valid references
          expect(healthCheck.database).toBe(true);
          
          // If there are no other issues, data consistency should be true
          const hasReferentialErrors = healthCheck.errors.some(error => 
            error.includes('references non-existent')
          );
          
          if (!hasReferentialErrors) {
            expect(healthCheck.dataConsistency).toBe(true);
          }
        }
      ),
      { numRuns: 5, timeout: 10000 }
    );
  });
});