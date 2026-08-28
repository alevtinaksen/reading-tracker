import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lyuczttevtovpjlndagt.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AleSKAWSvH4Fv9m0X2ly6g_A9elesfQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
