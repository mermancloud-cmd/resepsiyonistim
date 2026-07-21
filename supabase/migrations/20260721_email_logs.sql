-- E-posta gönderim logları tablosu
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'transactional',
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
