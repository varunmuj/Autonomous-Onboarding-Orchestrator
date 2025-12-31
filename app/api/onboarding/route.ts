import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_name, contract_start_date } = body;

    if (!customer_name || !contract_start_date) {
// Trigger n8n workflow
await fetch(process.env.N8N_WEBHOOK_URL!, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    onboarding_id: onboarding.id,
  }),
});
      
return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: customer_name,
        contract_start_date,
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. Create onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from("onboardings")
      .insert({
        customer_id: customer.id,
      })
      .select()
      .single();

    if (onboardingError) throw onboardingError;

    // 3. Audit log
    await supabase.from("events_audit").insert({
      entity_type: "onboarding",
      entity_id: onboarding.id,
      event_type: "created",
      metadata: {
        customer_id: customer.id,
      },
    });

    return NextResponse.json({
      success: true,
      onboarding_id: onboarding.id,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

