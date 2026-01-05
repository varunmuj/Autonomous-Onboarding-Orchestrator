// System state management for the Autonomous Onboarding Orchestrator
// Handles system initialization, state recovery, and data consistency validation

import { createClient } from "@supabase/supabase-js";
import { Onboarding, OnboardingTask, Customer, Integration, Stakeholder } from './types';
import { DEMO_MODE } from './demo-data';

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) : null;

export interface SystemState {
  customers: Customer[];
  onboardings: Onboarding[];
  tasks: OnboardingTask[];
  integrations: Integration[];
  stakeholders: Stakeholder[];
  lastUpdated: string;
  isHealthy: boolean;
}

export interface SystemHealthCheck {
  database: boolean;
  dataConsistency: boolean;
  incompleteOperations: string[];
  errors: string[];
}

/**
 * Loads complete system state from Supabase on startup
 * Validates data consistency and identifies incomplete operations
 */
export async function initializeSystemState(): Promise<SystemState> {
  try {
    console.log('Initializing system state...');
    
    // Demo mode - return mock state
    if (DEMO_MODE) {
      console.log('🎭 Demo Mode: Using mock system state');
      return {
        customers: [],
        onboardings: [],
        tasks: [],
        integrations: [],
        stakeholders: [],
        lastUpdated: new Date().toISOString(),
        isHealthy: true
      };
    }

    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Load all core data in parallel
    const [
      customersResult,
      onboardingsResult,
      tasksResult,
      integrationsResult,
      stakeholdersResult
    ] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('onboardings').select('*').order('created_at', { ascending: false }),
      supabase.from('onboarding_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('integrations').select('*').order('created_at', { ascending: false }),
      supabase.from('stakeholders').select('*').order('created_at', { ascending: false })
    ]);

    // Check for errors in any query
    const errors: string[] = [];
    if (customersResult.error) errors.push(`Customers: ${customersResult.error.message}`);
    if (onboardingsResult.error) errors.push(`Onboardings: ${onboardingsResult.error.message}`);
    if (tasksResult.error) errors.push(`Tasks: ${tasksResult.error.message}`);
    if (integrationsResult.error) errors.push(`Integrations: ${integrationsResult.error.message}`);
    if (stakeholdersResult.error) errors.push(`Stakeholders: ${stakeholdersResult.error.message}`);

    if (errors.length > 0) {
      throw new Error(`Failed to load system state: ${errors.join(', ')}`);
    }

    const systemState: SystemState = {
      customers: customersResult.data || [],
      onboardings: onboardingsResult.data || [],
      tasks: tasksResult.data || [],
      integrations: integrationsResult.data || [],
      stakeholders: stakeholdersResult.data || [],
      lastUpdated: new Date().toISOString(),
      isHealthy: true
    };

    // Validate data consistency
    const healthCheck = await validateDataConsistency(systemState);
    systemState.isHealthy = healthCheck.database && healthCheck.dataConsistency;

    // Handle incomplete operations
    if (healthCheck.incompleteOperations.length > 0) {
      console.warn('Incomplete operations detected:', healthCheck.incompleteOperations);
      await recoverIncompleteOperations(systemState, healthCheck.incompleteOperations);
    }

    console.log(`System state initialized successfully. Loaded: ${systemState.customers.length} customers, ${systemState.onboardings.length} onboardings, ${systemState.tasks.length} tasks`);
    
    return systemState;
  } catch (error) {
    console.error('Failed to initialize system state:', error);
    throw error;
  }
}

/**
 * Validates data consistency across all entities
 * Checks referential integrity and identifies orphaned records
 */
export async function validateDataConsistency(state: SystemState): Promise<SystemHealthCheck> {
  const healthCheck: SystemHealthCheck = {
    database: true,
    dataConsistency: true,
    incompleteOperations: [],
    errors: []
  };

  try {
    // Demo mode - always return healthy
    if (DEMO_MODE) {
      return healthCheck;
    }

    if (!supabase) {
      healthCheck.database = false;
      healthCheck.errors.push('Supabase client not available');
      return healthCheck;
    }

    // Test database connectivity
    const { error: dbError } = await supabase.from('customers').select('count').limit(1);
    if (dbError) {
      healthCheck.database = false;
      healthCheck.errors.push(`Database connectivity: ${dbError.message}`);
    }

    // Validate referential integrity
    const customerIds = new Set(state.customers.map(c => c.id));
    const onboardingIds = new Set(state.onboardings.map(o => o.id));

    // Check onboardings reference valid customers
    for (const onboarding of state.onboardings) {
      if (!customerIds.has(onboarding.customer_id)) {
        healthCheck.dataConsistency = false;
        healthCheck.errors.push(`Onboarding ${onboarding.id} references non-existent customer ${onboarding.customer_id}`);
      }
    }

    // Check tasks reference valid onboardings
    for (const task of state.tasks) {
      if (!onboardingIds.has(task.onboarding_id)) {
        healthCheck.dataConsistency = false;
        healthCheck.errors.push(`Task ${task.id} references non-existent onboarding ${task.onboarding_id}`);
      }
    }

    // Check integrations reference valid onboardings
    for (const integration of state.integrations) {
      if (!onboardingIds.has(integration.onboarding_id)) {
        healthCheck.dataConsistency = false;
        healthCheck.errors.push(`Integration ${integration.id} references non-existent onboarding ${integration.onboarding_id}`);
      }
    }

    // Check stakeholders reference valid onboardings
    for (const stakeholder of state.stakeholders) {
      if (!onboardingIds.has(stakeholder.onboarding_id)) {
        healthCheck.dataConsistency = false;
        healthCheck.errors.push(`Stakeholder ${stakeholder.id} references non-existent onboarding ${stakeholder.onboarding_id}`);
      }
    }

    // Identify incomplete operations
    // 1. Onboardings without any tasks
    for (const onboarding of state.onboardings) {
      const hasTasks = state.tasks.some(t => t.onboarding_id === onboarding.id);
      if (!hasTasks && onboarding.status !== 'not_started') {
        healthCheck.incompleteOperations.push(`Onboarding ${onboarding.id} has no tasks but status is ${onboarding.status}`);
      }
    }

    // 2. Onboardings marked completed but with incomplete tasks
    for (const onboarding of state.onboardings) {
      if (onboarding.status === 'completed') {
        const incompleteTasks = state.tasks.filter(t => 
          t.onboarding_id === onboarding.id && 
          t.status !== 'completed' && 
          !t.is_blocker
        );
        if (incompleteTasks.length > 0) {
          healthCheck.incompleteOperations.push(`Onboarding ${onboarding.id} marked completed but has ${incompleteTasks.length} incomplete tasks`);
        }
      }
    }

    // 3. Tasks with invalid status combinations
    for (const task of state.tasks) {
      if (task.status === 'completed' && !task.completed_at) {
        healthCheck.incompleteOperations.push(`Task ${task.id} marked completed but missing completion timestamp`);
      }
      if (task.is_blocker && task.status === 'completed') {
        healthCheck.incompleteOperations.push(`Task ${task.id} is marked as blocker but also completed`);
      }
    }

  } catch (error) {
    healthCheck.database = false;
    healthCheck.dataConsistency = false;
    healthCheck.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return healthCheck;
}

/**
 * Attempts to recover from incomplete operations
 * Fixes data inconsistencies and completes partial operations
 */
export async function recoverIncompleteOperations(
  state: SystemState, 
  incompleteOperations: string[]
): Promise<void> {
  console.log('Attempting to recover from incomplete operations...');

  // Demo mode - no recovery needed
  if (DEMO_MODE) {
    console.log('🎭 Demo Mode: Skipping recovery operations');
    return;
  }

  if (!supabase) {
    console.error('Supabase client not available for recovery operations');
    return;
  }

  for (const operation of incompleteOperations) {
    try {
      // Parse operation type and take corrective action
      if (operation.includes('has no tasks but status is')) {
        const onboardingId = operation.match(/Onboarding (\S+) has no tasks/)?.[1];
        if (onboardingId) {
          // Reset onboarding status to not_started if it has no tasks
          await supabase
            .from('onboardings')
            .update({ 
              status: 'not_started',
              current_stage: null 
            })
            .eq('id', onboardingId);
          
          console.log(`Reset onboarding ${onboardingId} status to not_started`);
        }
      }

      if (operation.includes('marked completed but has') && operation.includes('incomplete tasks')) {
        const onboardingId = operation.match(/Onboarding (\S+) marked completed/)?.[1];
        if (onboardingId) {
          // Reset onboarding status to in_progress if it has incomplete tasks
          await supabase
            .from('onboardings')
            .update({ 
              status: 'in_progress',
              completed_at: null 
            })
            .eq('id', onboardingId);
          
          console.log(`Reset onboarding ${onboardingId} status to in_progress due to incomplete tasks`);
        }
      }

      if (operation.includes('marked completed but missing completion timestamp')) {
        const taskId = operation.match(/Task (\S+) marked completed/)?.[1];
        if (taskId) {
          // Add completion timestamp to completed task
          await supabase
            .from('onboarding_tasks')
            .update({ completed_at: new Date().toISOString() })
            .eq('id', taskId);
          
          console.log(`Added completion timestamp to task ${taskId}`);
        }
      }

      if (operation.includes('is marked as blocker but also completed')) {
        const taskId = operation.match(/Task (\S+) is marked as blocker/)?.[1];
        if (taskId) {
          // Remove blocker flag from completed task
          await supabase
            .from('onboarding_tasks')
            .update({ 
              is_blocker: false,
              blocker_reason: null 
            })
            .eq('id', taskId);
          
          console.log(`Removed blocker flag from completed task ${taskId}`);
        }
      }

    } catch (error) {
      console.error(`Failed to recover from operation: ${operation}`, error);
    }
  }

  console.log('Recovery operations completed');
}

/**
 * Performs a quick health check of the system
 * Used for monitoring and health endpoints
 */
export async function performHealthCheck(): Promise<SystemHealthCheck> {
  try {
    // Demo mode - always return healthy
    if (DEMO_MODE) {
      return {
        database: true,
        dataConsistency: true,
        incompleteOperations: [],
        errors: []
      };
    }

    if (!supabase) {
      return {
        database: false,
        dataConsistency: false,
        incompleteOperations: [],
        errors: ['Supabase client not available']
      };
    }

    // Quick database connectivity test
    const { error: dbError } = await supabase.from('customers').select('count').limit(1);
    
    const healthCheck: SystemHealthCheck = {
      database: !dbError,
      dataConsistency: true, // Assume true for quick check
      incompleteOperations: [],
      errors: dbError ? [`Database: ${dbError.message}`] : []
    };

    return healthCheck;
  } catch (error) {
    return {
      database: false,
      dataConsistency: false,
      incompleteOperations: [],
      errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}