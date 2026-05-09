// Sync WooCommerce products into the local cache table
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WC_URL = Deno.env.get("WOOCOMMERCE_URL");
    const WC_KEY = Deno.env.get("WOOCOMMERCE_CONSUMER_KEY");
    const WC_SECRET = Deno.env.get("WOOCOMMERCE_CONSUMER_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
      throw new Error("WooCommerce credentials are not configured");
    }

    const baseUrl = WC_URL.replace(/\/$/, "");
    const auth = "Basic " + btoa(`${WC_KEY}:${WC_SECRET}`);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const seenIds: number[] = [];
    let page = 1;
    const perPage = 100;
    let totalUpserted = 0;

    while (true) {
      const url = `${baseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish`;
      const res = await fetch(url, { headers: { Authorization: auth } });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `WooCommerce API failed [${res.status}] page ${page}: ${body.slice(0, 300)}`,
        );
      }

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;

      const rows = items.map((p: any) => ({
        wc_id: p.id,
        name: p.name ?? "",
        description: stripHtml(p.description),
        short_description: stripHtml(p.short_description),
        price: parseFloat(p.price || p.regular_price || "0") || 0,
        sku: p.sku ?? "",
        image_url: p.images?.[0]?.src ?? "",
        permalink: p.permalink ?? "",
        active: true,
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "wc_id" });
      if (error) throw new Error(`DB upsert failed: ${error.message}`);

      for (const r of rows) seenIds.push(r.wc_id);
      totalUpserted += rows.length;

      if (items.length < perPage) break;
      page += 1;
      if (page > 200) break; // safety
    }

    // Soft-delete products that no longer exist upstream
    let deactivated = 0;
    if (seenIds.length > 0) {
      const { error, count } = await supabase
        .from("products")
        .update({ active: false }, { count: "exact" })
        .eq("active", true)
        .not("wc_id", "in", `(${seenIds.join(",")})`);
      if (error) throw new Error(`Deactivate failed: ${error.message}`);
      deactivated = count ?? 0;
    }

    return new Response(
      JSON.stringify({ success: true, synced: totalUpserted, deactivated }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("sync error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
