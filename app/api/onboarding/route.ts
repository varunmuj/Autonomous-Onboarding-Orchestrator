import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateOnboardingRequest, CreateOnboardingResponse } from "@/lib/types";
import { DEMO_MODE, createDemoOnboarding } from "@/lib/demo-data";
import { 
  auditCustomerCreated, 
  auditOnboardingCreated, 
  auditStakeholderCreated, 
  auditIntegrationCreated,
  createAuditRecords 
} from "@/lib/audit-trail";

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

export async function POST(req: Request): Promise<NextResponse<CreateOnboardingResponse | { error: string }>> {
  try {
    const body: CreateOnboardingRequest = await req.json();
    const { 
      customer_name, 
      contract_start_date, 
      contact_email, 
      industry, 
      size, 
      go_live_date,
      stakeholders = [],
      integrations = []
    } = body;

    if (!customer_name || !contract_start_date) {
      return NextResponse.json(
        { error: "Missing required fields: customer_name and contract_start_date" },
        { status: 400 }
      );
    }

    // Validate go_live_date is in the future if provided
    if (go_live_date) {
      const goLiveDate = new Date(go_live_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      
      if (isNaN(goLiveDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid go-live date format" },
          { status: 400 }
        );
      }
      
      if (goLiveDate <= today) {
        return NextResponse.json(
          { error: "Go-live date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Demo mode - use mock data
    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Creating onboarding with mock data");
      const result = createDemoOnboarding(body);
      return NextResponse.json(result);
    }

    // Production mode - use Supabase
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 1. Create customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: customer_name,
        contract_start_date,
        contact_email,
        industry,
        size,
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. Create onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from("onboardings")
      .insert({
        customer_id: customer.id,
        go_live_date,
      })
      .select()
      .single();

    if (onboardingError) throw onboardingError;

    // 3. Create stakeholders if provided
    if (stakeholders.length > 0) {
      const stakeholderData = stakeholders.map(stakeholder => ({
        ...stakeholder,
        onboarding_id: onboarding.id,
      }));

      const { error: stakeholderError } = await supabase
        .from("stakeholders")
        .insert(stakeholderData);

      if (stakeholderError) throw stakeholderError;
    }

    // 4. Create integrations if provided
    if (integrations.length > 0) {
      const integrationData = integrations.map(integration => ({
        ...integration,
        onboarding_id: onboarding.id,
      }));

      const { error: integrationError } = await supabase
        .from("integrations")
        .insert(integrationData);

      if (integrationError) throw integrationError;
    }

    // 5. Comprehensive audit logging
    const auditRecords: any[] = [
      // Customer creation audit
      {
        entity_type: 'customer' as const,
        entity_id: customer.id,
        event_type: 'customer_created' as const,
        metadata: {
          customer_name: customer.name,
          contract_start_date,
          contact_email,
          industry,
          size,
          source: 'api' as const,
          trigger: 'user_action' as const,
          onboarding_id: onboarding.id,
        }
      },
      // Onboarding creation audit
      {
        entity_type: 'onboarding' as const,
        entity_id: onboarding.id,
        event_type: 'onboarding_created' as const,
        metadata: {
          customer_id: customer.id,
          customer_name: customer.name,
          go_live_date,
          stakeholder_count: stakeholders.length,
          integration_count: integrations.length,
          source: 'api' as const,
          trigger: 'user_action' as const,
        }
      }
    ];

    // Add stakeholder audit records
    if (stakeholders.length > 0) {
      const { data: createdStakeholders } = await supabase
        .from("stakeholders")
        .select("id, role, name, email")
        .eq("onboarding_id", onboarding.id);

      if (createdStakeholders) {
        createdStakeholders.forEach((stakeholder, index) => {
          auditRecords.push({
            entity_type: 'stakeholder' as const,
            entity_id: stakeholder.id,
            event_type: 'stakeholder_created' as const,
            metadata: {
              onboarding_id: onboarding.id,
              customer_id: customer.id,
              role: stakeholder.role,
              name: stakeholder.name,
              email: stakeholder.email,
              source: 'api' as const,
              trigger: 'user_action' as const,
            }
          });
        });
      }
    }

    // Add integration audit records
    if (integrations.length > 0) {
      const { data: createdIntegrations } = await supabase
        .from("integrations")
        .select("id, type, name, status")
        .eq("onboarding_id", onboarding.id);

      if (createdIntegrations) {
        createdIntegrations.forEach((integration, index) => {
          auditRecords.push({
            entity_type: 'integration' as const,
            entity_id: integration.id,
            event_type: 'integration_created' as const,
            metadata: {
              onboarding_id: onboarding.id,
              customer_id: customer.id,
              integration_type: integration.type,
              integration_name: integration.name,
              status: integration.status,
              source: 'api' as const,
              trigger: 'user_action' as const,
            }
          });
        });
      }
    }

    // Create all audit records in batch
    await createAuditRecords(auditRecords);

    // 6. Trigger n8n workflow with enhanced payload
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            onboarding_id: onboarding.id,
            customer_id: customer.id,
            customer_name: customer.name,
            go_live_date: onboarding.go_live_date,
            stakeholders: stakeholders,
            integrations: integrations,
            customer_size: customer.size,
            industry: customer.industry,
          }),
        });
      } catch (n8nError) {
        console.error("Failed to trigger n8n workflow:", n8nError);
        // Don't fail the request if n8n webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      onboarding_id: onboarding.id,
      customer_id: customer.id,
    });
  } catch (err: any) {
    console.error("Onboarding creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

