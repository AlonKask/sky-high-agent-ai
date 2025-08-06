-- Clear all dummy data from tables
TRUNCATE TABLE public.client_memories, public.user_memories, public.sales_memories, public.memory_interactions CASCADE;
TRUNCATE TABLE public.email_exchanges CASCADE;
TRUNCATE TABLE public.requests CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.quotes CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.notifications CASCADE;