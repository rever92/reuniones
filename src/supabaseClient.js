import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://updvdfelgmbctztclaee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZHZkZmVsZ21iY3R6dGNsYWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MTAwNTcsImV4cCI6MjA0MjQ4NjA1N30.0Jnf1iDGOtNpVe3sgdYKtRgkKuatYbZ3Ns2euJ0uJCs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)