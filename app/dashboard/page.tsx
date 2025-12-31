"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { DEMO_MODE, getDemoDashboardData } from "@/lib/demo-data";

// Only create Supabase client if not in demo mode
const supabase = !DEMO_MODE ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) : null;

interface DashboardData {
  id: string;
  status: string;
  current_stage?: string;
  go_live_date?: string;
  time_to_value_days?: number;
  created_at: string;
  completed_at?: string;
  customers: {
    id: string;
    name: string;
    industry?: string;
    size?: string;
    contract_start_date: string;
  };
  onboarding_tasks: Array<{
    id: string;
    title: string;
    status: string;
    owner_role: string;
    assigned_to?: string;
    is_blocker: boolean;
    blocker_reason?: string;
    priority: string;
    due_date?: string;
    completed_at?: string;
    created_at: string;
  }>;
  stakeholders: Array<{
    id: string;
    role: string;
    name: string;
    email: string;
    responsibilities: string[];
  }>;
  integrations: Array<{
    id: string;
    type: string;
    name: string;
    status: string;
    created_at: string;
  }>;
}

interface DashboardMetrics {
  summary: {
    totalOnboardings: number;
    activeOnboardings: number;
    blockedOnboardings: number;
    completedOnboardings: number;
    avgTimeToValue: number | null;
    completionRate: number;
  };
  tasks: {
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    completionRate: number;
  };
  integrations: {
    total: number;
    byStatus: {
      not_configured: number;
      configured: number;
      testing: number;
      active: number;
      failed: number;
    };
  };
  alerts: {
    atRiskCount: number;
    atRiskOnboardings: Array<{
      id: string;
      customerName: string;
      status: string;
      daysOverdue: number;
    }>;
  };
}

export default function Dashboard() {
  const [onboardings, setOnboardings] = useState<DashboardData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOnboarding, setSelectedOnboarding] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription only if not in demo mode
    if (!DEMO_MODE && supabase) {
      setConnectionStatus('connecting');
      
      const subscription = supabase
        .channel('dashboard-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'onboardings' },
          (payload) => {
            console.log('Onboarding data changed:', payload.eventType, (payload.new as any)?.id);
            fetchDashboardData(true); // Pass true to indicate this is a refresh
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'onboarding_tasks' },
          (payload) => {
            console.log('Task data changed:', payload.eventType, (payload.new as any)?.id);
            fetchDashboardData(true);
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'integrations' },
          (payload) => {
            console.log('Integration data changed:', payload.eventType, (payload.new as any)?.id);
            fetchDashboardData(true);
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'stakeholders' },
          (payload) => {
            console.log('Stakeholder data changed:', payload.eventType, (payload.new as any)?.id);
            fetchDashboardData(true);
          }
        )
        .subscribe((status, err) => {
          console.log('Subscription status:', status, err);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected');
            // Attempt to reconnect after a delay
            setTimeout(() => {
              console.log('Attempting to reconnect...');
              setConnectionStatus('connecting');
              fetchDashboardData();
            }, 5000);
          }
        });

      // Handle connection errors and implement retry logic
      const handleConnectionError = () => {
        console.log('Connection error detected, attempting to reconnect...');
        setConnectionStatus('disconnected');
        setTimeout(() => {
          setConnectionStatus('connecting');
          fetchDashboardData();
        }, 3000);
      };

      // Listen for network status changes
      const handleOnline = () => {
        console.log('Network back online, reconnecting...');
        setConnectionStatus('connecting');
        fetchDashboardData();
      };

      const handleOffline = () => {
        console.log('Network offline');
        setConnectionStatus('disconnected');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        subscription.unsubscribe();
        setConnectionStatus('disconnected');
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      setConnectionStatus('connected'); // Demo mode is always "connected"
    }
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // Demo mode - use mock data
      if (DEMO_MODE) {
        console.log("🎭 Demo Mode: Using mock dashboard data");
        const demoData = getDemoDashboardData();
        setOnboardings(demoData as any);
        
        // Calculate demo metrics
        const demoMetrics = calculateMetrics(demoData as any);
        setMetrics(demoMetrics);
        setLastUpdated(new Date());
        return;
      }

      // Production mode - fetch from dashboard API
      const response = await fetch('/api/dashboard', {
        cache: 'no-store', // Ensure fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setOnboardings(data.onboardings || []);
      setMetrics({
        summary: data.summary,
        tasks: data.tasks,
        integrations: data.integrations,
        alerts: data.alerts
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateMetrics = (onboardings: DashboardData[]): DashboardMetrics => {
    const totalOnboardings = onboardings.length;
    const activeOnboardings = onboardings.filter(o => o.status === 'in_progress').length;
    const blockedOnboardings = onboardings.filter(o => o.status === 'blocked').length;
    const completedOnboardings = onboardings.filter(o => o.status === 'completed').length;

    // Calculate average time to value for completed onboardings
    const completedWithTimeToValue = onboardings.filter(o => 
      o.status === 'completed' && o.time_to_value_days
    );
    
    const avgTimeToValue = completedWithTimeToValue.length > 0 
      ? Math.round(
          completedWithTimeToValue.reduce((sum, o) => sum + (o.time_to_value_days || 0), 0) / 
          completedWithTimeToValue.length
        )
      : null;

    // Count total tasks and blockers
    const allTasks = onboardings.flatMap(o => o.onboarding_tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const blockedTasks = allTasks.filter(t => t.is_blocker).length;

    // Count integrations by status
    const allIntegrations = onboardings.flatMap(o => o.integrations || []);
    const integrationsByStatus = {
      not_configured: allIntegrations.filter(i => i.status === 'not_configured').length,
      configured: allIntegrations.filter(i => i.status === 'configured').length,
      testing: allIntegrations.filter(i => i.status === 'testing').length,
      active: allIntegrations.filter(i => i.status === 'active').length,
      failed: allIntegrations.filter(i => i.status === 'failed').length,
    };

    // Identify at-risk onboardings
    const now = new Date();
    const atRiskOnboardings = onboardings.filter(o => {
      if (o.status === 'blocked') return true;
      if (o.go_live_date && new Date(o.go_live_date) < now && o.status !== 'completed') return true;
      return false;
    }).map(o => ({
      id: o.id,
      customerName: o.customers?.name || 'Unknown',
      status: o.status,
      daysOverdue: o.go_live_date ? 
        Math.ceil((now.getTime() - new Date(o.go_live_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

    return {
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
      alerts: {
        atRiskCount: atRiskOnboardings.length,
        atRiskOnboardings
      }
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#0070f3';
      case 'blocked': return '#dc3545';
      case 'not_started': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const calculateTimeToValue = (createdAt: string, goLiveDate?: string, completedAt?: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    
    // If completed, use actual completion time
    if (completedAt) {
      const completed = new Date(completedAt);
      const actualDays = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return {
        current: actualDays,
        remaining: 0,
        isCompleted: true
      };
    }
    
    // Current days since start
    const currentDays = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    // Days remaining until target
    let remaining = 0;
    if (goLiveDate) {
      const target = new Date(goLiveDate);
      remaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      current: currentDays,
      remaining,
      isCompleted: false
    };
  };

  if (loading) return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <div style={{ marginBottom: "20px" }}>Loading dashboard...</div>
      <div style={{ fontSize: "14px", color: "#666" }}>
        Connection: {connectionStatus}
      </div>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: "40px", color: "red", textAlign: "center" }}>
      <div style={{ marginBottom: "20px" }}>Error: {error}</div>
      <button 
        onClick={() => fetchDashboardData()}
        style={{
          background: "#0070f3",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Retry
      </button>
    </div>
  );

  return (
    <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1>Airr 3.0 - Autonomous Onboarding Dashboard</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {/* Connection Status and Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: connectionStatus === 'connected' ? '#28a745' : 
                               connectionStatus === 'connecting' ? '#ffc107' : '#dc3545'
              }} />
              <span style={{ fontSize: "12px", color: "#666" }}>
                {connectionStatus === 'connected' ? 'Live Updates' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            
            {lastUpdated && (
              <span style={{ fontSize: "11px", color: "#999" }}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            
            {refreshing && (
              <span style={{ fontSize: "11px", color: "#0070f3" }}>
                🔄 Refreshing...
              </span>
            )}
            
            <button 
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              style={{
                background: refreshing ? "#f8f9fa" : "#f8f9fa",
                border: "1px solid #ddd",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: "12px",
                opacity: refreshing ? 0.6 : 1
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {DEMO_MODE && (
          <div style={{ 
            backgroundColor: "#fff3cd", 
            border: "1px solid #ffeaa7", 
            padding: "10px 15px", 
            borderRadius: "8px", 
            marginBottom: "15px",
            color: "#856404"
          }}>
            🎭 <strong>Demo Mode</strong> - Using mock data. Configure Supabase to use real data.
          </div>
        )}
        
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Real-time visibility into onboarding progress, blockers, and time-to-value metrics
        </p>
        
        <nav style={{ marginBottom: "30px" }}>
          <a href="/" style={{ marginRight: "20px", color: "#0070f3" }}>Customer Intake</a>
          <a href="/dashboard" style={{ color: "#0070f3", fontWeight: "bold" }}>Dashboard</a>
        </nav>
      </div>

      {/* Enhanced Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
        gap: "20px", 
        marginBottom: "30px" 
      }}>
        <div style={{ 
          border: "1px solid #ddd", 
          padding: "20px", 
          borderRadius: "8px", 
          backgroundColor: "#f8f9fa" 
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#0070f3" }}>Total Onboardings</h3>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {metrics?.summary.totalOnboardings || onboardings.length}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {metrics?.summary.completionRate || 0}% completion rate
          </div>
        </div>
        
        <div style={{ 
          border: "1px solid #ddd", 
          padding: "20px", 
          borderRadius: "8px", 
          backgroundColor: "#f8f9fa" 
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#28a745" }}>Active</h3>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {metrics?.summary.activeOnboardings || onboardings.filter(o => o.status === 'in_progress').length}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {metrics?.tasks.totalTasks || 0} total tasks
          </div>
        </div>
        
        <div style={{ 
          border: "1px solid #ddd", 
          padding: "20px", 
          borderRadius: "8px", 
          backgroundColor: "#f8f9fa" 
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#dc3545" }}>Blocked</h3>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {metrics?.summary.blockedOnboardings || onboardings.filter(o => o.status === 'blocked').length}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {metrics?.tasks.blockedTasks || 0} blocked tasks
          </div>
        </div>
        
        <div style={{ 
          border: "1px solid #ddd", 
          padding: "20px", 
          borderRadius: "8px", 
          backgroundColor: "#f8f9fa" 
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#28a745" }}>Completed</h3>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {metrics?.summary.completedOnboardings || onboardings.filter(o => o.status === 'completed').length}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            {metrics?.summary.avgTimeToValue ? `${metrics.summary.avgTimeToValue} days avg` : 'No data'}
          </div>
        </div>

        {/* At-Risk Alert Card */}
        {metrics && metrics.alerts.atRiskCount > 0 && (
          <div style={{ 
            border: "2px solid #dc3545", 
            padding: "20px", 
            borderRadius: "8px", 
            backgroundColor: "#f8d7da",
            gridColumn: "span 2"
          }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#dc3545" }}>⚠️ At Risk</h3>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
              {metrics.alerts.atRiskCount}
            </div>
            <div style={{ fontSize: "12px", color: "#721c24", marginTop: "5px" }}>
              Onboardings need attention
            </div>
            <div style={{ marginTop: "10px" }}>
              {metrics.alerts.atRiskOnboardings.slice(0, 3).map(risk => (
                <div key={risk.id} style={{ fontSize: "12px", color: "#721c24" }}>
                  • {risk.customerName} ({risk.status})
                  {risk.daysOverdue > 0 && ` - ${risk.daysOverdue} days overdue`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Onboardings Table */}
      <div style={{ marginBottom: "30px" }}>
        <h2>Onboarding Overview</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            border: "1px solid #ddd",
            backgroundColor: "white"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Customer</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Current Stage</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Tasks Progress</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Blockers</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Integrations</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Time to Value</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {onboardings.map((onboarding) => {
                const tasks = onboarding.onboarding_tasks || [];
                const blockers = tasks.filter(t => t.is_blocker);
                const integrations = onboarding.integrations || [];
                const timeToValue = calculateTimeToValue(onboarding.created_at, onboarding.go_live_date, onboarding.completed_at);
                const isOverdue = onboarding.go_live_date && 
                  new Date(onboarding.go_live_date) < new Date() && 
                  onboarding.status !== 'completed';
                
                return (
                  <tr 
                    key={onboarding.id} 
                    style={{ 
                      borderBottom: "1px solid #eee",
                      backgroundColor: blockers.length > 0 ? "#fff5f5" : 
                                     isOverdue ? "#fffbf0" : "white"
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <div>
                        <strong>{onboarding.customers?.name}</strong>
                        {onboarding.customers?.industry && (
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {onboarding.customers.industry} • {onboarding.customers.size}
                          </div>
                        )}
                        {isOverdue && (
                          <div style={{ fontSize: "11px", color: "#d63384", fontWeight: "bold" }}>
                            ⏰ OVERDUE
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        backgroundColor: getStatusColor(onboarding.status),
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {onboarding.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "500" }}>
                        {onboarding.current_stage || 'Intake'}
                      </div>
                      <div style={{ fontSize: "11px", color: "#666" }}>
                        Started {new Date(onboarding.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "500" }}>
                            {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
                          </div>
                          <div style={{ 
                            width: "100%", 
                            height: "4px", 
                            backgroundColor: "#e9ecef", 
                            borderRadius: "2px",
                            overflow: "hidden"
                          }}>
                            <div style={{
                              width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%`,
                              height: "100%",
                              backgroundColor: blockers.length > 0 ? "#dc3545" : "#28a745",
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                        {tasks.filter(t => t.status === 'in_progress').length} in progress
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {blockers.length > 0 ? (
                        <div>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            backgroundColor: "#dc3545",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}>
                            🚫 {blockers.length} BLOCKER{blockers.length > 1 ? 'S' : ''}
                          </span>
                          <div style={{ fontSize: "11px", color: "#dc3545", marginTop: "4px" }}>
                            {blockers[0]?.blocker_reason && blockers[0].blocker_reason.length > 30 
                              ? `${blockers[0].blocker_reason.substring(0, 30)}...`
                              : blockers[0]?.blocker_reason}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#28a745", fontSize: "12px" }}>✓ Clear</span>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500" }}>
                          {integrations.filter(i => i.status === 'active').length}/{integrations.length}
                        </div>
                        <div style={{ fontSize: "11px", color: "#666" }}>
                          {integrations.filter(i => i.status === 'failed').length > 0 && (
                            <span style={{ color: "#dc3545" }}>
                              {integrations.filter(i => i.status === 'failed').length} failed
                            </span>
                          )}
                          {integrations.filter(i => i.status === 'testing').length > 0 && (
                            <span style={{ color: "#ffc107" }}>
                              {integrations.filter(i => i.status === 'testing').length} testing
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>
                        <div style={{ 
                          fontSize: "14px", 
                          fontWeight: "500",
                          color: isOverdue ? "#d63384" : "inherit"
                        }}>
                          {timeToValue.current} days
                        </div>
                        {onboarding.go_live_date && (
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Target: {new Date(onboarding.go_live_date).toLocaleDateString()}
                            <br />
                            {timeToValue.remaining > 0 ? (
                              <span style={{ color: "#28a745" }}>
                                {timeToValue.remaining} days left
                              </span>
                            ) : (
                              <span style={{ color: "#d63384" }}>
                                {Math.abs(timeToValue.remaining)} days over
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => setSelectedOnboarding(
                          selectedOnboarding === onboarding.id ? null : onboarding.id
                        )}
                        style={{
                          background: "#0070f3",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        {selectedOnboarding === onboarding.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed View */}
      {selectedOnboarding && (
        <div style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px", 
          backgroundColor: "#f8f9fa",
          marginBottom: "30px"
        }}>
          {(() => {
            const onboarding = onboardings.find(o => o.id === selectedOnboarding);
            if (!onboarding) return null;

            const tasks = onboarding.onboarding_tasks || [];
            const stakeholders = onboarding.stakeholders || [];
            const integrations = onboarding.integrations || [];

            return (
              <div>
                <h3>Detailed View: {onboarding.customers?.name}</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "20px" }}>
                  {/* Enhanced Tasks Section */}
                  <div>
                    <h4>Tasks ({tasks.length})</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {tasks.length === 0 ? (
                        <div style={{ 
                          padding: "20px", 
                          textAlign: "center", 
                          color: "#666",
                          border: "1px dashed #ddd",
                          borderRadius: "4px"
                        }}>
                          No tasks assigned yet
                        </div>
                      ) : (
                        tasks
                          .sort((a, b) => {
                            // Sort by: blockers first, then by priority, then by status
                            if (a.is_blocker && !b.is_blocker) return -1;
                            if (!a.is_blocker && b.is_blocker) return 1;
                            
                            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
                            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
                            
                            if (aPriority !== bPriority) return aPriority - bPriority;
                            
                            const statusOrder = { blocked: 0, in_progress: 1, pending: 2, completed: 3 };
                            const aStatus = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
                            const bStatus = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
                            
                            return aStatus - bStatus;
                          })
                          .map(task => (
                            <div key={task.id} style={{ 
                              border: task.is_blocker ? "2px solid #dc3545" : "1px solid #ddd", 
                              padding: "12px", 
                              marginBottom: "8px", 
                              borderRadius: "4px",
                              backgroundColor: task.is_blocker ? "#fff5f5" : 
                                             task.status === 'completed' ? "#f8fff8" : "white"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <div style={{ flex: 1 }}>
                                  <strong style={{ fontSize: "14px" }}>{task.title}</strong>
                                  {task.is_blocker && (
                                    <span style={{ 
                                      marginLeft: "8px",
                                      padding: "2px 6px", 
                                      borderRadius: "3px", 
                                      backgroundColor: "#dc3545",
                                      color: "white",
                                      fontSize: "10px",
                                      fontWeight: "bold"
                                    }}>
                                      🚫 BLOCKER
                                    </span>
                                  )}
                                </div>
                                <span style={{ 
                                  padding: "2px 6px", 
                                  borderRadius: "3px", 
                                  backgroundColor: getPriorityColor(task.priority),
                                  color: "white",
                                  fontSize: "10px",
                                  fontWeight: "bold"
                                }}>
                                  {task.priority.toUpperCase()}
                                </span>
                              </div>
                              
                              <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span>
                                    Status: <strong style={{ 
                                      color: task.status === 'completed' ? '#28a745' : 
                                             task.status === 'in_progress' ? '#0070f3' : 
                                             task.status === 'blocked' ? '#dc3545' : '#6c757d'
                                    }}>
                                      {task.status.replace('_', ' ').toUpperCase()}
                                    </strong>
                                  </span>
                                  {task.due_date && (
                                    <span style={{ 
                                      fontSize: "11px",
                                      color: new Date(task.due_date) < new Date() && task.status !== 'completed' ? '#dc3545' : '#666'
                                    }}>
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginTop: "4px" }}>
                                  Owner: <strong>{task.owner_role.replace('_', ' ')}</strong>
                                  {task.assigned_to && <> • Assigned: <strong>{task.assigned_to}</strong></>}
                                </div>
                                {task.completed_at && (
                                  <div style={{ marginTop: "4px", color: "#28a745" }}>
                                    ✓ Completed: {new Date(task.completed_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              
                              {task.is_blocker && task.blocker_reason && (
                                <div style={{ 
                                  marginTop: "8px", 
                                  padding: "8px", 
                                  backgroundColor: "#f8d7da", 
                                  borderRadius: "3px",
                                  fontSize: "12px",
                                  color: "#721c24",
                                  border: "1px solid #f5c6cb"
                                }}>
                                  <strong>Blocker Reason:</strong> {task.blocker_reason}
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Stakeholders */}
                  <div>
                    <h4>Stakeholders ({stakeholders.length})</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {stakeholders.map(stakeholder => (
                        <div key={stakeholder.id} style={{ 
                          border: "1px solid #ddd", 
                          padding: "10px", 
                          marginBottom: "8px", 
                          borderRadius: "4px",
                          backgroundColor: "white"
                        }}>
                          <strong style={{ fontSize: "14px" }}>{stakeholder.name}</strong>
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                            {stakeholder.role.replace('_', ' ')} • {stakeholder.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h4>Integrations ({integrations.length})</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {integrations.map(integration => (
                        <div key={integration.id} style={{ 
                          border: "1px solid #ddd", 
                          padding: "10px", 
                          marginBottom: "8px", 
                          borderRadius: "4px",
                          backgroundColor: "white"
                        }}>
                          <strong style={{ fontSize: "14px" }}>{integration.name}</strong>
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                            Type: {integration.type} • Status: 
                            <span style={{ 
                              marginLeft: "5px",
                              padding: "2px 6px", 
                              borderRadius: "3px", 
                              backgroundColor: getStatusColor(integration.status),
                              color: "white"
                            }}>
                              {integration.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {onboardings.length === 0 && (
        <div style={{ 
          textAlign: "center", 
          padding: "40px", 
          color: "#666",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f8f9fa"
        }}>
          <h3>No onboardings found</h3>
          <p>Create your first customer onboarding to see it appear here.</p>
          <a 
            href="/" 
            style={{ 
              background: "#0070f3", 
              color: "white", 
              padding: "10px 20px", 
              borderRadius: "4px", 
              textDecoration: "none",
              display: "inline-block",
              marginTop: "10px"
            }}
          >
            Start New Onboarding
          </a>
        </div>
      )}
    </main>
  );
}


