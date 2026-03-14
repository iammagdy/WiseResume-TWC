-- US6: Consolidate Messaging Tables
-- Created: 2026-03-14

-- 1. Create consolidated messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- Optional: sender user_id
    email TEXT NOT NULL,
    full_name TEXT,
    subject TEXT,
    content TEXT NOT NULL,
    "type" public.message_type_enum NOT NULL DEFAULT 'inquiry',
    status TEXT DEFAULT 'unread',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages" ON public.messages 
    FOR ALL USING (auth.uid() = user_id AND is_deleted = false);
CREATE POLICY "Admins can view all messages" ON public.messages 
    FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@thewise.cloud');

-- 3. Data Migration Logic
DO $$ 
DECLARE 
    inq RECORD;
    req RECORD;
BEGIN
    -- Migrate from contact_inquiries
    FOR inq IN SELECT table_name FROM information_schema.tables WHERE table_name = 'contact_inquiries' AND table_schema = 'public' LOOP
        EXECUTE 'INSERT INTO public.messages (email, full_name, subject, content, type, created_at) 
                 SELECT email, name, subject, message, ''inquiry'', created_at FROM public.contact_inquiries';
    END LOOP;

    -- Migrate from contact_requests
    FOR req IN SELECT table_name FROM information_schema.tables WHERE table_name = 'contact_requests' AND table_schema = 'public' LOOP
        EXECUTE 'INSERT INTO public.messages (email, full_name, content, type, created_at) 
                 SELECT email, full_name, message, ''request'', created_at FROM public.contact_requests';
    END LOOP;
END $$;

-- 4. Triggers
CREATE TRIGGER trigger_soft_delete_messages
    BEFORE DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

-- 5. Drop Legacy Tables (Delayed/Manual cleanup recommended, but scripted here for completion)
-- DROP TABLE IF EXISTS public.contact_inquiries;
-- DROP TABLE IF EXISTS public.contact_requests;

COMMENT ON TABLE public.messages IS 'Unified table for all contact/inquiry/support communications.';
COMMENT ON COLUMN public.messages.type IS 'Extensible categorization (inquiry, request, etc).';
