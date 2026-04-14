BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'notification_type'
  ) THEN
    CREATE TYPE public.notification_type AS ENUM (
      'seller_application',
      'order_update',
      'chat_message',
      'system',
      'alert'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'conversation_channel'
  ) THEN
    CREATE TYPE public.conversation_channel AS ENUM (
      'user_seller',
      'seller_admin'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
COMMIT;
