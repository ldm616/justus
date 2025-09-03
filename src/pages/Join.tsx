import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, RefreshCw, Eye, EyeOff, Camera } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = searchParams.get('token');

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('File must be an image');
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const loadInvitation = async () => {
    if (!token) {
      console.error('No token in URL');
      showToast('Invalid invitation link');
      navigate('/login');
      return;
    }

    console.log('Loading invitation with token:', token);

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

      console.log('Invitation query result:', { data, error });

      if (error || !data) {
        console.error('Failed to load invitation:', error);
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
    if (!invitation || !email || !password || !username || !avatarFile) {
      showToast('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    setJoining(true);
    
    try {
      // Sign up the new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError?.message?.includes('already registered')) {
        showToast('This email is already registered. Please use a different email or contact your family admin.');
        setJoining(false);
        return;
      } else if (signUpError) {
        throw signUpError;
      }

      const userId = signUpData.user!.id;

      // Upload avatar
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { cacheControl: '31536000', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // Create or update profile for new user
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: username.trim(),
          avatar_url: avatarUrl,
          family_id: invitation.family_id
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }
      

      // Add user to family
      await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          user_id: userId,
          role: 'member'
        });

      // Profile already has family_id from upsert above, no need to update again

      // Mark invitation as used
      await supabase
        .from('family_invitations')
        .update({ 
          used: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      showToast(`Welcome to ${invitation.families.name}!`);
      
      // Force a page reload to ensure UserContext picks up the new profile
      window.location.href = '/';
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
            Create your account to start sharing daily photos
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <label className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  required
                />
                <p className="text-xs text-gray-400 text-center mt-2">
                  {avatarFile ? 'Click to change' : 'Add photo *'}
                </p>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder={invitation.email}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Choose a username (max 15 chars)"
                maxLength={15}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="Choose a password (min 6 chars)"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={joining || !email || !password || !username || !avatarFile}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {joining && <RefreshCw className="w-5 h-5 animate-spin" />}
              Join family
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}