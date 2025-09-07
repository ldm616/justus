import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Camera } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const isFormValid = () => {
    return email.trim() !== '' && 
           password.length >= 6 && 
           username.trim().length >= 2 && 
           avatarFile !== null;
  };

  const handleDisabledClick = () => {
    showToast('Please complete the form');
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `public/${userId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      return data?.publicUrl ?? null;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err; // Propagate error to be handled in submit
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (username.length < 2) {
      setError('Username must be at least 2 characters');
      setLoading(false);
      return;
    }

    if (!avatarFile) {
      setError('Profile photo is required');
      setLoading(false);
      return;
    }

    try {
      // 1) Sign up with username in metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim() } }
      });

      if (signUpError) throw signUpError;
      
      const user = data.user;
      if (!user) throw new Error('No user returned from signUp.');

      // 2) Upload avatar (mandatory)
      const avatar_url = await uploadAvatar(user.id, avatarFile);

      // 3) Update the profile row created by DB trigger
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(), 
          avatar_url 
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;

      // 4) Navigate to home
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-[50px]">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Sign Up</h1>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 text-red-400 rounded">
                {error}
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex justify-center">
              <label className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden relative shadow-md">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-center text-sm text-gray-400">
              Add a profile photo (required)
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Choose a username"
                maxLength={15}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder=""
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <button
              type={isFormValid() ? "submit" : "button"}
              disabled={loading || !isFormValid()}
              onClick={!isFormValid() ? handleDisabledClick : undefined}
              className="btn-primary w-full disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>

            <div className="text-center pt-4">
              <div className="text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-500 hover:text-blue-400">
                  Log in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;