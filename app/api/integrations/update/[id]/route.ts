import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Integration } from "@/lib/types";
import { auditIntegrationTested, createAuditRecord } from "@/lib/audit-trail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<Integration | { error: string }>> {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      type, 
      name, 
      configuration, 
      status,
      test_results 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing integration ID parameter" },
        { status: 400 }
      );
    }

    // Verify integration exists
    const { data: existingIntegration, error: existingError } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Validate integration type if provided
    if (type) {
      const validTypes = ['SIS', 'CRM', 'SFTP', 'API', 'other'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid integration type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['not_configured', 'configured', 'testing', 'active', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData: Partial<Integration> = {};
    if (type !== undefined) updateData.type = type;
    if (name !== undefined) updateData.name = name;
    if (configuration !== undefined) updateData.configuration = configuration;
    if (status !== undefined) updateData.status = status;
    if (test_results !== undefined) updateData.test_results = test_results;

    // Update integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (integrationError) throw integrationError;

    // Comprehensive audit log based on what changed
    const auditMetadata = {
      onboarding_id: integration.onboarding_id,
      changed_fields: Object.keys(updateData),
      previous_value: {
        type: existingIntegration.type,
        name: existingIntegration.name,
        configuration: existingIntegration.configuration,
        status: existingIntegration.status,
        test_results: existingIntegration.test_results
      },
      new_value: {
        type: integration.type,
        name: integration.name,
        configuration: integration.configuration,
        status: integration.status,
        test_results: integration.test_results
      },
      source: 'api' as const,
      trigger: 'user_action' as const,
    };

    // Create specific audit record based on status change
    if (status && status !== existingIntegration.status) {
      let eventType: string;
      switch (status) {
        case 'configured':
          eventType = 'integration_configured';
          break;
        case 'testing':
          eventType = 'integration_tested';
          break;
        case 'active':
          eventType = 'integration_activated';
          break;
        case 'failed':
          eventType = 'integration_failed';
          break;
        default:
          eventType = 'integration_updated';
      }

      await createAuditRecord({
        entity_type: 'integration',
        entity_id: integration.id,
        event_type: eventType as any,
        metadata: auditMetadata
      });
    } else {
      // General update audit
      await createAuditRecord({
        entity_type: 'integration',
        entity_id: integration.id,
        event_type: 'integration_updated' as any,
        metadata: auditMetadata
      });
    }

    return NextResponse.json(integration);
  } catch (err: any) {
    console.error("Integration update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}