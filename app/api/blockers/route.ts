import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "@/lib/demo-data";
import { auditBlockerCreated, auditBlockerResolved } from "@/lib/audit-trail";

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { 
      task_id, 
      onboarding_id, 
      blocker_reason, 
      impact_level = 'medium',
      reported_by 
    } = body;

    if (!task_id || !onboarding_id || !blocker_reason) {
      return NextResponse.json(
        { error: "Missing required fields: task_id, onboarding_id, blocker_reason" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Blocker creation simulated");
      return NextResponse.json({ 
        success: true, 
        blocker_id: `demo-blocker-${Date.now()}` 
      });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Update the task to mark it as blocked
    const { error: taskError } = await supabase
      .from("onboarding_tasks")
      .update({
        status: 'blocked',
        is_blocker: true,
        blocker_reason
      })
      .eq("id", task_id);

    if (taskError) throw taskError;

    // Update onboarding status to blocked if not already
    const { error: onboardingError } = await supabase
      .from("onboardings")
      .update({ status: 'blocked' })
      .eq("id", onboarding_id);

    if (onboardingError) throw onboardingError;

    // Create comprehensive audit log for blocker creation
    await auditBlockerCreated(task_id, {
      onboarding_id,
      blocker_reason,
      impact_level,
      reported_by,
      source: 'api',
      trigger: 'user_action',
    });

    // Trigger escalation workflow if configured
    if (process.env.N8N_ESCALATION_WEBHOOK_URL) {
      try {
        const { data: task } = await supabase
          .from("onboarding_tasks")
          .select("task_type, owner_role")
          .eq("id", task_id)
          .single();

        await fetch(process.env.N8N_ESCALATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id,
            onboarding_id,
            blocker_reason,
            impact_level,
            task_type: task?.task_type,
            owner_role: task?.owner_role,
          }),
        });
      } catch (escalationError) {
        console.error("Failed to trigger escalation workflow:", escalationError);
      }
    }

    return NextResponse.json({ success: true, task_id });
  } catch (err: any) {
    console.error("Blocker creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const onboardingId = searchParams.get('onboarding_id');

    if (!onboardingId) {
      return NextResponse.json(
        { error: "Missing onboarding_id parameter" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      // Return demo blockers
      const demoBlockers = [
        {
          id: "demo-blocker-1",
          task_id: "demo-task-1",
          onboarding_id: onboardingId,
          blocker_reason: "Waiting for customer IT approval",
          impact_level: "high",
          created_at: new Date().toISOString(),
          task: {
            title: "Set up SIS integration",
            task_type: "sis_setup",
            owner_role: "it_contact"
          }
        }
      ];
      return NextResponse.json({ blockers: demoBlockers });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: blockers, error } = await supabase
      .from("onboarding_tasks")
      .select(`
        id,
        task_type,
        title,
        blocker_reason,
        owner_role,
        assigned_to,
        created_at,
        due_date
      `)
      .eq("onboarding_id", onboardingId)
      .eq("is_blocker", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ blockers });
  } catch (err: any) {
    console.error("Blockers retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { task_id, action, resolution_notes } = body;

    if (!task_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: task_id and action" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Blocker resolution simulated");
      return NextResponse.json({ success: true });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (action === 'resolve') {
      // Resolve the blocker by updating task status
      const { data: task, error: taskError } = await supabase
        .from("onboarding_tasks")
        .update({
          status: 'pending',
          is_blocker: false,
          blocker_reason: null
        })
        .eq("id", task_id)
        .select()
        .single();

      if (taskError) throw taskError;

      // Check if there are any remaining blockers for this onboarding
      const { data: remainingBlockers, error: blockersError } = await supabase
        .from("onboarding_tasks")
        .select("id")
        .eq("onboarding_id", task.onboarding_id)
        .eq("is_blocker", true);

      if (blockersError) throw blockersError;

      // If no more blockers, update onboarding status back to in_progress
      if (remainingBlockers.length === 0) {
        await supabase
          .from("onboardings")
          .update({ status: 'in_progress' })
          .eq("id", task.onboarding_id);
      }

      // Create comprehensive audit log for blocker resolution
      await auditBlockerResolved(task_id, {
        onboarding_id: task.onboarding_id,
        resolution_notes,
        remaining_blockers_count: remainingBlockers.length,
        onboarding_status_changed: remainingBlockers.length === 0,
        source: 'api',
        trigger: 'user_action',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: resolve" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Blocker resolution error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}