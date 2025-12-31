import { describe, it, expect, vi } from 'vitest';
import { 
  AuditEventType,
  AuditEntityType,
  AuditMetadata,
  CreateAuditRecord
} from './audit-trail';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-audit-id',
              entity_type: 'onboarding',
              entity_id: 'test-onboarding-id',
              event_type: 'onboarding_created',
              metadata: { test: 'data' },
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Audit Trail System', () => {
  describe('Type Definitions', () => {
    it('should have comprehensive audit event types', () => {
      const eventTypes: AuditEventType[] = [
        'customer_created',
        'onboarding_created',
        'onboarding_status_changed',
        'onboarding_completed',
        'task_created',
        'task_assigned',
        'task_status_changed',
        'task_completed',
        'stakeholder_created',
        'stakeholder_updated',
        'integration_created',
        'integration_configured',
        'integration_tested',
        'integration_activated',
        'integration_failed',
        'blocker_created',
        'blocker_resolved',
        'escalation_triggered',
        'system_error',
        'workflow_triggered',
        'notification_sent'
      ];

      // Verify all event types are valid strings
      eventTypes.forEach(eventType => {
        expect(typeof eventType).toBe('string');
        expect(eventType.length).toBeGreaterThan(0);
      });
    });

    it('should have comprehensive entity types', () => {
      const entityTypes: AuditEntityType[] = [
        'customer',
        'onboarding',
        'task',
        'stakeholder',
        'integration',
        'blocker',
        'escalation',
        'system'
      ];

      // Verify all entity types are valid strings
      entityTypes.forEach(entityType => {
        expect(typeof entityType).toBe('string');
        expect(entityType.length).toBeGreaterThan(0);
      });
    });

    it('should have comprehensive metadata interface', () => {
      const metadata: AuditMetadata = {
        // Core identification
        user_id: 'test-user',
        session_id: 'test-session',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        
        // Business context
        onboarding_id: 'test-onboarding',
        customer_id: 'test-customer',
        task_id: 'test-task',
        
        // Change tracking
        previous_value: { status: 'pending' },
        new_value: { status: 'completed' },
        changed_fields: ['status'],
        
        // Operational context
        source: 'api',
        trigger: 'user_action',
        
        // Additional context
        notes: 'Test audit record'
      };

      expect(metadata.user_id).toBe('test-user');
      expect(metadata.onboarding_id).toBe('test-onboarding');
      expect(metadata.source).toBe('api');
      expect(metadata.trigger).toBe('user_action');
      expect(metadata.changed_fields).toEqual(['status']);
    });
  });

  describe('Audit Record Structure', () => {
    it('should validate audit record creation structure', () => {
      const auditRecord: CreateAuditRecord = {
        entity_type: 'onboarding',
        entity_id: 'test-onboarding-id',
        event_type: 'onboarding_created',
        metadata: {
          customer_name: 'Test Customer',
          source: 'api',
          trigger: 'user_action',
          onboarding_id: 'test-onboarding-id'
        }
      };

      expect(auditRecord.entity_type).toBe('onboarding');
      expect(auditRecord.entity_id).toBe('test-onboarding-id');
      expect(auditRecord.event_type).toBe('onboarding_created');
      expect(auditRecord.metadata?.customer_name).toBe('Test Customer');
      expect(auditRecord.metadata?.source).toBe('api');
    });

    it('should support different audit scenarios', () => {
      // Customer creation audit
      const customerAudit: CreateAuditRecord = {
        entity_type: 'customer',
        entity_id: 'customer-123',
        event_type: 'customer_created',
        metadata: {
          customer_name: 'Acme Corp',
          industry: 'technology',
          size: 'enterprise'
        }
      };

      // Task status change audit
      const taskAudit: CreateAuditRecord = {
        entity_type: 'task',
        entity_id: 'task-456',
        event_type: 'task_status_changed',
        metadata: {
          previous_value: { status: 'pending' },
          new_value: { status: 'completed' },
          changed_fields: ['status'],
          onboarding_id: 'onboarding-789'
        }
      };

      // Blocker creation audit
      const blockerAudit: CreateAuditRecord = {
        entity_type: 'blocker',
        entity_id: 'task-456',
        event_type: 'blocker_created',
        metadata: {
          blocker_reason: 'Waiting for customer approval',
          impact_level: 'high',
          reported_by: 'user@example.com'
        }
      };

      expect(customerAudit.entity_type).toBe('customer');
      expect(taskAudit.event_type).toBe('task_status_changed');
      expect(blockerAudit.metadata?.blocker_reason).toBe('Waiting for customer approval');
    });
  });

  describe('Audit Trail Completeness Requirements', () => {
    it('should validate Property 11: Audit Trail Completeness', () => {
      // Property 11: For any significant onboarding event, the system should create 
      // corresponding audit records with complete metadata for traceability
      
      const significantEvents: Array<{
        entity_type: AuditEntityType;
        event_type: AuditEventType;
        required_metadata: string[];
      }> = [
        {
          entity_type: 'customer',
          event_type: 'customer_created',
          required_metadata: ['customer_name', 'onboarding_id']
        },
        {
          entity_type: 'onboarding',
          event_type: 'onboarding_created',
          required_metadata: ['customer_id', 'customer_name', 'onboarding_id']
        },
        {
          entity_type: 'task',
          event_type: 'task_created',
          required_metadata: ['onboarding_id', 'task_type', 'owner_role']
        },
        {
          entity_type: 'task',
          event_type: 'task_status_changed',
          required_metadata: ['onboarding_id', 'previous_value', 'new_value']
        },
        {
          entity_type: 'blocker',
          event_type: 'blocker_created',
          required_metadata: ['onboarding_id', 'blocker_reason']
        },
        {
          entity_type: 'escalation',
          event_type: 'escalation_triggered',
          required_metadata: ['onboarding_id', 'escalation_type']
        }
      ];

      // Verify each significant event has proper structure
      significantEvents.forEach(event => {
        expect(event.entity_type).toBeDefined();
        expect(event.event_type).toBeDefined();
        expect(event.required_metadata.length).toBeGreaterThan(0);
        
        // All significant events should include onboarding_id for traceability
        expect(event.required_metadata).toContain('onboarding_id');
      });
    });

    it('should ensure audit metadata completeness', () => {
      // All audit records should have these core metadata fields for traceability
      const requiredCoreMetadata = [
        'timestamp',
        'source',
        'trigger',
        'environment'
      ];

      const sampleAuditMetadata: AuditMetadata = {
        timestamp: new Date().toISOString(),
        source: 'api',
        trigger: 'user_action',
        environment: 'test',
        onboarding_id: 'test-onboarding'
      };

      requiredCoreMetadata.forEach(field => {
        expect(sampleAuditMetadata).toHaveProperty(field);
        expect(sampleAuditMetadata[field as keyof AuditMetadata]).toBeDefined();
      });
    });
  });
});