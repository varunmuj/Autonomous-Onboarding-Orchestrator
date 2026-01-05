// System initialization module for the Autonomous Onboarding Orchestrator
// Handles application startup, configuration loading, and system state recovery

import { loadConfiguration, onConfigurationChange } from './config';
import { initializeSystemState, SystemState } from './system-state';

let isInitialized = false;
let systemState: SystemState | null = null;

/**
 * Initializes the entire system on application startup
 * Loads configuration, validates system state, and performs recovery if needed
 */
export async function initializeSystem(): Promise<{
  success: boolean;
  config: any;
  systemState: SystemState | null;
  errors: string[];
}> {
  const result = {
    success: false,
    config: null as any,
    systemState: null as SystemState | null,
    errors: [] as string[]
  };

  try {
    console.log('Starting system initialization...');

    // Step 1: Load and validate configuration
    console.log('Loading system configuration...');
    const config = loadConfiguration();
    result.config = config;
    console.log(`Configuration loaded for ${config.environment} environment`);

    // Step 2: Initialize system state from database
    console.log('Initializing system state...');
    systemState = await initializeSystemState();
    result.systemState = systemState;

    if (!systemState.isHealthy) {
      result.errors.push('System state is not healthy after initialization');
      console.warn('System initialized but health check failed');
    }

    // Step 3: Set up configuration change listeners
    onConfigurationChange((newConfig) => {
      console.log('Configuration changed, updating system...');
      // Could trigger system state refresh here if needed
    });

    isInitialized = true;
    result.success = true;
    
    console.log('System initialization completed successfully');
    console.log(`Loaded: ${systemState.customers.length} customers, ${systemState.onboardings.length} onboardings, ${systemState.tasks.length} tasks`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    result.errors.push(errorMessage);
    console.error('System initialization failed:', error);
  }

  return result;
}

/**
 * Gets the current system state
 * Throws error if system is not initialized
 */
export function getSystemState(): SystemState {
  if (!isInitialized || !systemState) {
    throw new Error('System not initialized. Call initializeSystem() first.');
  }
  return systemState;
}

/**
 * Checks if the system has been initialized
 */
export function isSystemInitialized(): boolean {
  return isInitialized;
}

/**
 * Refreshes system state from database
 * Useful for manual refresh or after configuration changes
 */
export async function refreshSystemState(): Promise<SystemState> {
  if (!isInitialized) {
    throw new Error('System not initialized. Call initializeSystem() first.');
  }

  console.log('Refreshing system state...');
  systemState = await initializeSystemState();
  console.log('System state refreshed successfully');
  
  return systemState;
}

/**
 * Gracefully shuts down the system
 * Cleans up resources and connections
 */
export async function shutdownSystem(): Promise<void> {
  console.log('Shutting down system...');
  
  // Clear system state
  systemState = null;
  isInitialized = false;
  
  console.log('System shutdown completed');
}