import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Stakeholder } from "@/lib/types";
import { auditStakeholderCreated } from "@/lib/audit-trail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request): Promise<NextResponse<Stakeholder | { error: string }>> {
  try {
    const body = await req.json();
    const { 
      onboarding_id, 
      role, 
      name, 
      email, 
      phone, 
      responsibilities 
    } = body;

    if (!onboarding_id || !role || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: onboarding_id, role, name, email" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'it_contact', 'project_manager', 'technical_lead'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Create stakeholder
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from("stakeholders")
      .insert({
        onboarding_id,
        role,
        name,
        email,
        phone,
        responsibilities: responsibilities || []
      })
      .select()
      .single();

    if (stakeholderError) throw stakeholderError;

    // Comprehensive audit log
    await auditStakeholderCreated(stakeholder.id, {
      onboarding_id,
      role,
      name,
      email,
      phone,
      responsibilities: responsibilities || [],
      source: 'api',
      trigger: 'user_action',
    });

    return NextResponse.json(stakeholder);
  } catch (err: any) {
    console.error("Stakeholder creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}