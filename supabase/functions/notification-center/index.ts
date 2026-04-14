import { createClient, type RealtimeChannel, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export type OutgoingMessage = {
  type: string;
  payload?: unknown;
  error?: string;
};

type ChatSendPayload = {
  recipientId: string;
  message: string;
  title?: string;
  channel?: string;
  conversationId?: string;
  storeId?: string;
  metadata?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase env variables for notification-center function');
}

Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase configuration is incomplete' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const authHeader = req.headers.get('Authorization') ?? '';
  const queryToken = requestUrl.searchParams.get('token') ?? '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const token = headerToken || queryToken;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization token required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upgradeHeader = req.headers.get('upgrade')?.toLowerCase();
  if (upgradeHeader !== 'websocket') {
    return new Response(JSON.stringify({ error: 'WebSocket upgrade is required' }), {
      status: 426,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  handleWebSocket(socket, userData.user, supabaseService).catch((error) => {
    console.error('WebSocket handler failed', error);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'error', error: 'Internal socket error' }));
      socket.close();
    }
  });
  return response;
});

async function handleWebSocket(socket: WebSocket, user: User, supabaseService: SupabaseClient) {
  const subscriptions: RealtimeChannel[] = [];
  const { isAdmin, isSeller } = await resolveRoles(supabaseService, user.id);
  const send = (message: OutgoingMessage) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  socket.addEventListener('message', async (event) => {
    await handleSocketMessage(event.data, supabaseService, user, send);
  });

  socket.addEventListener('close', () => cleanupSubscriptions(subscriptions));
  socket.addEventListener('error', () => cleanupSubscriptions(subscriptions));

  await sendInitialNotifications(supabaseService, user.id, send);
  subscriptions.push(await subscribeToNotifications(supabaseService, user.id, send));

  if (isSeller) {
    subscriptions.push(await subscribeToSellerStores(supabaseService, user.id, send));
  }

  if (isAdmin) {
    subscriptions.push(await subscribeToPendingStores(supabaseService, send));
    await sendPendingStoreCount(supabaseService, send);
  }
}

async function resolveRoles(supabase: SupabaseClient, userId: string) {
  const { data: isAdmin, error: adminError } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (adminError) console.error('has_role admin failed', adminError);
  const { data: isSeller, error: sellerError } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'seller',
  });
  if (sellerError) console.error('has_role seller failed', sellerError);
  return {
    isAdmin: !!isAdmin,
    isSeller: !!isSeller,
  };
}

async function sendInitialNotifications(supabase: SupabaseClient, userId: string, send: (message: OutgoingMessage) => void) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    console.error('Failed to load initial notifications', error);
    send({ type: 'notifications.initial', error: 'Unable to load notifications' });
    return;
  }
  send({ type: 'notifications.initial', payload: data ?? [] });
}

async function sendPendingStoreCount(supabase: SupabaseClient, send: (message: OutgoingMessage) => void) {
  const { count, error } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) {
    console.error('Failed to read pending store count', error);
    send({ type: 'store.pending.count', error: 'Unable to read pending count' });
    return;
  }
  send({ type: 'store.pending.count', payload: { total: count ?? 0 } });
}

async function subscribeToNotifications(supabase: SupabaseClient, userId: string, send: (message: OutgoingMessage) => void) {
  return subscribeToRealtimeChannel({
    supabase,
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
    notifyType: 'notifications.new',
    events: ['INSERT'],
    send,
  });
}

async function subscribeToSellerStores(supabase: SupabaseClient, userId: string, send: (message: OutgoingMessage) => void) {
  return subscribeToRealtimeChannel({
    supabase,
    table: 'stores',
    filter: `user_id=eq.${userId}`,
    notifyType: 'stores.update',
    events: ['UPDATE'],
    send,
  });
}

async function subscribeToPendingStores(supabase: SupabaseClient, send: (message: OutgoingMessage) => void) {
  return subscribeToRealtimeChannel({
    supabase,
    table: 'stores',
    filter: 'status=eq.pending',
    notifyType: 'stores.pending',
    events: ['INSERT'],
    send,
  });
}

type RealtimeSubscribeOptions = {
  supabase: SupabaseClient;
  table: string;
  filter: string;
  notifyType: string;
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  schema?: string;
  send: (message: OutgoingMessage) => void;
};

async function subscribeToRealtimeChannel(options: RealtimeSubscribeOptions) {
  const { supabase, table, filter, schema = 'public', events = ['INSERT', 'UPDATE'], notifyType, send } = options;
  const channelId = `notification-center:${table}:${crypto.randomUUID()}`;
  const channel = supabase.channel(channelId);
  channel.on(
    'postgres_changes',
    { event: events, schema, table, filter },
    (payload: any) => {
      const record = payload.record ?? payload.new ?? null;
      if (!record) return;
      send({ type: notifyType, payload: { event: payload.event ?? payload.type ?? 'change', record } });
    }
  );
  await channel.subscribe();
  return channel;
}

async function handleSocketMessage(raw: string | ArrayBuffer | Blob, supabase: SupabaseClient, user: User, send: (message: OutgoingMessage) => void) {
  if (raw instanceof ArrayBuffer) raw = new TextDecoder().decode(raw);
  if (raw instanceof Blob) raw = await raw.text();
  if (typeof raw !== 'string') return;
  let parsed: { type?: string; payload?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    send({ type: 'error', error: 'Invalid payload' });
    console.error('Failed to parse message', error);
    return;
  }
  switch (parsed.type) {
    case 'chat.send':
      await handleChatSend(parsed.payload as ChatSendPayload | undefined, supabase, user, send);
      break;
    case 'notifications.refresh':
      await sendInitialNotifications(supabase, user.id, send);
      break;
    default:
      // ignore unrecognized action to avoid flooding the socket
      break;
  }
}

async function handleChatSend(payload: ChatSendPayload | undefined, supabase: SupabaseClient, user: User, send: (message: OutgoingMessage) => void) {
  if (!payload || !payload.recipientId || !payload.message) {
    send({ type: 'chat.error', error: 'recipientId and message are required' });
    return;
  }
  const insertPayload = {
    user_id: payload.recipientId,
    type: 'chat_message',
    title: payload.title ?? 'New message',
    body: payload.message,
    metadata: {
      sender_id: user.id,
      channel: payload.channel ?? 'user_seller',
      store_id: payload.storeId ?? null,
      conversation_id: payload.conversationId ?? null,
      ...payload.metadata,
    },
  } as const;
  const { error } = await supabase.from('notifications').insert(insertPayload);
  if (error) {
    console.error('Failed to send chat notification', error);
    send({ type: 'chat.error', error: 'Unable to send message' });
    return;
  }
  send({ type: 'chat.sent', payload: insertPayload });
}

function cleanupSubscriptions(subscriptions: RealtimeChannel[]) {
  subscriptions.forEach((channel) => {
    channel.unsubscribe();
  });
}
