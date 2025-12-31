import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(): Promise<NextResponse> {
  try {
    // Get comprehensive dashboard data
    const { data: onboardings, error: onboardingsError } = await supabase
      .from("onboardings")
      .select(`
        id,
        status,
        current_stage,
        go_live_date,
        time_to_value_days,
        created_at,
        completed_at,
        customers(
          id,
          name,
          industry,
          size,
          contract_start_date
        ),
        onboarding_tasks(
          id,
          title,
          status,
          owner_role,
          assigned_to,
          is_blocker,
          blocker_reason,
          priority,
          due_date,
          completed_at,
          created_at
        ),
        stakeholders(
          id,
          role,
          name,
          email,
          responsibilities
        ),
        integrations(
          id,
          type,
          name,
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (onboardingsError) throw onboardingsError;

    // Calculate metrics
    const totalOnboardings = onboardings?.length || 0;
    const activeOnboardings = onboardings?.filter(o => o.status === 'in_progress').length || 0;
    const blockedOnboardings = onboardings?.filter(o => o.status === 'blocked').length || 0;
    const completedOnboardings = onboardings?.filter(o => o.status === 'completed').length || 0;

    // Calculate average time to value for completed onboardings
    const completedWithTimeToValue = onboardings?.filter(o => 
      o.status === 'completed' && o.time_to_value_days
    ) || [];
    
    const avgTimeToValue = completedWithTimeToValue.length > 0 
      ? Math.round(
          completedWithTimeToValue.reduce((sum, o) => sum + (o.time_to_value_days || 0), 0) / 
          completedWithTimeToValue.length
        )
      : null;

    // Count total tasks and blockers
    const allTasks = onboardings?.flatMap(o => o.onboarding_tasks || []) || [];
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const blockedTasks = allTasks.filter(t => t.is_blocker).length;

    // Count integrations by status
    const allIntegrations = onboardings?.flatMap(o => o.integrations || []) || [];
    const integrationsByStatus = {
      not_configured: allIntegrations.filter(i => i.status === 'not_configured').length,
      configured: allIntegrations.filter(i => i.status === 'configured').length,
      testing: allIntegrations.filter(i => i.status === 'testing').length,
      active: allIntegrations.filter(i => i.status === 'active').length,
      failed: allIntegrations.filter(i => i.status === 'failed').length,
    };

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOnboardings = onboardings?.filter(o => 
      new Date(o.created_at) >= sevenDaysAgo
    ).length || 0;

    const recentCompletions = onboardings?.filter(o => 
      o.completed_at && new Date(o.completed_at) >= sevenDaysAgo
    ).length || 0;

    // Identify at-risk onboardings (overdue or blocked for >24h)
    const now = new Date();
    const atRiskOnboardings = onboardings?.filter(o => {
      if (o.status === 'blocked') return true;
      if (o.go_live_date && new Date(o.go_live_date) < now && o.status !== 'completed') return true;
      return false;
    }) || [];

    const dashboardData = {
      summary: {
        totalOnboardings,
        activeOnboardings,
        blockedOnboardings,
        completedOnboardings,
        avgTimeToValue,
        completionRate: totalOnboardings > 0 ? 
          Math.round((completedOnboardings / totalOnboardings) * 100) : 0
      },
      tasks: {
        totalTasks,
        completedTasks,
        blockedTasks,
        completionRate: totalTasks > 0 ? 
          Math.round((completedTasks / totalTasks) * 100) : 0
      },
      integrations: {
        total: allIntegrations.length,
        byStatus: integrationsByStatus
      },
      activity: {
        recentOnboardings,
        recentCompletions
      },
      alerts: {
        atRiskCount: atRiskOnboardings.length,
        atRiskOnboardings: atRiskOnboardings.map(o => ({
          id: o.id,
          customerName: (o.customers as any)?.name,
          status: o.status,
          daysOverdue: o.go_live_date ? 
            Math.ceil((now.getTime() - new Date(o.go_live_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
        }))
      },
      onboardings: onboardings || []
    };

    return NextResponse.json(dashboardData);

  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data", details: error.message },
      { status: 500 }
    );
  }
}