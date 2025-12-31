import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Dashboard() {
  const { data: onboardings } = await supabase
    .from("onboardings")
    .select(`
      id,
      status,
      customers(name),
      onboarding_tasks(id, is_blocker)
    `)
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: "40px" }}>
      <h2>Onboarding Dashboard</h2>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Status</th>
            <th>Total Tasks</th>
            <th>Blockers</th>
          </tr>
        </thead>
        <tbody>
          {onboardings?.map((o: any) => {
            const tasks = o.onboarding_tasks || [];
            const blockers = tasks.filter((t: any) => t.is_blocker).length;

            return (
              <tr key={o.id}>
                <td>{o.customers?.name}</td>
                <td>{o.status}</td>
                <td>{tasks.length}</td>
                <td>{blockers}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}


