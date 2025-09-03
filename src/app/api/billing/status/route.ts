import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || ''
  );
  const { data } = await supabase.rpc('is_premium');
  return Response.json({ premium: data });
}
