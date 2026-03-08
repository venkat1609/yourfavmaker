import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

  const body = await req.json();
  const { action, shipping_address } = body;

  if (action === "create") {
    return await handleCreate(supabase, user, razorpayKeyId, razorpayKeySecret, shipping_address);
  } else if (action === "verify") {
    return await handleVerify(body, supabase, user, razorpayKeySecret);
  }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCreate(
  supabase: any,
  user: any,
  razorpayKeyId: string,
  razorpayKeySecret: string,
  shippingAddress?: any
) {
  // Get user's cart items
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, products(id, name, price, image_url, stock)")
    .eq("user_id", user.id);

  if (cartError || !cartItems || cartItems.length === 0) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch variant data
  const variantIds = cartItems.filter((i: any) => i.variant_id).map((i: any) => i.variant_id);
  let variantMap = new Map();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, price, stock, options")
      .in("id", variantIds);
    if (variants) variants.forEach((v: any) => variantMap.set(v.id, v));
  }

  // Calculate total in paise (INR smallest unit)
  let totalInr = 0;
  const itemDetails = cartItems.map((item: any) => {
    const variant = item.variant_id ? variantMap.get(item.variant_id) : null;
    const price = variant ? variant.price : item.products.price;
    totalInr += price * item.quantity;
    return {
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: variant ? `${item.products.name} — ${variant.name}` : item.products.name,
      price,
      quantity: item.quantity,
      variant_name: variant?.name || null,
      variant_options: variant?.options || null,
    };
  });

  const amountInPaise = Math.round(totalInr * 100);

  // Create Razorpay order
  const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    }),
  });

  const razorpayOrder = await razorpayRes.json();

  if (!razorpayRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to create Razorpay order", details: razorpayOrder }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create order in our DB with pending status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total: totalInr,
      status: "pending",
      razorpay_order_id: razorpayOrder.id,
      shipping_address: shippingAddress || null,
    })
    .select()
    .single();

  if (orderError) {
    return new Response(JSON.stringify({ error: orderError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert order items
  const orderItems = itemDetails.map((item: any) => ({
    ...item,
    order_id: order.id,
  }));
  await supabase.from("order_items").insert(orderItems);

  // Get user profile for prefill
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("user_id", user.id)
    .single();

  return new Response(
    JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
      key_id: razorpayKeyId,
      prefill: {
        name: profile?.full_name || "",
        email: profile?.email || user.email || "",
        contact: profile?.phone || "",
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerify(
  _req: Request,
  supabase: any,
  user: any,
  razorpayKeySecret: string
) {
  const body = await _req.clone().json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;

  // Verify signature using HMAC SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(razorpayKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const message = `${razorpay_order_id}|${razorpay_payment_id}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedSignature !== razorpay_signature) {
    // Mark order as failed
    await supabase
      .from("orders")
      .update({ status: "payment_failed" })
      .eq("id", order_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ error: "Payment verification failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update order as paid
  await supabase
    .from("orders")
    .update({
      status: "confirmed",
      razorpay_payment_id,
    })
    .eq("id", order_id)
    .eq("user_id", user.id);

  // Clear user's cart
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  return new Response(
    JSON.stringify({ success: true, order_id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
