import { NextResponse } from "next/server";
import { getEntityAuditTrail, AuditEntityType } from "@/lib/audit-trail";

/**
 * GET /api/audit/entity/[entity_type]/[entity_id] - Get audit trail for a specific entity
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ entity_type: string; entity_id: string }> }
): Promise<NextResponse> {
  try {
    const { entity_type, entity_id } = await params;

    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: "Missing entity_type or entity_id parameter" },
        { status: 400 }
      );
    }

    // Validate entity type
    const validEntityTypes = [
      'customer', 'onboarding', 'task', 'stakeholder', 
      'integration', 'blocker', 'escalation', 'system'
    ];
    
    if (!validEntityTypes.includes(entity_type)) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const auditRecords = await getEntityAuditTrail(entity_type as AuditEntityType, entity_id);

    return NextResponse.json({
      entity_type,
      entity_id,
      audit_records: auditRecords,
      count: auditRecords.length
    });
  } catch (err: any) {
    console.error("Entity audit trail error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve entity audit trail", details: err.message },
      { status: 500 }
    );
  }
}