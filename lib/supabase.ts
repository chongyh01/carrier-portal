import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  'https://linlnqrroavcutfpmkiz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbmxucXJyb2F2Y3V0ZnBta2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDI5NTgsImV4cCI6MjA5NjIxODk1OH0.lb8CzjTWfzRYPwbm1FU-JCRiA4BPgyhCIRBq2h4t6Qk'
)
