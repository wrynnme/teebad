import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublicKey) {
	throw new Error(
		'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
	);
}

// ใช้ public key เท่านั้น — frontend ใช้สำหรับ Realtime subscriptions
export const supabase = createClient(supabaseUrl, supabasePublicKey, {
	realtime: {
		params: {
			eventsPerSecond: 10,
		},
	},
});
