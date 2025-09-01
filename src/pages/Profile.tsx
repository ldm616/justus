import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Footer from '../components/Footer';

export default function Profile() {
  const [display, setDisplay] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [elbowHurt, setElbowHurt] = useState<'left' | 'right' | 'both' | ''>('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
      if (data?.display_name) setDisplay(data.display_name);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: display }).eq('user_id', user.id);
    setMsg(error ? error.message : 'Profile updated successfully!');
    setTimeout(() => setMsg(''), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gelbow</h1>
            </div>
            <nav className="flex gap-6">
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900">Home</button>
              <button className="text-gray-600 hover:text-gray-900">Check-in</button>
              <button className="text-gray-600 hover:text-gray-900">Rehab</button>
              <button className="text-gray-600 hover:text-gray-900">Recovery</button>
              <button className="text-gray-600 hover:text-gray-900">Activity</button>
            </nav>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-8">Profile</h2>

          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {display.charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{display || 'User'}</h3>
              <p className="text-gray-500">{email}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={display}
                onChange={e=>setDisplay(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Malcolm"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">Max 20 characters. Letters, numbers, dashes, and underscores.</p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
              />
            </div>

            {/* Which Elbow Hurts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Which elbow hurts?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setElbowHurt('left')}
                  className={`px-6 py-2 rounded-lg border transition-colors ${
                    elbowHurt === 'left' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Left Elbow
                </button>
                <button
                  type="button"
                  onClick={() => setElbowHurt('right')}
                  className={`px-6 py-2 rounded-lg border transition-colors ${
                    elbowHurt === 'right' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Right Elbow
                </button>
                <button
                  type="button"
                  onClick={() => setElbowHurt('both')}
                  className={`px-6 py-2 rounded-lg border transition-colors ${
                    elbowHurt === 'both' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Both
                </button>
              </div>
            </div>

            {msg && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                {msg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Log Out →
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}