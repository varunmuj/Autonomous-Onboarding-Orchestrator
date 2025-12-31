import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Integration } from "@/lib/types";
import { auditIntegrationCreated } from "@/lib/audit-trail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request): Promise<NextResponse<Integration | { error: string }>> {
  try {
    const body = await req.json();
    const { 
      onboarding_id, 
      type, 
      name, 
      configuration 
    } = body;

    if (!onboarding_id || !type || !name) {
      return NextResponse.json(
        { error: "Missing required fields: onboarding_id, type, name" },
        { status: 400 }
      );
    }

    // Validate integration type
    const validTypes = ['SIS', 'CRM', 'SFTP', 'API', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid integration type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify onboarding exists
    const { data: onboarding, error: onboardingError } = await supabase
      .from("onboardings")
      .select("id")
      .eq("id", onboarding_id)
      .single();

    if (onboardingError || !onboarding) {
      return NextResponse.json(
        { error: "Onboarding not found" },
        { status: 404 }
      );
    }

    // Create integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .insert({
        onboarding_id,
        type,
        name,
        configuration: configuration || {},
        status: 'not_configured'
      })
      .select()
      .single();

    if (integrationError) throw integrationError;

    // Comprehensive audit log
    await auditIntegrationCreated(integration.id, {
      onboarding_id,
      integration_type: type,
      integration_name: name,
      status: 'not_configured',
      configuration_provided: !!configuration,
      source: 'api',
      trigger: 'user_action',
    });

    return NextResponse.json(integration);
  } catch (err: any) {
    console.error("Integration creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}