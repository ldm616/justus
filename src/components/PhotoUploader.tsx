import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Group {
  id: string;
  name: string;
}

interface PhotoUploaderProps {
  onUploadComplete?: () => void;
}

export default function PhotoUploader({ onUploadComplete }: PhotoUploaderProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('memberships')
      .select('group_id, groups(id, name)')
      .eq('user_id', user.id);

    const groupList = data?.map((m: any) => ({
      id: m.groups.id,
      name: m.groups.name
    })) || [];

    setGroups(groupList);
    if (groupList.length > 0) {
      setSelectedGroup(groupList[0].id);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedGroup) return;

    setUploading(true);
    setError('');

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('group_id', selectedGroup);
      formData.append('caption', caption);

      const response = await fetch('/api/process-photo', {
        method: 'POST',
        headers: {
          'x-sb-access-token': session.session.access_token
        },
        body: formData
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setCaption('');
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You need to join or create a group first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Group</label>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Caption (optional)</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a caption..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Photo for Today</label>
        <input
          type="date"
          value={new Date().toISOString().split('T')[0]}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
        />
        <p className="text-xs text-gray-500 mt-1">You can only upload or replace today's photo</p>
      </div>

      {!preview ? (
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-gray-600">Click to select a photo</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          <img src={preview} alt="Preview" className="w-full rounded-lg" />
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Choose different photo
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {preview && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload photo'}
        </button>
      )}
    </div>
  );
}