import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OnboardingTask } from "@/lib/types";
import { DEMO_MODE } from "@/lib/demo-data";
import { 
  auditTaskCreated, 
  auditTaskStatusChanged, 
  auditTaskCompleted,
  auditBlockerCreated 
} from "@/lib/audit-trail";

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

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
      // Return demo tasks
      const demoTasks: OnboardingTask[] = [
        {
          id: "demo-task-1",
          onboarding_id: onboardingId,
          task_type: "kickoff_meeting",
          title: "Schedule kickoff meeting",
          owner_role: "project_manager",
          assigned_to: "pm@example.com",
          status: "pending",
          priority: "high",
          is_blocker: false,
          created_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      return NextResponse.json({ tasks: demoTasks });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: tasks, error } = await supabase
      .from("onboarding_tasks")
      .select("*")
      .eq("onboarding_id", onboardingId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("Tasks retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { task_id, status, assigned_to, blocker_reason } = body;

    if (!task_id || !status) {
      return NextResponse.json(
        { error: "Missing required fields: task_id and status" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Task update simulated");
      return NextResponse.json({ success: true });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Prepare update data
    const updateData: any = { status };
    
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }
    
    if (status === 'blocked' && blocker_reason) {
      updateData.is_blocker = true;
      updateData.blocker_reason = blocker_reason;
    } else if (status !== 'blocked') {
      updateData.is_blocker = false;
      updateData.blocker_reason = null;
    }
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Get previous task state for audit trail
    const { data: previousTask } = await supabase
      .from("onboarding_tasks")
      .select("status, assigned_to, is_blocker")
      .eq("id", task_id)
      .single();

    // Update the task
    const { data: task, error } = await supabase
      .from("onboarding_tasks")
      .update(updateData)
      .eq("id", task_id)
      .select()
      .single();

    if (error) throw error;

    // Comprehensive audit logging
    const auditMetadata = {
      onboarding_id: task.onboarding_id,
      task_type: task.task_type,
      title: task.title,
      owner_role: task.owner_role,
      previous_status: previousTask?.status || 'unknown',
      new_status: status,
      previous_assigned_to: previousTask?.assigned_to,
      new_assigned_to: assigned_to,
      was_blocker: previousTask?.is_blocker || false,
      is_blocker: updateData.is_blocker || false,
      blocker_reason,
      source: 'api' as const,
      trigger: 'user_action' as const,
    };

    // Create appropriate audit records
    if (status === 'completed') {
      await auditTaskCompleted(task_id, auditMetadata);
    } else if (status === 'blocked' && blocker_reason) {
      await auditBlockerCreated(task_id, auditMetadata);
    } else {
      await auditTaskStatusChanged(task_id, auditMetadata);
    }

    // If task is blocked, trigger escalation workflow and notifications
    if (status === 'blocked' && blocker_reason) {
      try {
        // Get stakeholders for notification
        const { data: stakeholders } = await supabase
          .from("stakeholders")
          .select("*")
          .eq("onboarding_id", task.onboarding_id);

        // Get customer name for notification
        const { data: onboarding } = await supabase
          .from("onboardings")
          .select(`
            customers (
              name
            )
          `)
          .eq("id", task.onboarding_id)
          .single();

        const customerName = (onboarding?.customers as any)?.name || "Unknown Customer";

        // Trigger escalation workflow
        if (process.env.N8N_ESCALATION_WEBHOOK_URL) {
          await fetch(process.env.N8N_ESCALATION_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              task_id: task_id,
              onboarding_id: task.onboarding_id,
              blocker_reason,
              task_type: task.task_type,
              owner_role: task.owner_role,
              customer_name: customerName,
              stakeholders: stakeholders || []
            }),
          });
        }
      } catch (escalationError) {
        console.error("Failed to trigger escalation workflow:", escalationError);
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error("Task update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { 
      onboarding_id, 
      task_type, 
      title, 
      description, 
      owner_role, 
      assigned_to, 
      priority = 'medium',
      due_date 
    } = body;

    if (!onboarding_id || !task_type || !title || !owner_role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      console.log("🎭 Demo Mode: Task creation simulated");
      return NextResponse.json({ 
        success: true, 
        task_id: `demo-task-${Date.now()}` 
      });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { data: task, error } = await supabase
      .from("onboarding_tasks")
      .insert({
        onboarding_id,
        task_type,
        title,
        description,
        owner_role,
        assigned_to,
        priority,
        due_date,
        status: 'pending',
        is_blocker: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Create comprehensive audit log
    await auditTaskCreated(task.id, {
      onboarding_id,
      task_type,
      title,
      description,
      owner_role,
      assigned_to,
      priority,
      due_date,
      source: 'api' as const,
      trigger: 'user_action' as const,
    });

    // Send notification if assigned to someone
    if (assigned_to && process.env.N8N_NOTIFICATION_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_NOTIFICATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "task_assigned",
            task_id: task.id,
            assigned_to,
            task_title: title,
            priority,
            due_date,
          }),
        });
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
      }
    }

    return NextResponse.json({ success: true, task_id: task.id });
  } catch (err: any) {
    console.error("Task creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}