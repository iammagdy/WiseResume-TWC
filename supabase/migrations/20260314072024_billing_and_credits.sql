-- US5: Billing & Credits Integration
-- Created: 2026-03-14

-- 1. Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'Free',
    status TEXT NOT NULL DEFAULT 'active',
    ai_credits_monthly INTEGER DEFAULT 10,
    ai_credits_topup INTEGER DEFAULT 0,
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ DEFAULT (now() + interval '1 month'),
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create credit_transactions table (Ledger)
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL, -- negative for usage, positive for grant/top-up
    "type" public.credit_type_enum NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.credit_transactions 
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Credit Management RPCs (Security Definer to prevent client tampering)
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(amount_to_deduct INTEGER, usage_description TEXT)
RETURNS JSONB AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Calculate current balanced credits (monthly + topup)
    SELECT (ai_credits_monthly + ai_credits_topup) INTO current_credits
    FROM public.subscriptions
    WHERE user_id = auth.uid();

    IF current_credits < amount_to_deduct THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- Prioritize deducting from monthly allowance first
    UPDATE public.subscriptions
    SET 
        ai_credits_monthly = CASE 
            WHEN ai_credits_monthly >= amount_to_deduct THEN ai_credits_monthly - amount_to_deduct 
            ELSE 0 
        END,
        ai_credits_topup = CASE 
            WHEN ai_credits_monthly < amount_to_deduct THEN ai_credits_topup - (amount_to_deduct - ai_credits_monthly)
            ELSE ai_credits_topup
        END,
        updated_at = now()
    WHERE user_id = auth.uid();

    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, "type", description)
    VALUES (auth.uid(), -amount_to_deduct, 'usage', usage_description);

    RETURN jsonb_build_object('success', true, 'remaining_credits', (current_credits - amount_to_deduct));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger to handle new user subscription initialization
CREATE OR REPLACE FUNCTION public.initialize_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_init_subscription AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.initialize_subscription();

-- Initialize subscriptions for existing users
INSERT INTO public.subscriptions (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.subscriptions IS 'User billing and AI credit allowance.';
COMMENT ON TABLE public.credit_transactions IS 'Immutable ledger of all AI credit events.';
