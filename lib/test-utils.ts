// Test utilities for the Autonomous Onboarding Orchestrator
import { createClient } from "@supabase/supabase-js";

// Create a test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Clean up test data
export const cleanupTestData = async (supabase: any, onboardingIds: string[]) => {
  // Clean up in reverse order of dependencies
  for (const onboardingId of onboardingIds) {
    await supabase.from("stakeholders").delete().eq("onboarding_id", onboardingId);
    await supabase.from("integrations").delete().eq("onboarding_id", onboardingId);
    await supabase.from("onboarding_tasks").delete().eq("onboarding_id", onboardingId);
    await supabase.from("events_audit").delete().eq("entity_id", onboardingId);
    
    const { data: onboarding } = await supabase
      .from("onboardings")
      .select("customer_id")
      .eq("id", onboardingId)
      .single();
    
    await supabase.from("onboardings").delete().eq("id", onboardingId);
    
    if (onboarding?.customer_id) {
      await supabase.from("customers").delete().eq("id", onboarding.customer_id);
    }
  }
};