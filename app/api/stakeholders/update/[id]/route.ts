import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Stakeholder } from "@/lib/types";
import { auditStakeholderUpdated } from "@/lib/audit-trail";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<Stakeholder | { error: string }>> {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      role, 
      name, 
      email, 
      phone, 
      responsibilities 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing stakeholder ID parameter" },
        { status: 400 }
      );
    }

    // Verify stakeholder exists
    const { data: existingStakeholder, error: existingError } = await supabase
      .from("stakeholders")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existingStakeholder) {
      return NextResponse.json(
        { error: "Stakeholder not found" },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['owner', 'it_contact', 'project_manager', 'technical_lead'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData: Partial<Stakeholder> = {};
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;

    // Update stakeholder
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from("stakeholders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (stakeholderError) throw stakeholderError;

    // Comprehensive audit log
    await auditStakeholderUpdated(stakeholder.id, {
      onboarding_id: stakeholder.onboarding_id,
      changed_fields: Object.keys(updateData),
      previous_value: {
        role: existingStakeholder.role,
        name: existingStakeholder.name,
        email: existingStakeholder.email,
        phone: existingStakeholder.phone,
        responsibilities: existingStakeholder.responsibilities
      },
      new_value: {
        role: stakeholder.role,
        name: stakeholder.name,
        email: stakeholder.email,
        phone: stakeholder.phone,
        responsibilities: stakeholder.responsibilities
      },
      source: 'api',
      trigger: 'user_action',
    });

    return NextResponse.json(stakeholder);
  } catch (err: any) {
    console.error("Stakeholder update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}