import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CartItemRow = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock: number;
  };
};

type VariantRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  options: Record<string, string>;
};

type ShippingAddress = Record<string, string> | null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { action?: string; shipping_address?: ShippingAddress } & Record<string, unknown>;

    if (body.action === "mock") {
      return await handleMockCreate(supabase, user, body.shipping_address ?? null);
    }


    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "create") {
      return await handleCreate(supabase, user, razorpayKeyId, razorpayKeySecret, body.shipping_address ?? null);
    }

    if (body.action === "verify") {
      return await handleVerify(supabase, user, razorpayKeySecret, body);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCreate(
  supabase: SupabaseClient,
  user: User,
  razorpayKeyId: string,
  razorpayKeySecret: string,
  shippingAddress: ShippingAddress,
) {
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

  const cartRows = cartItems as unknown as CartItemRow[];
  const variantIds = cartRows.flatMap(item => (item.variant_id ? [item.variant_id] : []));
  const variantMap = new Map<string, VariantRow>();

  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, price, stock, options")
      .in("id", variantIds);

    (variants ?? []).forEach((variant) => {
      variantMap.set(variant.id, variant as VariantRow);
    });
  }

  let totalInr = 0;
  const itemDetails = cartRows.map((item) => {
    const variant = item.variant_id ? variantMap.get(item.variant_id) ?? null : null;
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

  const razorpayOrder = await razorpayRes.json() as { id: string };

  if (!razorpayRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to create Razorpay order", details: razorpayOrder }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total: totalInr,
      status: "pending",
      razorpay_order_id: razorpayOrder.id,
      shipping_address: shippingAddress,
    })
    .select()
    .single();

  if (orderError) {
    return new Response(JSON.stringify({ error: orderError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("order_items").insert(
    itemDetails.map((item) => ({
      ...item,
      order_id: order.id,
    }))
  );

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

async function handleMockCreate(
  supabase: SupabaseClient,
  user: User,
  shippingAddress: ShippingAddress,
) {
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

  const cartRows = cartItems as unknown as CartItemRow[];
  const variantIds = cartRows.flatMap(item => (item.variant_id ? [item.variant_id] : []));
  const variantMap = new Map<string, VariantRow>();

  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, price, stock, options")
      .in("id", variantIds);

    (variants ?? []).forEach((variant) => {
      variantMap.set(variant.id, variant as VariantRow);
    });
  }

  let totalInr = 0;
  const itemDetails = cartRows.map((item) => {
    const variant = item.variant_id ? variantMap.get(item.variant_id) ?? null : null;
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total: totalInr,
      status: "confirmed",
      shipping_address: shippingAddress,
    })
    .select()
    .single();

  if (orderError) {
    return new Response(JSON.stringify({ error: orderError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("order_items").insert(
    itemDetails.map((item) => ({
      ...item,
      order_id: order.id,
    }))
  );

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  return new Response(
    JSON.stringify({ success: true, order_id: order.id, total: totalInr }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerify(
  supabase: SupabaseClient,
  user: User,
  razorpayKeySecret: string,
  body: Record<string, unknown>,
) {
  const razorpay_order_id = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const razorpay_payment_id = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const razorpay_signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  const order_id = typeof body.order_id === "string" ? body.order_id : "";

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

  await supabase
    .from("orders")
    .update({
      status: "confirmed",
      razorpay_payment_id,
    })
    .eq("id", order_id)
    .eq("user_id", user.id);

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  return new Response(
    JSON.stringify({ success: true, order_id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
