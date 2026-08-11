import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

Deno.serve(async (request) => {
  const expected = Deno.env.get("LEGACY_CRON_SECRET");
  if (!expected || request.headers.get("x-mangrok-cron-secret") !== expected) return new Response("Unauthorized", { status: 401 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const { data: plans, error } = await admin.from("legacy_plans").select("id,owner_id,release_after,inactivity_months,created_at").eq("status", "active");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const flagged = [];
  for (const plan of plans || []) {
    let reason = "";
    if (plan.release_after && plan.release_after <= today) reason = "Earliest release date reached";
    if (!reason && plan.inactivity_months) {
      const { data: profile } = await admin.from("profiles").select("updated_at").eq("id", plan.owner_id).single();
      const threshold = new Date(); threshold.setMonth(threshold.getMonth() - Number(plan.inactivity_months));
      if (profile?.updated_at && new Date(profile.updated_at) <= threshold) reason = "Inactivity review threshold reached";
    }
    if (!reason) continue;
    const { error: updateError } = await admin.from("legacy_plans").update({ status: "review_pending", review_reason: reason }).eq("id", plan.id).eq("status", "active");
    if (updateError) continue;
    await admin.from("notifications").insert({ user_id: plan.owner_id, kind: "legacy", message: `Legacy plan requires review: ${reason}`, data: { legacyPlanId: plan.id } });
    flagged.push(plan.id);
  }
  // Deliberately does not contact recipients, decrypt secrets, or release recipes.
  return Response.json({ reviewed: plans?.length || 0, flagged, released: 0 });
});
