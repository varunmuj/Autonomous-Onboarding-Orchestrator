import { NextResponse } from "next/server";
import { performHealthCheck } from "../../../lib/system-state";
import { getConfiguration, validateConfiguration } from "../../../lib/config";

export async function GET(): Promise<NextResponse> {
  try {
    // Get current configuration
    const config = getConfiguration();
    const configValidation = validateConfiguration(config);
    
    // Perform system health check
    const systemHealth = await performHealthCheck();
    
    const healthCheck = {
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      timestamp: new Date().toISOString(),
      version: "3.0.0",
      environment: config.environment,
      configuration: {
        isValid: configValidation.isValid,
        errors: configValidation.errors,
        warnings: configValidation.warnings
      },
      services: {
        database: {
          status: systemHealth.database ? "healthy" : "unhealthy",
          dataConsistency: systemHealth.dataConsistency,
          errors: systemHealth.errors
        },
        n8n: {
          status: "unknown" as "healthy" | "unhealthy" | "unknown" | "not_configured",
          responseTime: 0,
          error: undefined as string | undefined
        }
      },
      systemState: {
        incompleteOperations: systemHealth.incompleteOperations.length,
        autoRecoveryEnabled: config.features.autoRecovery
      }
    };

    // Test n8n connectivity if configured
    if (config.n8n.webhookUrl && config.n8n.webhookUrl !== '') {
      try {
        const n8nStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.n8n.timeout);
        
        // Try to reach n8n health endpoint
        const n8nHealthUrl = config.n8n.webhookUrl.replace('/webhook/', '/healthz');
        const n8nResponse = await fetch(n8nHealthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: config.n8n.apiKey ? { 'Authorization': `Bearer ${config.n8n.apiKey}` } : {}
        });
        
        clearTimeout(timeoutId);
        const n8nResponseTime = Date.now() - n8nStart;

        if (n8nResponse.ok) {
          healthCheck.services.n8n = {
            status: "healthy",
            responseTime: n8nResponseTime,
            error: undefined
          };
        } else {
          healthCheck.services.n8n = {
            status: "unhealthy",
            responseTime: n8nResponseTime,
            error: `HTTP ${n8nResponse.status}`
          };
          healthCheck.status = "degraded";
        }
      } catch (n8nError: any) {
        healthCheck.services.n8n = {
          status: "unhealthy",
          responseTime: 0,
          error: n8nError.message
        };
        healthCheck.status = "degraded";
      }
    } else {
      healthCheck.services.n8n = {
        status: "not_configured",
        responseTime: 0,
        error: "N8N_WEBHOOK_URL not configured"
      };
    }

    // Determine overall status
    if (!systemHealth.database || !systemHealth.dataConsistency || !configValidation.isValid) {
      healthCheck.status = "unhealthy";
    } else if (healthCheck.services.n8n.status === "unhealthy" || systemHealth.incompleteOperations.length > 0) {
      healthCheck.status = "degraded";
    }

    const statusCode = healthCheck.status === "healthy" ? 200 : 
                      healthCheck.status === "degraded" ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error: any) {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: "3.0.0",
      error: error.message,
      configuration: { isValid: false, errors: [error.message], warnings: [] }
    }, { status: 503 });
  }
}