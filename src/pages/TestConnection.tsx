import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TestConnection() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection...');
    
    try {
      // Test 1: Basic connection
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      const elapsed = Date.now() - startTime;
      
      if (error) {
        setResult(`Connection failed: ${error.message}\nTime: ${elapsed}ms`);
      } else {
        setResult(`Connection successful!\nResponse time: ${elapsed}ms\nSupabase is working properly.`);
      }
      
      // Test 2: Auth health check
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setResult(prev => `${prev}\n\nAuth Error: ${sessionError.message}`);
      } else {
        setResult(prev => `${prev}\n\nAuth Status: ${session?.session ? 'Logged in' : 'Not logged in'}`);
      }
      
    } catch (err: any) {
      setResult(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSignup = async () => {
    setLoading(true);
    setResult('Testing signup...');
    
    try {
      const testEmail = `test${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
      });
      
      if (error) {
        setResult(`Signup test failed: ${error.message}`);
      } else if (data?.user) {
        setResult(`Signup test successful! User created: ${data.user.email}\nNote: This is a test user, you may want to delete it.`);
        // Clean up - sign out
        await supabase.auth.signOut();
      } else {
        setResult('Signup test returned no data');
      }
    } catch (err: any) {
      setResult(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">Connection Test</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Test your Supabase connection
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={testConnection}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Database Connection
          </button>
          
          <button
            onClick={testSignup}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Signup Flow
          </button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <a href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}