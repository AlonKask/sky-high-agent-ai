-- Create option_reviews table for client review portal
CREATE TABLE public.option_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  request_id UUID,
  quote_ids UUID[] NOT NULL,
  client_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on option_reviews
ALTER TABLE public.option_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for option_reviews
CREATE POLICY "Users can create their own option reviews" ON public.option_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own option reviews" ON public.option_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own option reviews" ON public.option_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index on client_token for fast lookups
CREATE INDEX idx_option_reviews_client_token ON public.option_reviews(client_token);

-- Create updated_at trigger
CREATE TRIGGER update_option_reviews_updated_at
  BEFORE UPDATE ON public.option_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();