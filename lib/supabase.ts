import { createClient } from '@supabase/supabase-js';

// During Next.js build-time prerendering, NEXT_PUBLIC_* env vars are undefined
// (they live in .env.local which is gitignored / not on the deployment server).
// createClient throws if url is empty — use placeholder strings so the module
// loads cleanly. No real API calls are ever made during SSR/prerender since
// all consumer components are 'use client'.
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://nljtrilrephwybtakaxc.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_BP6RTNgur2Sys8Zz5W2zvg_fbPckZsr'
);
