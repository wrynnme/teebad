import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
}

// ใช้ service key — bypass RLS สำหรับ server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: { persistSession: false },
});
