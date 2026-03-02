import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jnsmuahytbczeiwumrdw.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc211YWh5dGJjemVpd3VtcmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzQxMjQsImV4cCI6MjA4ODA1MDEyNH0.18l60HfZqY17_A2Mg7J2NJjX7KRIgTBnLmp9pGPLbWc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
