import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';

interface Group {
  id: string;
  name: string;
  role: string;
}

export default function Profile() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadGroups();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name);
      }
    }
  }

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('memberships')
      .select('group_id, role, groups(id, name)')
      .eq('user_id', user.id);

    const groupList = data?.map(m => ({
      id: m.groups.id,
      name: m.groups.name,
      role: m.role
    })) || [];

    setGroups(groupList);
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Profile updated successfully');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password changed successfully');
      setNewPassword('');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (!error) {
      loadGroups();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto mt-8 px-4 space-y-8">
        <h1 className="text-2xl font-bold">Profile</h1>

        {/* Profile Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Update Profile
          </button>
        </form>

        {/* Change Password */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Change Password</h2>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Change
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Groups</h2>
          {groups.length === 0 ? (
            <p className="text-gray-500">You're not in any groups yet.</p>
          ) : (
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="font-medium">{group.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({group.role})</span>
                  </div>
                  <button
                    onClick={() => handleLeaveGroup(group.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Leave
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Log out
        </button>
      </div>
    </>
  );
}