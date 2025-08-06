-- Fix RingCentral integration issues

-- First, update the messages table to support call records
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add support for Call message type
ALTER TABLE public.messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('SMS', 'MMS', 'Call'));

-- Add call-specific fields that are missing
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS call_duration INTEGER DEFAULT 0;

-- Update any existing call records that might be failing
UPDATE public.messages 
SET message_type = 'Call' 
WHERE content LIKE '%call%' OR content LIKE '%Call%';