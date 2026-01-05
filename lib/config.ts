// Environment configuration management for the Autonomous Onboarding Orchestrator
// Handles environment-based configuration, validation, and runtime updates

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}

export interface N8nConfig {
  webhookUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface SystemConfig {
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  n8n: N8nConfig;
  features: {
    realTimeUpdates: boolean;
    auditLogging: boolean;
    autoRecovery: boolean;
    healthChecks: boolean;
  };
  limits: {
    maxConcurrentOnboardings: number;
    taskReminderDays: number;
    escalationDays: number;
    healthCheckInterval: number;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Default configuration values
const DEFAULT_CONFIG: Partial<SystemConfig> = {
  features: {
    realTimeUpdates: true,
    auditLogging: true,
    autoRecovery: true,
    healthChecks: true,
  },
  limits: {
    maxConcurrentOnboardings: 100,
    taskReminderDays: 2,
    escalationDays: 5,
    healthCheckInterval: 30000, // 30 seconds
  },
};

let currentConfig: SystemConfig | null = null;
let configListeners: Array<(config: SystemConfig) => void> = [];

/**
 * Loads and validates system configuration from environment variables
 * Supports different environments with appropriate defaults
 */
export function loadConfiguration(): SystemConfig {
  const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
  
  const config: SystemConfig = {
    environment,
    database: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    n8n: {
      webhookUrl: process.env.N8N_WEBHOOK_URL || '',
      apiKey: process.env.N8N_API_KEY,
      timeout: parseInt(process.env.N8N_TIMEOUT || '30000', 10),
    },
    features: {
      realTimeUpdates: process.env.ENABLE_REALTIME_UPDATES !== 'false',
      auditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      autoRecovery: process.env.ENABLE_AUTO_RECOVERY !== 'false',
      healthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    },
    limits: {
      maxConcurrentOnboardings: parseInt(process.env.MAX_CONCURRENT_ONBOARDINGS || '100', 10),
      taskReminderDays: parseInt(process.env.TASK_REMINDER_DAYS || '2', 10),
      escalationDays: parseInt(process.env.ESCALATION_DAYS || '5', 10),
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    },
  };

  // Apply defaults for missing values
  Object.assign(config.features, { ...DEFAULT_CONFIG.features, ...config.features });
  Object.assign(config.limits, { ...DEFAULT_CONFIG.limits, ...config.limits });

  // Validate configuration
  const validation = validateConfiguration(config);
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:', validation.warnings);
  }

  currentConfig = config;
  
  // Notify listeners of configuration change
  configListeners.forEach(listener => {
    try {
      listener(config);
    } catch (error) {
      console.error('Error in config listener:', error);
    }
  });

  console.log(`Configuration loaded for ${environment} environment`);
  return config;
}

/**
 * Validates system configuration for completeness and correctness
 * Returns detailed validation results with errors and warnings
 */
export function validateConfiguration(config: SystemConfig): ConfigValidationResult {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate required database configuration
  if (!config.database.supabaseUrl) {
    result.errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    result.isValid = false;
  } else if (!config.database.supabaseUrl.startsWith('https://')) {
    result.errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
    result.isValid = false;
  }

  if (!config.database.supabaseAnonKey) {
    result.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    result.isValid = false;
  }

  // Validate n8n configuration
  if (!config.n8n.webhookUrl) {
    result.errors.push('N8N_WEBHOOK_URL is required');
    result.isValid = false;
  } else if (!config.n8n.webhookUrl.startsWith('http')) {
    result.errors.push('N8N_WEBHOOK_URL must be a valid HTTP/HTTPS URL');
    result.isValid = false;
  }

  if (config.n8n.timeout < 1000) {
    result.warnings.push('N8N_TIMEOUT is very low (< 1000ms), may cause timeouts');
  }

  // Validate limits
  if (config.limits.maxConcurrentOnboardings < 1) {
    result.errors.push('MAX_CONCURRENT_ONBOARDINGS must be at least 1');
    result.isValid = false;
  }

  if (config.limits.taskReminderDays < 0) {
    result.errors.push('TASK_REMINDER_DAYS must be non-negative');
    result.isValid = false;
  }

  if (config.limits.escalationDays < config.limits.taskReminderDays) {
    result.warnings.push('ESCALATION_DAYS is less than TASK_REMINDER_DAYS, tasks may escalate before reminders');
  }

  if (config.limits.healthCheckInterval < 5000) {
    result.warnings.push('HEALTH_CHECK_INTERVAL is very low (< 5000ms), may impact performance');
  }

  // Environment-specific validations
  if (config.environment === 'production') {
    if (!config.database.supabaseServiceRoleKey) {
      result.warnings.push('SUPABASE_SERVICE_ROLE_KEY not set in production environment');
    }
    
    if (!config.n8n.apiKey) {
      result.warnings.push('N8N_API_KEY not set in production environment');
    }

    if (config.limits.maxConcurrentOnboardings > 1000) {
      result.warnings.push('MAX_CONCURRENT_ONBOARDINGS is very high for production');
    }
  }

  return result;
}

/**
 * Gets the current system configuration
 * Loads configuration if not already loaded
 */
export function getConfiguration(): SystemConfig {
  if (!currentConfig) {
    return loadConfiguration();
  }
  return currentConfig;
}

/**
 * Reloads configuration from environment variables
 * Useful for configuration updates without restart
 */
export function reloadConfiguration(): SystemConfig {
  console.log('Reloading system configuration...');
  return loadConfiguration();
}

/**
 * Registers a listener for configuration changes
 * Listener will be called whenever configuration is reloaded
 */
export function onConfigurationChange(listener: (config: SystemConfig) => void): () => void {
  configListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = configListeners.indexOf(listener);
    if (index > -1) {
      configListeners.splice(index, 1);
    }
  };
}

/**
 * Gets configuration for a specific environment
 * Useful for testing and development
 */
export function getEnvironmentConfig(environment: 'development' | 'staging' | 'production'): Partial<SystemConfig> {
  const baseConfig = {
    development: {
      features: {
        realTimeUpdates: true,
        auditLogging: true,
        autoRecovery: true,
        healthChecks: true,
      },
      limits: {
        maxConcurrentOnboardings: 10,
        taskReminderDays: 1,
        escalationDays: 2,
        healthCheckInterval: 10000,
      },
    },
    staging: {
      features: {
        realTimeUpdates: true,
        auditLogging: true,
        autoRecovery: true,
        healthChecks: true,
      },
      limits: {
        maxConcurrentOnboardings: 50,
        taskReminderDays: 2,
        escalationDays: 3,
        healthCheckInterval: 20000,
      },
    },
    production: {
      features: {
        realTimeUpdates: true,
        auditLogging: true,
        autoRecovery: true,
        healthChecks: true,
      },
      limits: {
        maxConcurrentOnboardings: 100,
        taskReminderDays: 2,
        escalationDays: 5,
        healthCheckInterval: 30000,
      },
    },
  };

  return baseConfig[environment];
}

/**
 * Updates configuration at runtime
 * Validates changes before applying them
 */
export function updateConfiguration(updates: Partial<SystemConfig>): ConfigValidationResult {
  if (!currentConfig) {
    throw new Error('Configuration not loaded. Call loadConfiguration() first.');
  }

  // Create updated configuration
  const updatedConfig = { ...currentConfig, ...updates };
  
  // Validate the updated configuration
  const validation = validateConfiguration(updatedConfig);
  
  if (validation.isValid) {
    currentConfig = updatedConfig;
    
    // Notify listeners
    configListeners.forEach(listener => {
      try {
        listener(updatedConfig);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
    
    console.log('Configuration updated successfully');
  }
  
  return validation;
}