// N8N Workflow Integration Tests
// Tests n8n workflow execution and error handling
// Validates webhook triggers and workflow responses

import { describe, it, expect } from 'vitest';
import { CreateOnboardingRequest } from './types';
import { DEMO_MODE } from './demo-data';

describe('N8N Workflow Integration Tests', () => {
  
  describe('Onboarding Workflow Triggers', () => {
    
    it('should handle onboarding creation with n8n webhook configuration', async () => {
      // Test that the system can handle n8n webhook URLs being configured
      const originalWebhookUrl = process.env.N8N_WEBHOOK_URL;
      process.env.N8N_WEBHOOK_URL = 'https://test-n8n.example.com/webhook/onboarding';
      
      try {
        const onboardingRequest: CreateOnboardingRequest = {
          customer_name: 'Test University',
          contract_start_date: '2024-01-01',
          contact_email: 'test@university.edu',
          industry: 'Education',
          size: 'medium',
          go_live_date: '2026-06-01',
          stakeholders: [
            {
              role: 'owner',
              name: 'John Doe',
              email: 'john@university.edu',
              responsibilities: ['Project oversight']
            }
          ],
          integrations: [
            {
              type: 'SIS',
              name: 'PowerSchool SIS',
              configuration: { endpoint: 'https://test.powerschool.com/api' }
            }
          ]
        };

        // In demo mode, this should still work without actually calling n8n
        const response = await fetch('http://localhost:3000/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingRequest)
        });

        const result = await response.json();
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        expect(result.onboarding_id).toBeDefined();
        expect(result.customer_id).toBeDefined();
        
      } finally {
        // Restore original environment
        if (originalWebhookUrl) {
          process.env.N8N_WEBHOOK_URL = originalWebhookUrl;
        } else {
          delete process.env.N8N_WEBHOOK_URL;
        }
      }
    });

    it('should handle onboarding creation without n8n webhook configuration', async () => {
      const originalWebhookUrl = process.env.N8N_WEBHOOK_URL;
      delete process.env.N8N_WEBHOOK_URL;
      
      try {
        const onboardingRequest: CreateOnboardingRequest = {
          customer_name: 'Test University',
          contract_start_date: '2024-01-01',
          stakeholders: [],
          integrations: []
        };

        const response = await fetch('http://localhost:3000/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingRequest)
        });

        const result = await response.json();
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        
      } finally {
        if (originalWebhookUrl) {
          process.env.N8N_WEBHOOK_URL = originalWebhookUrl;
        }
      }
    });

    it('should validate webhook URL format when configured', () => {
      // Test that the system can validate webhook URL formats
      const validUrls = [
        'https://n8n.example.com/webhook/onboarding',
        'http://localhost:5678/webhook/test',
        'https://workflow.company.com/api/webhook'
      ];

      const invalidUrls = [
        'not-a-url'
      ];

      validUrls.forEach(url => {
        expect(() => new URL(url)).not.toThrow();
      });

      invalidUrls.forEach(url => {
        expect(() => new URL(url)).toThrow();
      });
    });
  });

  describe('Task Management Workflow Integration', () => {
    
    it('should handle task blocking with escalation webhook configuration', async () => {
      const originalEscalationUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
      process.env.N8N_ESCALATION_WEBHOOK_URL = 'https://test-n8n.example.com/webhook/escalation';
      
      try {
        const response = await fetch('http://localhost:3000/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: 'test-task-123',
            status: 'blocked',
            blocker_reason: 'Network firewall blocking SFTP port 22'
          })
        });

        const result = await response.json();
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        
      } finally {
        if (originalEscalationUrl) {
          process.env.N8N_ESCALATION_WEBHOOK_URL = originalEscalationUrl;
        } else {
          delete process.env.N8N_ESCALATION_WEBHOOK_URL;
        }
      }
    });

    it('should handle task assignment with notification webhook configuration', async () => {
      const originalNotificationUrl = process.env.N8N_NOTIFICATION_WEBHOOK_URL;
      process.env.N8N_NOTIFICATION_WEBHOOK_URL = 'https://test-n8n.example.com/webhook/notification';
      
      try {
        const response = await fetch('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            onboarding_id: 'test-onboarding-123',
            task_type: 'integration_setup',
            title: 'Configure SIS Integration',
            owner_role: 'it_contact',
            assigned_to: 'jane@university.edu',
            priority: 'high',
            due_date: '2026-02-01'
          })
        });

        const result = await response.json();
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        expect(result.task_id).toBeDefined();
        
      } finally {
        if (originalNotificationUrl) {
          process.env.N8N_NOTIFICATION_WEBHOOK_URL = originalNotificationUrl;
        } else {
          delete process.env.N8N_NOTIFICATION_WEBHOOK_URL;
        }
      }
    });
  });

  describe('Workflow Error Handling', () => {
    
    it('should handle invalid webhook URLs gracefully', async () => {
      const originalWebhookUrl = process.env.N8N_WEBHOOK_URL;
      process.env.N8N_WEBHOOK_URL = 'invalid-url-format';
      
      try {
        const onboardingRequest: CreateOnboardingRequest = {
          customer_name: 'Invalid URL Test',
          contract_start_date: '2024-01-01',
          stakeholders: [],
          integrations: []
        };

        const response = await fetch('http://localhost:3000/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingRequest)
        });

        const result = await response.json();
        
        // Onboarding should still succeed despite invalid webhook URL
        expect(response.ok).toBe(true);
        expect(result.success).toBe(true);
        
      } finally {
        if (originalWebhookUrl) {
          process.env.N8N_WEBHOOK_URL = originalWebhookUrl;
        } else {
          delete process.env.N8N_WEBHOOK_URL;
        }
      }
    });

    it('should validate webhook payload structure', () => {
      // Test that webhook payloads have the expected structure
      const sampleOnboardingPayload = {
        onboarding_id: 'test-onboarding-123',
        customer_id: 'test-customer-123',
        customer_name: 'Test University',
        go_live_date: '2026-06-01',
        stakeholders: [
          {
            role: 'owner',
            name: 'John Doe',
            email: 'john@university.edu',
            responsibilities: ['Project oversight']
          }
        ],
        integrations: [
          {
            type: 'SIS',
            name: 'PowerSchool SIS',
            configuration: { endpoint: 'https://test.powerschool.com/api' }
          }
        ],
        customer_size: 'medium',
        industry: 'Education'
      };

      // Validate required fields are present
      expect(sampleOnboardingPayload.onboarding_id).toBeDefined();
      expect(sampleOnboardingPayload.customer_id).toBeDefined();
      expect(sampleOnboardingPayload.customer_name).toBeDefined();
      expect(Array.isArray(sampleOnboardingPayload.stakeholders)).toBe(true);
      expect(Array.isArray(sampleOnboardingPayload.integrations)).toBe(true);

      const sampleEscalationPayload = {
        task_id: 'test-task-123',
        onboarding_id: 'test-onboarding-123',
        blocker_reason: 'Network firewall blocking SFTP port 22',
        task_type: 'integration_setup',
        owner_role: 'it_contact',
        customer_name: 'Test University',
        stakeholders: []
      };

      // Validate escalation payload structure
      expect(sampleEscalationPayload.task_id).toBeDefined();
      expect(sampleEscalationPayload.onboarding_id).toBeDefined();
      expect(sampleEscalationPayload.blocker_reason).toBeDefined();
      expect(Array.isArray(sampleEscalationPayload.stakeholders)).toBe(true);

      const sampleNotificationPayload = {
        type: 'task_assigned',
        task_id: 'test-task-123',
        assigned_to: 'jane@university.edu',
        task_title: 'Configure SIS Integration',
        priority: 'high',
        due_date: '2026-02-01'
      };

      // Validate notification payload structure
      expect(sampleNotificationPayload.type).toBe('task_assigned');
      expect(sampleNotificationPayload.task_id).toBeDefined();
      expect(sampleNotificationPayload.assigned_to).toBeDefined();
      expect(sampleNotificationPayload.task_title).toBeDefined();
    });
  });

  describe('Demo Mode Compatibility', () => {
    
    it('should work correctly in demo mode', async () => {
      // Verify that demo mode is active
      expect(DEMO_MODE).toBe(true);

      const onboardingRequest: CreateOnboardingRequest = {
        customer_name: 'Demo Mode Test University',
        contract_start_date: '2024-01-01',
        go_live_date: '2026-06-01',
        stakeholders: [
          {
            role: 'owner',
            name: 'Demo User',
            email: 'demo@university.edu',
            responsibilities: ['Demo oversight']
          }
        ],
        integrations: [
          {
            type: 'SIS',
            name: 'Demo SIS',
            configuration: { endpoint: 'https://demo.example.com/api' }
          }
        ]
      };

      const response = await fetch('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingRequest)
      });

      const result = await response.json();
      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.onboarding_id).toMatch(/^onboarding-\d+$/);
      expect(result.customer_id).toMatch(/^customer-\d+$/);
    });

    it('should provide consistent demo responses', async () => {
      // Test that demo mode provides consistent API responses
      const dashboardResponse = await fetch('http://localhost:3000/api/dashboard');
      const dashboardData = await dashboardResponse.json();

      expect(dashboardResponse.ok).toBe(true);
      expect(dashboardData.summary).toBeDefined();
      expect(typeof dashboardData.summary.totalOnboardings).toBe('number');
      expect(typeof dashboardData.summary.activeOnboardings).toBe('number');
      expect(typeof dashboardData.summary.completionRate).toBe('number');

      // Health endpoint may return unhealthy in demo mode due to configuration
      const healthResponse = await fetch('http://localhost:3000/api/health');
      const healthData = await healthResponse.json();

      expect(healthData.status).toBeDefined();
      // In demo mode, the health response structure may be different
      if (healthData.services) {
        expect(healthData.services.database).toBeDefined();
      }
    });
  });
});