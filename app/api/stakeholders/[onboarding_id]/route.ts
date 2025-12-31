import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Stakeholder } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ onboarding_id: string }> }
): Promise<NextResponse<Stakeholder[] | { error: string }>> {
  try {
    const { onboarding_id } = await params;

    if (!onboarding_id) {
      return NextResponse.json(
        { error: "Missing onboarding_id parameter" },
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

    // Get stakeholders for this onboarding
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from("stakeholders")
      .select("*")
      .eq("onboarding_id", onboarding_id)
      .order("created_at", { ascending: true });

    if (stakeholdersError) throw stakeholdersError;

    return NextResponse.json(stakeholders || []);
  } catch (err: any) {
    console.error("Stakeholders retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}