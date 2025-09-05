import { useState, useEffect } from 'react';
import { X, RefreshCw, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { formatTimeAgo } from '../utils/timeFormat';
import { useToast } from '../contexts/ToastContext';

interface Photo {
  id: string;
  user_id: string;
  photo_url: string;
  medium_url?: string;
  thumbnail_url: string;
  created_at: string;
  upload_date: string;
  username?: string | null;
  avatar_url?: string | null;
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  comment: string;
  edited_at: string | null;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

// interface PhotoTag {
//   id: string;
//   photo_id: string;
//   tag: string;
//   created_by: string;
//   created_at: string;
// }

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onReplace?: () => void;
  uploading?: boolean;
  isToday?: boolean;
}

export default function PhotoModal({ photo, onClose, onReplace, uploading = false, isToday = false }: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({});
  // const [tags, setTags] = useState<PhotoTag[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const { profile } = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    if (photo) {
      loadComments();
      // loadTags();
    }
  }, [photo, profile]);

  const loadComments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session');
        return;
      }

      const response = await fetch(`/.netlify/functions/comments?photo_id=${photo.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load comments: ${response.status}`);
      }

      const data = await response.json();
      setComments(data || []);

      // Load profiles for commenters
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c: Comment) => c.user_id))];
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        
        if (profileData) {
          const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
          profileData.forEach(p => {
            profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url };
          });
          setProfiles(profileMap);
        }
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // const loadTags = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('photo_tags')
  //       .select('*')
  //       .eq('photo_id', photo.id)
  //       .order('created_at', { ascending: true });

  //     if (error) throw error;
  //     setTags(data || []);
  //   } catch (err) {
  //     console.error('Error loading tags:', err);
  //   }
  // };


  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment || !profile) return;

    setSubmittingComment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/.netlify/functions/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photo_id: photo.id,
          comment: newComment.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      const data = await response.json();
      setComments([data, ...comments]);
      
      // Add current user's profile if not already in map
      if (profile && !profiles[profile.id]) {
        setProfiles({
          ...profiles,
          [profile.id]: { username: profile.username || 'Anonymous', avatar_url: profile.avatarUrl }
        });
      }
      
      setNewComment('');
      showToast('Comment added');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      showToast(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/.netlify/functions/comments', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment_id: commentId,
          comment: editingCommentText.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, comment: editingCommentText.trim(), edited_at: new Date().toISOString() }
          : c
      ));
      setEditingCommentId(null);
      setEditingCommentText('');
      showToast('Comment updated');
    } catch (err) {
      console.error('Error editing comment:', err);
      showToast('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(`/.netlify/functions/comments?comment_id=${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments(comments.filter(c => c.id !== commentId));
      showToast('Comment deleted');
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('Failed to delete comment');
    }
  };



  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full md:w-[650px] max-h-[90vh] overflow-y-auto">
        {/* Image Section with overlay buttons */}
        <div className="relative bg-black w-full md:w-[650px] md:h-[650px]">
          {/* Close button - top right of image */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Replace button - bottom right of image */}
          {profile && photo.user_id === profile.id && isToday && onReplace && (
            <div className="absolute bottom-4 right-4 group">
              <button
                onClick={onReplace}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-10"
                disabled={uploading}
                aria-label="Replace today's photo"
              >
                <RefreshCw className={`w-5 h-5 ${uploading ? 'animate-spin' : ''}`} />
              </button>
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Replace today's photo
              </div>
            </div>
          )}

          <img
            src={photo.medium_url || photo.photo_url}
            alt={`Photo by ${photo.username || 'User'}`}
            className="w-full h-full object-contain"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>

        {/* Comments Section - always visible */}
        {imageLoaded && (
          <div className="bg-gray-900 w-full md:w-[650px]">
            {/* Original Poster Info */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                {photo.avatar_url ? (
                  <img 
                    src={photo.avatar_url} 
                    alt={photo.username || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-sm">{photo.username || 'Anonymous'}</span>
                  <span className="text-sm text-gray-400 ml-2">{formatTimeAgo(photo.created_at)}</span>
                </div>
                <button className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex flex-col h-[300px]">
              {/* Instagram-style Comment Input - Fixed at top */}
              <div className="border-b border-gray-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
                  />
                  {newComment.trim() && (
                    <button
                      onClick={handleAddComment}
                      disabled={submittingComment}
                      className="text-blue-500 font-semibold text-sm hover:text-blue-400 disabled:opacity-50"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
              
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {loadingComments ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map(comment => {
                      const commenterProfile = profiles[comment.user_id];
                      return (
                      <div key={comment.id} className="flex gap-3">
                        {commenterProfile?.avatar_url ? (
                          <img 
                            src={commenterProfile.avatar_url}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          {editingCommentId === comment.id ? (
                            <div>
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full bg-gray-800 rounded px-2 py-1 text-sm resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }}
                                  className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm">
                                <span className="font-semibold mr-2">
                                  {commenterProfile?.username || 'Anonymous'}
                                </span>
                                <span className="font-normal">
                                  {comment.comment}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-400">
                                  {formatTimeAgo(comment.created_at)}
                                  {comment.edited_at && ' (edited)'}
                                </span>
                                {comment.user_id === profile?.id && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentText(comment.comment);
                                      }}
                                      className="text-xs text-gray-400 hover:text-gray-300"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-xs text-gray-400 hover:text-red-400"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}