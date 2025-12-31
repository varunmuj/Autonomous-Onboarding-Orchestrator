/**
 * Comprehensive Audit Trail System
 * 
 * This module provides centralized audit logging functionality for all significant
 * onboarding events. It ensures consistent metadata capture and provides query
 * capabilities for reporting and compliance.
 */

import { createClient } from "@supabase/supabase-js";
import { EventsAudit } from "./types";

// Initialize Supabase client for audit operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Audit event types for different system operations
 */
export type AuditEventType = 
  // Customer and Onboarding events
  | 'customer_created'
  | 'onboarding_created'
  | 'onboarding_status_changed'
  | 'onboarding_completed'
  | 'go_live_date_updated'
  
  // Task events
  | 'task_created'
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_overdue'
  
  // Stakeholder events
  | 'stakeholder_created'
  | 'stakeholder_updated'
  | 'stakeholder_assigned'
  
  // Integration events
  | 'integration_created'
  | 'integration_configured'
  | 'integration_tested'
  | 'integration_activated'
  | 'integration_failed'
  
  // Blocker and Escalation events
  | 'blocker_created'
  | 'blocker_resolved'
  | 'escalation_triggered'
  | 'escalation_resolved'
  
  // System events
  | 'system_error'
  | 'workflow_triggered'
  | 'notification_sent'
  | 'health_check_failed';

/**
 * Entity types that can be audited
 */
export type AuditEntityType = 
  | 'customer'
  | 'onboarding'
  | 'task'
  | 'stakeholder'
  | 'integration'
  | 'blocker'
  | 'escalation'
  | 'system';

/**
 * Comprehensive metadata interface for audit records
 */
export interface AuditMetadata {
  // Core identification
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  
  // Business context
  onboarding_id?: string;
  customer_id?: string;
  task_id?: string;
  stakeholder_id?: string;
  integration_id?: string;
  
  // Change tracking
  previous_value?: any;
  new_value?: any;
  changed_fields?: string[];
  
  // Operational context
  source?: 'api' | 'ui' | 'n8n' | 'system' | 'external';
  trigger?: 'user_action' | 'automated' | 'scheduled' | 'webhook';
  workflow_id?: string;
  
  // Error context (for error events)
  error_message?: string;
  error_code?: string;
  stack_trace?: string;
  
  // Additional context
  notes?: string;
  external_reference?: string;
  [key: string]: any;
}

/**
 * Audit record creation interface
 */
export interface CreateAuditRecord {
  entity_type: AuditEntityType;
  entity_id: string;
  event_type: AuditEventType;
  metadata?: AuditMetadata;
}

/**
 * Audit query filters for reporting
 */
export interface AuditQueryFilters {
  entity_type?: AuditEntityType;
  entity_id?: string;
  event_type?: AuditEventType;
  onboarding_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit report summary interface
 */
export interface AuditSummary {
  total_events: number;
  events_by_type: Record<AuditEventType, number>;
  events_by_entity: Record<AuditEntityType, number>;
  date_range: {
    earliest: string;
    latest: string;
  };
  most_active_entities: Array<{
    entity_type: AuditEntityType;
    entity_id: string;
    event_count: number;
  }>;
}

/**
 * Core audit logging function
 * Creates a comprehensive audit record with standardized metadata
 */
export async function createAuditRecord(record: CreateAuditRecord): Promise<EventsAudit> {
  try {
    // Enhance metadata with system context
    const enhancedMetadata: AuditMetadata = {
      ...record.metadata,
      timestamp: new Date().toISOString(),
      system_version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };

    // Insert audit record
    const { data: auditRecord, error } = await supabase
      .from("events_audit")
      .insert({
        entity_type: record.entity_type,
        entity_id: record.entity_id,
        event_type: record.event_type,
        metadata: enhancedMetadata,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create audit record:", error);
      throw new Error(`Audit logging failed: ${error.message}`);
    }

    return auditRecord;
  } catch (err) {
    console.error("Audit record creation error:", err);
    throw err;
  }
}

/**
 * Batch audit logging for multiple events
 */
export async function createAuditRecords(records: CreateAuditRecord[]): Promise<EventsAudit[]> {
  try {
    const enhancedRecords = records.map(record => ({
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      event_type: record.event_type,
      metadata: {
        ...record.metadata,
        timestamp: new Date().toISOString(),
        system_version: process.env.npm_package_version || 'unknown',
        environment: process.env.NODE_ENV || 'development',
      },
    }));

    const { data: auditRecords, error } = await supabase
      .from("events_audit")
      .insert(enhancedRecords)
      .select();

    if (error) {
      console.error("Failed to create batch audit records:", error);
      throw new Error(`Batch audit logging failed: ${error.message}`);
    }

    return auditRecords || [];
  } catch (err) {
    console.error("Batch audit record creation error:", err);
    throw err;
  }
}

/**
 * Query audit trail with comprehensive filtering
 */
export async function queryAuditTrail(filters: AuditQueryFilters = {}): Promise<EventsAudit[]> {
  try {
    let query = supabase
      .from("events_audit")
      .select("*");

    // Apply filters
    if (filters.entity_type) {
      query = query.eq("entity_type", filters.entity_type);
    }
    
    if (filters.entity_id) {
      query = query.eq("entity_id", filters.entity_id);
    }
    
    if (filters.event_type) {
      query = query.eq("event_type", filters.event_type);
    }
    
    if (filters.onboarding_id) {
      query = query.eq("metadata->onboarding_id", filters.onboarding_id);
    }
    
    if (filters.customer_id) {
      query = query.eq("metadata->customer_id", filters.customer_id);
    }
    
    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
    }
    
    if (filters.source) {
      query = query.eq("metadata->source", filters.source);
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 100)) - 1);
    }

    // Order by most recent first
    query = query.order("created_at", { ascending: false });

    const { data: auditRecords, error } = await query;

    if (error) {
      console.error("Failed to query audit trail:", error);
      throw new Error(`Audit query failed: ${error.message}`);
    }

    return auditRecords || [];
  } catch (err) {
    console.error("Audit trail query error:", err);
    throw err;
  }
}

/**
 * Get audit trail for a specific onboarding
 */
export async function getOnboardingAuditTrail(onboardingId: string): Promise<EventsAudit[]> {
  return queryAuditTrail({ onboarding_id: onboardingId });
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(entityType: AuditEntityType, entityId: string): Promise<EventsAudit[]> {
  return queryAuditTrail({ entity_type: entityType, entity_id: entityId });
}

/**
 * Generate audit summary report
 */
export async function generateAuditSummary(filters: AuditQueryFilters = {}): Promise<AuditSummary> {
  try {
    // Get all audit records matching filters
    const auditRecords = await queryAuditTrail({ ...filters, limit: 10000 });

    // Calculate summary statistics
    const eventsByType: Record<string, number> = {};
    const eventsByEntity: Record<string, number> = {};
    const entityActivity: Record<string, number> = {};

    let earliest = new Date().toISOString();
    let latest = new Date(0).toISOString();

    auditRecords.forEach(record => {
      // Count by event type
      eventsByType[record.event_type || 'unknown'] = (eventsByType[record.event_type || 'unknown'] || 0) + 1;
      
      // Count by entity type
      eventsByEntity[record.entity_type || 'unknown'] = (eventsByEntity[record.entity_type || 'unknown'] || 0) + 1;
      
      // Track entity activity
      const entityKey = `${record.entity_type}:${record.entity_id}`;
      entityActivity[entityKey] = (entityActivity[entityKey] || 0) + 1;
      
      // Track date range
      if (record.created_at < earliest) earliest = record.created_at;
      if (record.created_at > latest) latest = record.created_at;
    });

    // Get most active entities
    const mostActiveEntities = Object.entries(entityActivity)
      .map(([key, count]) => {
        const [entity_type, entity_id] = key.split(':');
        return { entity_type: entity_type as AuditEntityType, entity_id, event_count: count };
      })
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 10);

    return {
      total_events: auditRecords.length,
      events_by_type: eventsByType as Record<AuditEventType, number>,
      events_by_entity: eventsByEntity as Record<AuditEntityType, number>,
      date_range: { earliest, latest },
      most_active_entities: mostActiveEntities,
    };
  } catch (err) {
    console.error("Audit summary generation error:", err);
    throw err;
  }
}

/**
 * Convenience functions for common audit operations
 */

// Customer operations
export const auditCustomerCreated = (customerId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'customer', entity_id: customerId, event_type: 'customer_created', metadata });

// Onboarding operations
export const auditOnboardingCreated = (onboardingId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'onboarding', entity_id: onboardingId, event_type: 'onboarding_created', metadata });

export const auditOnboardingStatusChanged = (onboardingId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'onboarding', entity_id: onboardingId, event_type: 'onboarding_status_changed', metadata });

export const auditOnboardingCompleted = (onboardingId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'onboarding', entity_id: onboardingId, event_type: 'onboarding_completed', metadata });

// Task operations
export const auditTaskCreated = (taskId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'task', entity_id: taskId, event_type: 'task_created', metadata });

export const auditTaskStatusChanged = (taskId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'task', entity_id: taskId, event_type: 'task_status_changed', metadata });

export const auditTaskCompleted = (taskId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'task', entity_id: taskId, event_type: 'task_completed', metadata });

// Stakeholder operations
export const auditStakeholderCreated = (stakeholderId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'stakeholder', entity_id: stakeholderId, event_type: 'stakeholder_created', metadata });

export const auditStakeholderUpdated = (stakeholderId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'stakeholder', entity_id: stakeholderId, event_type: 'stakeholder_updated', metadata });

// Integration operations
export const auditIntegrationCreated = (integrationId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'integration', entity_id: integrationId, event_type: 'integration_created', metadata });

export const auditIntegrationTested = (integrationId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'integration', entity_id: integrationId, event_type: 'integration_tested', metadata });

// Blocker operations
export const auditBlockerCreated = (taskId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'blocker', entity_id: taskId, event_type: 'blocker_created', metadata });

export const auditBlockerResolved = (taskId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'blocker', entity_id: taskId, event_type: 'blocker_resolved', metadata });

// System operations
export const auditSystemError = (entityId: string, metadata?: AuditMetadata) =>
  createAuditRecord({ entity_type: 'system', entity_id: entityId, event_type: 'system_error', metadata });