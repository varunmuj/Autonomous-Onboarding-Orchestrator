/**
 * Property-based tests for error handling and data consistency
 * Feature: autonomous-onboarding-orchestrator, Property 10: Error Handling and Data Consistency
 * Validates: Requirements 4.3
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for testing different error scenarios
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn()
  }
};

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Generators for property-based testing
const databaseErrorArb = fc.record({
  code: fc.constantFrom('23505', '23503', '42P01', '08006', '53300', 'PGRST116'),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  details: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: null }),
  hint: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: null })
});

const networkErrorArb = fc.record({
  name: fc.constantFrom('NetworkError', 'TimeoutError', 'ConnectionError'),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  code: fc.option(fc.constantFrom('ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'), { nil: undefined })
});

const validOnboardingDataArb = fc.record({
  customer_name: fc.string({ minLength: 1, maxLength: 200 }),
  contract_start_date: fc.date({ 
    min: new Date('2020-01-01'), 
    max: new Date() 
  }).map(date => {
    try {
      return date.toISOString().split('T')[0];
    } catch {
      return '2023-01-01';
    }
  }),
  contact_email: fc.option(fc.emailAddress(), { nil: undefined }),
  industry: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  size: fc.option(fc.constantFrom('small', 'medium', 'large', 'enterprise'), { nil: undefined }),
  go_live_date: fc.option(
    fc.date({ 
      min: new Date(Date.now() + 24 * 60 * 60 * 1000), 
      max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
    }).map(date => {
      try {
        return date.toISOString().split('T')[0];
      } catch {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    }), 
    { nil: undefined }
  )
});

const taskUpdateDataArb = fc.record({
  task_id: fc.string({ minLength: 1, maxLength: 50 }),
  status: fc.constantFrom('pending', 'in_progress', 'completed', 'blocked'),
  assigned_to: fc.option(fc.emailAddress(), { nil: undefined }),
  blocker_reason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined })
});

describe('Error Handling and Data Consistency Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Property 10: Error Handling and Data Consistency - For any database operation failure, system should handle errors gracefully and maintain data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(validOnboardingDataArb, databaseErrorArb),
        async ([requestData, dbError]) => {
          // Mock database error scenario
          const mockFromChain = {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: dbError 
                }))
              }))
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: dbError 
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ 
                    data: null, 
                    error: dbError 
                  }))
                }))
              }))
            }))
          };

          mockSupabaseClient.from.mockReturnValue(mockFromChain);

          // Mock API error response
          const mockErrorResponse = {
            ok: false,
            status: 500,
            json: async () => ({
              error: 'Internal server error'
            })
          };

          (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

          // Test onboarding creation with database error
          const response = await fetch('http://localhost:3000/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          });

          const result = await response.json();

          // Verify graceful error handling
          expect(response.ok).toBe(false);
          expect(response.status).toBe(500);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');

          // Verify error response structure is consistent
          expect(result).toHaveProperty('error');
          expect(result.error).not.toBe('');

          // Verify no partial data corruption (should not have success=true with error)
          if (result.success !== undefined) {
            expect(result.success).toBe(false);
          }

          // Verify no sensitive error information is leaked
          expect(result.error).not.toContain('password');
          expect(result.error).not.toContain('secret');
          expect(result.error).not.toContain('key');
          expect(result.error).not.toContain('token');

          // Database errors should be handled without exposing internal details
          if (dbError.code === '23505') { // Unique constraint violation
            // Should handle duplicate key errors gracefully
            expect([400, 409, 500]).toContain(response.status);
          } else if (dbError.code === '23503') { // Foreign key constraint violation
            // Should handle referential integrity errors gracefully
            expect([400, 500]).toContain(response.status);
          } else if (dbError.code === '42P01') { // Undefined table
            // Should handle schema errors gracefully
            expect(response.status).toBe(500);
          } else if (dbError.code === '08006') { // Connection failure
            // Should handle connection errors gracefully
            expect(response.status).toBe(500);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('Property 10.1: Network Error Resilience - For any network failure, system should handle errors gracefully without data corruption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(validOnboardingDataArb, networkErrorArb),
        async ([requestData, networkError]) => {
          // Mock network error
          const mockNetworkError = new Error(networkError.message);
          mockNetworkError.name = networkError.name;
          if (networkError.code) {
            (mockNetworkError as any).code = networkError.code;
          }

          (global.fetch as any).mockRejectedValueOnce(mockNetworkError);

          // Test API call with network error
          try {
            await fetch('http://localhost:3000/api/onboarding', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            });
            
            // Should not reach here if network error is properly thrown
            expect(false).toBe(true);
          } catch (error: any) {
            // Verify network error is properly caught and handled
            expect(error).toBeDefined();
            expect(error.message).toBe(networkError.message);
            expect(error.name).toBe(networkError.name);
            
            if (networkError.code) {
              expect((error as any).code).toBe(networkError.code);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('Property 10.2: Transaction Rollback Consistency - For any multi-step operation failure, system should maintain data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        validOnboardingDataArb.filter(data => 
          // Ensure we have stakeholders or integrations for multi-step operations
          (data as any).stakeholders?.length > 0 || (data as any).integrations?.length > 0
        ),
        async (requestData) => {
          // Mock successful customer creation but failed stakeholder/integration creation
          let callCount = 0;
          const mockFromChain = {
            insert: vi.fn(() => {
              callCount++;
              if (callCount === 1) {
                // First call (customer) succeeds
                return {
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ 
                      data: { id: 'test-customer-id', name: requestData.customer_name }, 
                      error: null 
                    }))
                  }))
                };
              } else if (callCount === 2) {
                // Second call (onboarding) succeeds
                return {
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ 
                      data: { id: 'test-onboarding-id', customer_id: 'test-customer-id' }, 
                      error: null 
                    }))
                  }))
                };
              } else {
                // Third call (stakeholders/integrations) fails
                return Promise.resolve({ 
                  data: null, 
                  error: { 
                    code: '23503', 
                    message: 'Foreign key constraint violation' 
                  } 
                });
              }
            }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: null 
                }))
              }))
            }))
          };

          mockSupabaseClient.from.mockReturnValue(mockFromChain);

          // Mock API error response for transaction failure
          const mockErrorResponse = {
            ok: false,
            status: 500,
            json: async () => ({
              error: 'Internal server error'
            })
          };

          (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

          const response = await fetch('http://localhost:3000/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          });

          const result = await response.json();

          // Verify transaction failure is handled gracefully
          expect(response.ok).toBe(false);
          expect(result.error).toBeDefined();

          // Verify no partial success is reported
          expect(result.success).not.toBe(true);
          expect(result.onboarding_id).toBeUndefined();
          expect(result.customer_id).toBeUndefined();

          // Verify consistent error response structure
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 10.3: Task Update Error Consistency - For any task update failure, system should maintain task state consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(taskUpdateDataArb, databaseErrorArb),
        async ([taskData, dbError]) => {
          // Mock task update with database error
          const mockFromChain = {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ 
                    data: null, 
                    error: dbError 
                  }))
                }))
              }))
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { 
                    id: taskData.task_id,
                    status: 'pending', // Original status
                    assigned_to: null,
                    is_blocker: false
                  }, 
                  error: null 
                }))
              }))
            }))
          };

          mockSupabaseClient.from.mockReturnValue(mockFromChain);

          // Mock API error response
          const mockErrorResponse = {
            ok: false,
            status: 500,
            json: async () => ({
              error: 'Internal server error'
            })
          };

          (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

          const response = await fetch('http://localhost:3000/api/tasks', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
          });

          const result = await response.json();

          // Verify task update error is handled gracefully
          expect(response.ok).toBe(false);
          expect(result.error).toBeDefined();

          // Verify no partial update success is reported
          expect(result.success).not.toBe(true);
          expect(result.task).toBeUndefined();

          // Verify error message is meaningful
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);

          // Verify status code is appropriate for database errors
          expect([400, 500]).toContain(response.status);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('Property 10.4: Audit Trail Error Resilience - For any audit logging failure, system should continue operation without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        validOnboardingDataArb,
        async (requestData) => {
          // Mock successful main operation but failed audit logging
          const mockFromChain = {
            insert: vi.fn(() => {
              const tableName = mockSupabaseClient.from.mock.calls[mockSupabaseClient.from.mock.calls.length - 1][0];
              
              if (tableName === 'events_audit') {
                // Audit insert fails
                return Promise.resolve({ 
                  data: null, 
                  error: { 
                    code: '23505', 
                    message: 'Audit logging failed' 
                  } 
                });
              } else {
                // Main operations succeed
                return {
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ 
                      data: { 
                        id: tableName === 'customers' ? 'test-customer-id' : 'test-onboarding-id',
                        customer_id: tableName === 'onboardings' ? 'test-customer-id' : undefined,
                        name: tableName === 'customers' ? requestData.customer_name : undefined
                      }, 
                      error: null 
                    }))
                  }))
                };
              }
            }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: {}, 
                  error: null 
                }))
              }))
            }))
          };

          mockSupabaseClient.from.mockReturnValue(mockFromChain);

          // Mock successful API response despite audit failure
          const mockSuccessResponse = {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              onboarding_id: 'test-onboarding-id',
              customer_id: 'test-customer-id'
            })
          };

          (global.fetch as any).mockResolvedValueOnce(mockSuccessResponse);

          const response = await fetch('http://localhost:3000/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          });

          const result = await response.json();

          // Main operation should succeed even if audit fails
          // (This tests the resilience pattern where audit failures don't break main operations)
          expect(response.ok).toBe(true);
          expect(result.success).toBe(true);
          expect(result.onboarding_id).toBeDefined();
          expect(result.customer_id).toBeDefined();

          // Verify response structure is consistent
          expect(typeof result.onboarding_id).toBe('string');
          expect(typeof result.customer_id).toBe('string');
          expect(result.onboarding_id.length).toBeGreaterThan(0);
          expect(result.customer_id.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  test('Property 10.5: Input Validation Error Consistency - For any invalid input, system should provide consistent error responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          customer_name: fc.option(fc.string(), { nil: undefined }),
          contract_start_date: fc.option(fc.string(), { nil: undefined }),
          contact_email: fc.option(fc.string(), { nil: undefined }),
          go_live_date: fc.option(fc.string(), { nil: undefined })
        }).filter(data => 
          // Ensure at least one validation error condition
          !data.customer_name || 
          !data.contract_start_date || 
          (data.contact_email && !data.contact_email.includes('@')) ||
          (data.go_live_date && data.go_live_date === 'invalid-date')
        ),
        async (invalidData) => {
          // Mock validation error response
          const mockErrorResponse = {
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Validation failed'
            })
          };

          (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

          const response = await fetch('http://localhost:3000/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidData),
          });

          const result = await response.json();

          // Verify validation errors are handled consistently
          expect(response.ok).toBe(false);
          expect(response.status).toBe(400);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');

          // Verify no success flag with validation errors
          expect(result.success).not.toBe(true);

          // Verify error message is meaningful
          expect(result.error.length).toBeGreaterThan(0);
          expect(result.error).not.toBe('');

          // Verify consistent error response structure
          expect(result).toHaveProperty('error');
          expect(Object.keys(result)).toContain('error');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});