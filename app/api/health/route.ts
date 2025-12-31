import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(): Promise<NextResponse> {
  const healthCheck: {
    status: string;
    timestamp: string;
    version: string;
    services: {
      database: { status: string; responseTime: number; error?: string };
      n8n: { status: string; responseTime: number; error?: string };
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "3.0.0",
    services: {
      database: { status: "unknown", responseTime: 0 },
      n8n: { status: "unknown", responseTime: 0 }
    }
  };

  try {
    // Test database connectivity
    const dbStart = Date.now();
    const { data, error } = await supabase
      .from("customers")
      .select("count")
      .limit(1);
    
    const dbResponseTime = Date.now() - dbStart;
    
    if (error) {
      healthCheck.services.database = {
        status: "unhealthy",
        responseTime: dbResponseTime,
        error: error.message
      };
      healthCheck.status = "degraded";
    } else {
      healthCheck.services.database = {
        status: "healthy",
        responseTime: dbResponseTime
      };
    }

    // Test n8n connectivity (if configured)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL.replace('/webhook/', '/healthz'), {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const n8nResponseTime = Date.now() - n8nStart;

        if (n8nResponse.ok) {
          healthCheck.services.n8n = {
            status: "healthy",
            responseTime: n8nResponseTime
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
        responseTime: 0
      };
    }

    // Determine overall status
    const hasUnhealthyServices = Object.values(healthCheck.services)
      .some((service: any) => service.status === "unhealthy");
    
    if (hasUnhealthyServices) {
      healthCheck.status = "unhealthy";
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
      services: healthCheck.services
    }, { status: 503 });
  }
}