import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';

interface InvitationDetails {
  id: string;
  email: string;
  family_id: string;
  families: {
    name: string;
  };
}

export default function Join() {
  const [searchParams] = useSearchParams();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = searchParams.get('token');

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      showToast('Invalid invitation link');
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          id,
          email,
          family_id,
          used,
          families (
            name
          )
        `)
        .eq('invite_token', token)
        .single();

      if (error || !data) {
        showToast('Invalid or expired invitation');
        navigate('/login');
        return;
      }

      if (data.used) {
        showToast('This invitation has already been used');
        navigate('/login');
        return;
      }

      setInvitation(data as any);
      setEmail(data.email);
    } catch (err) {
      console.error('Error loading invitation:', err);
      showToast('Failed to load invitation');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !email || !password) return;

    setJoining(true);
    
    try {
      // Try to sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      let userId: string;

      if (signUpError?.message?.includes('already registered')) {
        // User exists, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          showToast('Invalid credentials');
          setJoining(false);
          return;
        }

        userId = signInData.user.id;
      } else if (signUpError) {
        throw signUpError;
      } else {
        userId = signUpData.user!.id;

        // Create profile for new user
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: email.split('@')[0].substring(0, 15),
            family_id: invitation.family_id
          });
      }

      // Add user to family
      await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          user_id: userId,
          role: 'member'
        });

      // Update profile with family_id if needed
      await supabase
        .from('profiles')
        .update({ family_id: invitation.family_id })
        .eq('id', userId);

      // Mark invitation as used
      await supabase
        .from('family_invitations')
        .update({ 
          used: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      showToast(`Welcome to ${invitation.families.name}!`);
      navigate('/');
    } catch (err: any) {
      console.error('Error joining family:', err);
      showToast(err.message || 'Failed to join family');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-[80px] md:pt-[60px]">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Join {invitation.families.name}
          </h1>
          <p className="text-gray-400">
            You've been invited to share daily photos with your family
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the email address the invitation was sent to
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Choose a secure password"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {email === invitation.email ? 'Create' : 'Enter'} your password
              </p>
            </div>

            <button
              type="submit"
              disabled={joining || !email || !password}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {joining && <RefreshCw className="w-5 h-5 animate-spin" />}
              Join Family
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}