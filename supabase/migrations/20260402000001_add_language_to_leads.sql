-- Add language column to leads table
ALTER TABLE public.leads ADD COLUMN language TEXT NOT NULL DEFAULT 'mix' CHECK (language IN ('gujarati', 'hindi', 'mix'));

-- Create an index on language for faster filtering
CREATE INDEX idx_leads_language ON public.leads(language);

-- Create an index on status and language combined for optimized queries
CREATE INDEX idx_leads_status_language ON public.leads(status, language);
