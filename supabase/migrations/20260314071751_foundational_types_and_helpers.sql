-- Foundational Types and Helpers
-- Created: 2026-03-14

-- 1. ENUM Types
DO $$ BEGIN
    CREATE TYPE public.career_level_enum AS ENUM ('Entry', 'Mid', 'Senior', 'Lead', 'Executive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.industry_enum AS ENUM ('Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.theme_enum AS ENUM ('modern', 'neo', 'minimal', 'classic', 'glass', 'dark');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.message_type_enum AS ENUM ('inquiry', 'request', 'system', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.credit_type_enum AS ENUM ('grant', 'purchase', 'usage', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Soft Delete Helpers
-- Function to toggle soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE TG_TABLE_NAME
        SET is_deleted = true, deleted_at = now()
        WHERE id = OLD.id;
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policy Helpers
-- Standard "User can manage own data" policy template
-- USAGE: CREATE POLICY "Users can manage own messages" ON messages FOR ALL USING (auth.uid() = user_id AND is_deleted = false);

-- 4. Common Updated At Trigger (ensure it exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Harden New User Trigger (pre-emptive fix for migration conflicts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- These will be expanded in later migrations, but we need the function to be safe now
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TYPE public.career_level_enum IS 'Standardized career levels for profile normalization.';
COMMENT ON TYPE public.industry_enum IS 'Standardized industry categories.';
COMMENT ON TYPE public.theme_enum IS 'Available portfolio themes.';
COMMENT ON TYPE public.message_type_enum IS 'Types for consolidated messaging table.';
COMMENT ON TYPE public.credit_type_enum IS 'Transaction types for AI credit ledger.';
