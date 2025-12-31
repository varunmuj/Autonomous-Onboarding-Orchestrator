import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "@/lib/demo-data";
import { findTasksNeedingEscalation, getBlockerEscalationRecipients } from "@/lib/escalation-logic";
import { notifyStakeholdersAboutEscalation, notifyStakeholdersAboutBlocker } from "@/lib/notification-system";
import { OnboardingTask, Stakeholder } from "@/lib/types";
import { createAuditRecord } from "@/lib/audit-trail";

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { onboarding_id, check_type = 'all' } = body;

    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Escalation check simulated");
      return NextResponse.json({ 
        success: true, 
        escalations_triggered: 0,
        message: "Demo mode - no actual escalations triggered"
      });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    let escalationsTriggered = 0;
    const results: any[] = [];

    if (onboarding_id) {
      // Check specific onboarding
      const result = await processOnboardingEscalations(onboarding_id);
      escalationsTriggered += result.escalationsTriggered;
      results.push(result);
    } else {
      // Check all active onboardings
      const { data: onboardings, error } = await supabase
        .from("onboardings")
        .select("id")
        .in("status", ["in_progress", "blocked"]);

      if (error) throw error;

      for (const onboarding of onboardings) {
        const result = await processOnboardingEscalations(onboarding.id);
        escalationsTriggered += result.escalationsTriggered;
        results.push(result);
      }
    }

    return NextResponse.json({ 
      success: true, 
      escalations_triggered: escalationsTriggered,
      results
    });
  } catch (err: any) {
    console.error("Escalation processing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processOnboardingEscalations(onboardingId: string): Promise<{
  onboarding_id: string;
  escalationsTriggered: number;
  errors: string[];
}> {
  if (!supabase) {
    return {
      onboarding_id: onboardingId,
      escalationsTriggered: 0,
      errors: ["Database not configured"]
    };
  }

  const errors: string[] = [];
  let escalationsTriggered = 0;

  try {
    // Get all tasks for this onboarding
    const { data: tasks, error: tasksError } = await supabase
      .from("onboarding_tasks")
      .select("*")
      .eq("onboarding_id", onboardingId)
      .neq("status", "completed");

    if (tasksError) throw tasksError;

    // Get stakeholders for this onboarding
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from("stakeholders")
      .select("*")
      .eq("onboarding_id", onboardingId);

    if (stakeholdersError) throw stakeholdersError;

    // Get customer info for notifications
    const { data: onboarding, error: onboardingError } = await supabase
      .from("onboardings")
      .select(`
        *,
        customers (
          name
        )
      `)
      .eq("id", onboardingId)
      .single();

    if (onboardingError) throw onboardingError;

    const customerName = onboarding.customers?.name || "Unknown Customer";

    // Check for overdue tasks that need escalation
    const tasksNeedingEscalation = findTasksNeedingEscalation(tasks as OnboardingTask[]);

    for (const { task, escalationResult } of tasksNeedingEscalation) {
      try {
        // Send escalation notification
        const notificationResult = await notifyStakeholdersAboutEscalation(
          task,
          escalationResult,
          stakeholders as Stakeholder[],
          customerName
        );

        if (notificationResult.success) {
          // Comprehensive escalation audit log
          await createAuditRecord({
            entity_type: 'escalation',
            entity_id: task.id,
            event_type: 'escalation_triggered',
            metadata: {
              escalation_type: 'task_overdue',
              escalation_reason: escalationResult.escalationReason,
              days_overdue: escalationResult.daysOverdue,
              escalated_to: escalationResult.escalateTo,
              urgency_level: escalationResult.urgencyLevel,
              onboarding_id: onboardingId,
              customer_name: customerName,
              task_type: task.task_type,
              task_title: task.title,
              owner_role: task.owner_role,
              assigned_to: task.assigned_to,
              source: 'system',
              trigger: 'automated',
            }
          });

          escalationsTriggered++;
        } else {
          errors.push(`Failed to escalate task ${task.id}: ${notificationResult.error}`);
        }
      } catch (escalationError) {
        errors.push(`Error escalating task ${task.id}: ${escalationError}`);
      }
    }

    // Check for blocked tasks that need escalation notifications
    const blockedTasks = tasks.filter((task: OnboardingTask) => task.is_blocker);

    for (const task of blockedTasks) {
      try {
        // Check if we've already sent a blocker notification recently
        const { data: recentEscalations, error: escalationCheckError } = await supabase
          .from("events_audit")
          .select("created_at")
          .eq("entity_type", "escalation")
          .eq("entity_id", task.id)
          .eq("event_type", "blocker_escalated")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order("created_at", { ascending: false })
          .limit(1);

        if (escalationCheckError) throw escalationCheckError;

        // Only escalate if no recent escalation
        if (recentEscalations.length === 0) {
          const { escalateTo } = getBlockerEscalationRecipients(
            task as OnboardingTask,
            stakeholders as Stakeholder[]
          );

          const notificationResult = await notifyStakeholdersAboutBlocker(
            task as OnboardingTask,
            stakeholders as Stakeholder[],
            customerName,
            escalateTo
          );

          if (notificationResult.success) {
            // Comprehensive blocker escalation audit log
            await createAuditRecord({
              entity_type: 'escalation',
              entity_id: task.id,
              event_type: 'escalation_triggered',
              metadata: {
                escalation_type: 'blocker',
                blocker_reason: task.blocker_reason,
                escalated_to: escalateTo,
                onboarding_id: onboardingId,
                customer_name: customerName,
                task_type: task.task_type,
                task_title: task.title,
                owner_role: task.owner_role,
                assigned_to: task.assigned_to,
                source: 'system',
                trigger: 'automated',
              }
            });

            escalationsTriggered++;
          } else {
            errors.push(`Failed to escalate blocker ${task.id}: ${notificationResult.error}`);
          }
        }
      } catch (blockerError) {
        errors.push(`Error escalating blocker ${task.id}: ${blockerError}`);
      }
    }

  } catch (error) {
    errors.push(`General error processing onboarding ${onboardingId}: ${error}`);
  }

  return {
    onboarding_id: onboardingId,
    escalationsTriggered,
    errors
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const onboardingId = searchParams.get('onboarding_id');

    if (DEMO_MODE) {
      return NextResponse.json({
        escalations: [
          {
            id: "demo-escalation-1",
            task_id: "demo-task-1",
            escalation_type: "overdue",
            days_overdue: 3,
            urgency_level: "high",
            created_at: new Date().toISOString()
          }
        ]
      });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    let query = supabase
      .from("events_audit")
      .select("*")
      .eq("entity_type", "escalation")
      .in("event_type", ["task_escalated", "blocker_escalated"])
      .order("created_at", { ascending: false });

    if (onboardingId) {
      query = query.eq("metadata->onboarding_id", onboardingId);
    }

    const { data: escalations, error } = await query;

    if (error) throw error;

    return NextResponse.json({ escalations });
  } catch (err: any) {
    console.error("Escalations retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}