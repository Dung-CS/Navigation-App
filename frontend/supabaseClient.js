import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wgvwnwktvdpyawccralb.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_mgDGC7gCvBgSsFr559tJHw_6GfgBcHa';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export {supabase};
