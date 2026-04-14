"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type NotificationRow = {
  id: string;
  user_id: string;
  type: 'seller_application' | 'order_update' | 'chat_message' | 'system' | 'alert';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  related_store_id: string | null;
  related_order_id: string | null;
  is_read: boolean;
  created_at: string;
};

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed';

const MAX_NOTIFICATIONS = 12;

const buildSocketUrl = (token: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  const url = new URL('/functions/v1/notification-center', baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
};

export function useNotificationCenter() {
  const { session, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user || !session?.access_token) {
      socketRef.current?.close();
      socketRef.current = null;
      setNotifications([]);
      setStatus('idle');
      return;
    }

    const socketUrl = buildSocketUrl(session.access_token);
    if (!socketUrl) {
      setStatus('idle');
      return;
    }

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    setStatus('connecting');

    const handleMessage = (event: MessageEvent) => {
      const payloadText = typeof event.data === 'string' ? event.data : undefined;
      if (!payloadText) return;

      try {
        const parsed = JSON.parse(payloadText);
        if (parsed.type === 'notifications.initial' && Array.isArray(parsed.payload)) {
          setNotifications(parsed.payload.slice(0, MAX_NOTIFICATIONS));
          return;
        }

        if (parsed.type === 'notifications.new' && parsed.payload && parsed.payload.record) {
          const record = parsed.payload.record as NotificationRow;
          setNotifications(prev => {
            const deduped = prev.filter(n => n.id !== record.id);
            return [record, ...deduped].slice(0, MAX_NOTIFICATIONS);
          });
        }
      } catch (error) {
        console.error('Failed to parse notification message', error);
      }
    };

    const handleOpen = () => setStatus('open');
    const handleClose = () => setStatus('closed');
    const handleError = () => setStatus('closed');

    socket.addEventListener('message', handleMessage);
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    return () => {
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      if (socketRef.current === socket) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session?.access_token, user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    let canceled = false;
    (async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);
      if (canceled || error || !data) return;
      setNotifications(prev => {
        const merged = [...data, ...prev];
        const seen = new Set<string>();
        const deduped: NotificationRow[] = [];
        for (const notification of merged) {
          if (seen.has(notification.id)) continue;
          seen.add(notification.id);
          deduped.push(notification);
          if (deduped.length >= MAX_NOTIFICATIONS) break;
        }
        return deduped;
      });
    })();
    return () => {
      canceled = true;
    };
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
    }
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter(notification => !notification.is_read).length, [notifications]);

  return {
    notifications,
    unreadCount,
    markAllRead,
    status,
  };
}
