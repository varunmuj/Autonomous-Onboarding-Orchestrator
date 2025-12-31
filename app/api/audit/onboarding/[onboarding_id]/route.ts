import { NextResponse } from "next/server";
import { getOnboardingAuditTrail } from "@/lib/audit-trail";

/**
 * GET /api/audit/onboarding/[onboarding_id] - Get complete audit trail for an onboarding
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ onboarding_id: string }> }
): Promise<NextResponse> {
  try {
    const { onboarding_id } = await params;

    if (!onboarding_id) {
      return NextResponse.json(
        { error: "Missing onboarding_id parameter" },
        { status: 400 }
      );
    }

    const auditRecords = await getOnboardingAuditTrail(onboarding_id);

    return NextResponse.json({
      onboarding_id,
      audit_records: auditRecords,
      count: auditRecords.length
    });
  } catch (err: any) {
    console.error("Onboarding audit trail error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve onboarding audit trail", details: err.message },
      { status: 500 }
    );
  }
}