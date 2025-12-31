import { NextResponse } from "next/server";
import { 
  queryAuditTrail, 
  generateAuditSummary, 
  getOnboardingAuditTrail, 
  getEntityAuditTrail,
  AuditQueryFilters,
  AuditEntityType 
} from "@/lib/audit-trail";

/**
 * GET /api/audit - Query audit trail with filters
 * 
 * Query parameters:
 * - entity_type: Filter by entity type
 * - entity_id: Filter by specific entity ID
 * - event_type: Filter by event type
 * - onboarding_id: Filter by onboarding ID
 * - customer_id: Filter by customer ID
 * - date_from: Filter events from this date (ISO string)
 * - date_to: Filter events to this date (ISO string)
 * - source: Filter by source (api, ui, n8n, system, external)
 * - limit: Maximum number of records (default: 100)
 * - offset: Number of records to skip (default: 0)
 * - summary: If 'true', return summary report instead of records
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    
    // Check if summary report is requested
    const summaryRequested = searchParams.get('summary') === 'true';
    
    // Build filters from query parameters
    const filters: AuditQueryFilters = {};
    
    if (searchParams.get('entity_type')) {
      filters.entity_type = searchParams.get('entity_type') as AuditEntityType;
    }
    
    if (searchParams.get('entity_id')) {
      filters.entity_id = searchParams.get('entity_id')!;
    }
    
    if (searchParams.get('event_type')) {
      filters.event_type = searchParams.get('event_type') as any;
    }
    
    if (searchParams.get('onboarding_id')) {
      filters.onboarding_id = searchParams.get('onboarding_id')!;
    }
    
    if (searchParams.get('customer_id')) {
      filters.customer_id = searchParams.get('customer_id')!;
    }
    
    if (searchParams.get('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }
    
    if (searchParams.get('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }
    
    if (searchParams.get('source')) {
      filters.source = searchParams.get('source')!;
    }
    
    if (searchParams.get('limit')) {
      const limit = parseInt(searchParams.get('limit')!);
      if (limit > 0 && limit <= 1000) {
        filters.limit = limit;
      }
    }
    
    if (searchParams.get('offset')) {
      const offset = parseInt(searchParams.get('offset')!);
      if (offset >= 0) {
        filters.offset = offset;
      }
    }

    // Return summary or detailed records
    if (summaryRequested) {
      const summary = await generateAuditSummary(filters);
      return NextResponse.json({ summary });
    } else {
      const auditRecords = await queryAuditTrail(filters);
      return NextResponse.json({ 
        audit_records: auditRecords,
        count: auditRecords.length,
        filters: filters
      });
    }
  } catch (err: any) {
    console.error("Audit trail query error:", err);
    return NextResponse.json(
      { error: "Failed to query audit trail", details: err.message },
      { status: 500 }
    );
  }
}