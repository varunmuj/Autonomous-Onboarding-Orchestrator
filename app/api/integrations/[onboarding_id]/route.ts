import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Integration } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ onboarding_id: string }> }
): Promise<NextResponse<Integration[] | { error: string }>> {
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

    // Get integrations for this onboarding
    const { data: integrations, error: integrationsError } = await supabase
      .from("integrations")
      .select("*")
      .eq("onboarding_id", onboarding_id)
      .order("created_at", { ascending: true });

    if (integrationsError) throw integrationsError;

    return NextResponse.json(integrations || []);
  } catch (err: any) {
    console.error("Integrations retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}