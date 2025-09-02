import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('=== Supabase Initialization ===');
console.log('URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);
console.log('Anon Key length:', supabaseAnonKey?.length);
console.log('Environment:', import.meta.env.MODE);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Create client with enhanced options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'justus-auth'
  },
  global: {
    headers: {
      'x-client-info': 'justus-app'
    }
  },
  db: {
    schema: 'public'
  }
});

console.log('Supabase client created');

// Enhanced connection test with timeout
const testInitialConnection = async () => {
  const startTime = Date.now();
  
  try {
    // Set a timeout for the connection test
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), 5000);
    });
    
    const sessionPromise = supabase.auth.getSession();
    
    const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
    const elapsed = Date.now() - startTime;
    
    if (result && 'data' in result) {
      const { data, error } = result;
      if (error) {
        console.error(`❌ Session check failed (${elapsed}ms):`, error.message);
      } else {
        console.log(`✅ Session check OK (${elapsed}ms)`, {
          hasSession: !!(data as any)?.session,
          user: (data as any)?.session?.user?.email
        });
      }
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Connection test failed (${elapsed}ms):`, err.message);
  }
};

// Run the test
testInitialConnection();

// Export a helper to test connection
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  
  try {
    // Try a simple auth check
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth check:', { 
      success: !authError, 
      hasSession: !!authData?.session,
      error: authError?.message 
    });
    
    // Try a simple database query
    const { error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();
    
    console.log('Database check:', { 
      success: !dbError, 
      error: dbError?.message 
    });
    
    return { authOk: !authError, dbOk: !dbError };
  } catch (err: any) {
    console.error('Connection test error:', err);
    return { authOk: false, dbOk: false, error: err.message };
  }
};