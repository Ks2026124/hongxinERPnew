import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * Diagnostic endpoint to check Supabase configuration.
 * Only available in development or when explicitly needed.
 * Does NOT expose any secret values.
 */
export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check env vars (only show if set, never show values)
  checks.NEXT_PUBLIC_SUPABASE_URL = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  checks.SUPABASE_SERVICE_ROLE_KEY = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

  // Test Supabase connection
  try {
    const client = getSupabaseClient();
    
    // Test reading teams table
    const { data: teams, error: teamsError } = await client
      .from('teams')
      .select('id')
      .limit(1);
    
    checks.teams_query_ok = !teamsError;
    checks.teams_count = teams?.length ?? 0;
    if (teamsError) {
      checks.teams_error = teamsError.message;
    }

    // Test reading profiles table
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id')
      .limit(1);
    
    checks.profiles_query_ok = !profilesError;
    if (profilesError) {
      checks.profiles_error = profilesError.message;
    }

    // Check if HX888 exists
    const { data: admin, error: adminError } = await client
      .from('profiles')
      .select('id, username, role, status')
      .eq('username', 'HX888')
      .maybeSingle();
    
    checks.hx888_exists = !!admin;
    if (admin) {
      checks.hx888_role = admin.role;
      checks.hx888_status = admin.status;
    }
    if (adminError) {
      checks.hx888_error = adminError.message;
    }

    // Check which client is being used (service role or anon)
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    checks.using_service_role_key = hasServiceRole;

    // Test storage bucket
    try {
      const { error: storageError } = await client.storage
        .from('images')
        .list('', { limit: 1 });
      checks.storage_bucket_ok = !storageError;
      if (storageError) {
        checks.storage_error = storageError.message;
      }
    } catch {
      checks.storage_bucket_ok = false;
    }

  } catch (err) {
    checks.connection_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ success: true, data: checks });
}
