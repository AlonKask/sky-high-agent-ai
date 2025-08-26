-- Enhanced email analytics and performance tracking
CREATE TABLE IF NOT EXISTS public.email_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email_id UUID REFERENCES public.email_exchanges(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    subject_line TEXT NOT NULL,
    email_type TEXT NOT NULL DEFAULT 'general',
    recipient_email TEXT NOT NULL,
    ai_score INTEGER DEFAULT 50 CHECK (ai_score >= 0 AND ai_score <= 100),
    sentiment_score NUMERIC(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    conversion_value NUMERIC(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email A/B testing results
CREATE TABLE IF NOT EXISTS public.email_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    test_name TEXT NOT NULL,
    variant_a_subject TEXT NOT NULL,
    variant_b_subject TEXT NOT NULL,
    variant_a_sends INTEGER DEFAULT 0,
    variant_b_sends INTEGER DEFAULT 0,
    variant_a_opens INTEGER DEFAULT 0,
    variant_b_opens INTEGER DEFAULT 0,
    variant_a_clicks INTEGER DEFAULT 0,
    variant_b_clicks INTEGER DEFAULT 0,
    variant_a_replies INTEGER DEFAULT 0,
    variant_b_replies INTEGER DEFAULT 0,
    winner_variant TEXT CHECK (winner_variant IN ('a', 'b', 'tie')),
    confidence_score NUMERIC(5,4) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI email suggestions and improvements
CREATE TABLE IF NOT EXISTS public.ai_email_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    original_content TEXT NOT NULL,
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('subject_line', 'tone', 'content', 'cta', 'personalization')),
    original_text TEXT,
    suggested_text TEXT NOT NULL,
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    improvement_reason TEXT,
    accepted BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced RLS policies
ALTER TABLE public.email_performance_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own email analytics" ON public.email_performance_analytics
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.email_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own A/B tests" ON public.email_ab_tests
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_email_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own AI suggestions" ON public.ai_email_suggestions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_performance_user_sent ON public.email_performance_analytics(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_performance_template ON public.email_performance_analytics(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_performance_type ON public.email_performance_analytics(email_type, sent_at);
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_status ON public.email_ab_tests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_type ON public.ai_email_suggestions(user_id, suggestion_type, created_at);