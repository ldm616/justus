import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Send, Edit2, Trash2, Tag } from 'lucide-react';
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
  caption?: string | null;
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
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PhotoTag {
  id: string;
  photo_id: string;
  tag: string;
  created_by: string;
  created_at: string;
}

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
  const [tags, setTags] = useState<PhotoTag[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const { profile } = useUser();
  const { showToast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (photo) {
      loadComments();
      loadTags();
    }
  }, [photo, profile]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('photo_id', photo.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .select('*')
        .eq('photo_id', photo.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment || !profile) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photo.id,
          user_id: profile.id,
          comment: newComment.trim()
        })
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      
      setComments([data, ...comments]);
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
      const { error } = await supabase
        .from('photo_comments')
        .update({
          comment: editingCommentText.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('photo_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
      showToast('Comment deleted');
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('Failed to delete comment');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !profile) return;
    
    const formattedTag = newTag.trim().startsWith('#') ? newTag.trim() : `#${newTag.trim()}`;
    
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .insert({
          photo_id: photo.id,
          tag: formattedTag,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('Tag already exists');
        } else {
          throw error;
        }
        return;
      }
      
      setTags([...tags, data]);
      setNewTag('');
      setShowTagInput(false);
      showToast('Tag added');
    } catch (err) {
      console.error('Error adding tag:', err);
      showToast('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      
      setTags(tags.filter(t => t.id !== tagId));
      showToast('Tag removed');
    } catch (err) {
      console.error('Error removing tag:', err);
      showToast('Failed to remove tag');
    }
  };

  const handleUpdateCaption = async () => {
    if (!profile || profile.id !== photo.user_id) return;
    
    try {
      const { error } = await supabase
        .from('photos')
        .update({ caption: captionText.trim() || null })
        .eq('id', photo.id);

      if (error) throw error;
      
      photo.caption = captionText.trim() || null;
      setEditingCaption(false);
      showToast('Caption updated');
    } catch (err) {
      console.error('Error updating caption:', err);
      showToast('Failed to update caption');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="w-full h-full overflow-y-auto flex items-center justify-center">
        <div className="relative max-w-4xl w-full">
          {/* Image Section with controls */}
          <div className="relative bg-black">
            {/* Close button - inside image container */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Replace button - inside image container */}
            {profile && photo.user_id === profile.id && isToday && onReplace && (
              <button
                onClick={onReplace}
                className="absolute bottom-4 right-4 bg-white/10 backdrop-blur hover:bg-white/20 text-white p-3 rounded-full transition-all z-10"
                aria-label="Replace photo"
                disabled={uploading}
              >
                <RefreshCw className={`w-6 h-6 ${uploading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <img
              src={photo.medium_url || photo.photo_url}
              alt={`Photo by ${photo.username || 'User'}`}
              className="w-full object-contain max-h-[70vh]"
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Content Section */}
          {imageLoaded && (
            <div className="bg-gray-900">
              {/* Photo Info Header */}
              <div className="px-4 py-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {photo.avatar_url ? (
                      <img 
                        src={photo.avatar_url} 
                        alt={photo.username || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700" />
                    )}
                    <div>
                      <p className="font-medium">{photo.username || 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(photo.created_at)}</p>
                    </div>
                  </div>
                  
                  {profile?.id === photo.user_id && (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="p-2 hover:bg-gray-800 rounded-full"
                    >
                      <Tag className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Caption */}
                {(photo.caption || profile?.id === photo.user_id) && (
                  <div className="mt-3">
                    {editingCaption ? (
                      <div>
                        <textarea
                          value={captionText}
                          onChange={(e) => setCaptionText(e.target.value)}
                          className="w-full bg-gray-800 rounded px-3 py-2 text-sm resize-none"
                          rows={2}
                          placeholder="Add a caption..."
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleUpdateCaption}
                            className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCaption(false);
                              setCaptionText(photo.caption || '');
                            }}
                            className="text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <p className="text-sm flex-1">{photo.caption}</p>
                        {profile?.id === photo.user_id && (
                          <button
                            onClick={() => setEditingCaption(true)}
                            className="p-2 hover:bg-gray-800 rounded-full"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Display and Input */}
                <div className="mt-3">
                  {showTagInput && profile?.id === photo.user_id && (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          } else if (e.key === 'Escape') {
                            setShowTagInput(false);
                            setNewTag('');
                          }
                        }}
                        placeholder="Add tag (e.g. #vacation)"
                        className="flex-1 bg-gray-800 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={handleAddTag}
                        className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowTagInput(false);
                          setNewTag('');
                        }}
                        className="text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <span key={tag.id} className="inline-flex items-center text-xs bg-gray-800 px-2 py-1 rounded group">
                          <span>{tag.tag}</span>
                          {profile?.id === photo.user_id && (
                            <button
                              onClick={() => handleRemoveTag(tag.id)}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="px-4 py-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Comments</h3>
                
                {loadingComments ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                    {comment.profiles?.avatar_url ? (
                      <img 
                        src={comment.profiles.avatar_url}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {comment.profiles?.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {formatTimeAgo(comment.created_at)}
                            {comment.edited_at && ' (edited)'}
                          </span>
                        </div>
                        
                        {comment.user_id === profile?.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.comment);
                              }}
                              className="p-1 hover:bg-gray-800 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-gray-800 rounded text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div className="mt-1">
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
                        <p className="text-sm mt-1">{comment.comment}</p>
                      )}
                      </div>
                    </div>
                  ))}
                  </div>
                )}
                
                {/* Add Comment */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <div className="flex gap-2">
                    <textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 bg-gray-800 rounded-lg px-3 py-2 resize-none text-sm"
                      rows={1}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}