-- Create portfolio_history table for revision history
CREATE TABLE public.portfolio_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    portfolio_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
CREATE POLICY "Users can view own portfolio history" ON public.portfolio_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio history" ON public.portfolio_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio history" ON public.portfolio_history
    FOR DELETE USING (auth.uid() = user_id);

-- Optional index for faster lookups by user
CREATE INDEX idx_portfolio_history_user_id ON public.portfolio_history(user_id);
