import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") || "";
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await request.json();
    const bookId = String(body.bookId || "");
    const requestId = String(body.requestId || "");
    const proofPath = body.proofPath ? String(body.proofPath) : null;
    if (!/^[0-9a-f-]{36}$/i.test(bookId) || !/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Invalid bookId or requestId" }, 400);

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const { data: existing } = await admin.from("print_orders").select("*").eq("owner_id", user.id).eq("request_id", requestId).maybeSingle();
    if (existing) return json({ ...existing, idempotent: true });

    const { data: book, error: bookError } = await admin.from("books").select("*").eq("id", bookId).eq("owner_id", user.id).single();
    if (bookError || !book) return json({ error: "Book not found" }, 404);
    if (book.include_secrets && !book.secret_approval_at) return json({ error: "Secret printing has not been explicitly approved" }, 409);

    if (!proofPath) {
      const { data: order, error } = await admin.from("print_orders").insert({ owner_id: user.id, book_id: bookId, request_id: requestId, status: "proof_required" }).select().single();
      if (error) throw error;
      return json({ ...order, message: "Upload a reviewed private PDF proof before physical fulfillment." }, 202);
    }
    const expectedPrefix = `${user.id}/${bookId}/`;
    if (!proofPath.startsWith(expectedPrefix) || !proofPath.endsWith(".pdf")) return json({ error: "Invalid private proof path" }, 400);

    const providerUrl = Deno.env.get("PRINT_PROVIDER_URL");
    const providerKey = Deno.env.get("PRINT_PROVIDER_KEY");
    if (!providerUrl || !providerKey) {
      const { data: order, error } = await admin.from("print_orders").insert({ owner_id: user.id, book_id: bookId, request_id: requestId, status: "provider_not_configured", proof_path: proofPath }).select().single();
      if (error) throw error;
      return json({ ...order, message: "The print provider is not configured. No external order was placed." }, 202);
    }

    const { data: signed, error: signError } = await admin.storage.from("print-proofs").createSignedUrl(proofPath, 900);
    if (signError || !signed?.signedUrl) throw signError || new Error("Unable to sign proof URL");
    const providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${providerKey}`, "idempotency-key": requestId },
      body: JSON.stringify({ externalId: requestId, title: book.title, trim: "6x9", proofUrl: signed.signedUrl, metadata: { mangrokBookId: bookId, ownerId: user.id } })
    });
    const providerBody = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      await admin.from("print_orders").insert({ owner_id: user.id, book_id: bookId, request_id: requestId, status: "failed", proof_path: proofPath, error_message: JSON.stringify(providerBody).slice(0, 2000) });
      return json({ error: "Print provider rejected the request", provider: providerBody }, 502);
    }
    const { data: order, error } = await admin.from("print_orders").insert({ owner_id: user.id, book_id: bookId, request_id: requestId, status: "submitted",
      provider: providerBody.provider || "configured-provider", provider_order_id: String(providerBody.id || ""), proof_path: proofPath }).select().single();
    if (error) throw error;
    return json({ ...order, message: "Physical print order submitted." }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
