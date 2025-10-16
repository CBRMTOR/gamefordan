import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardMedia,
  Avatar,
  Typography,
  TextField,
  Button,
  Container,
  IconButton,
  Stack,
  LinearProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../../../context/AuthContext';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CancelIcon from '@mui/icons-material/Cancel';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const primaryBlue = "#0072BB";
const secondaryGreen = "#15A245";
const accentGreen = "#80C41C";
const darkBlue = "#004E80";
const lightBlue = "#E8F4FD";
const white = "#ffffff";
const black = "#212529";
const lightGray = "#f8f9fa";
const darkGray = "#495057";
const yellow = "#FFD700";

const API_BASE_URL = process.env.REACT_APP_API_USER_POSTS_URL; 
const PROFILE_PIC_BASE_URL = process.env.REACT_APP_PROFILE_PIC_BASE_URL;
const PostCard = React.memo(({ 
  post, 
  userId, 
  onMenuOpen, 
  onEditClick, 
  onDeleteClick,
  getFullProfilePictureUrl 
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const needsTruncation = post.content && post.content.length > 150;
  const truncatedContent = useMemo(() => {
    if (!post.content) return '';
    return post.content.length > 150 
      ? post.content.substring(0, 150) + '...' 
      : post.content;
  }, [post.content]);

  const getFileType = useCallback((url) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    return 'document';
  }, []);

  return (
    <Card sx={{ 
      mb: 2,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      borderLeft: `3px solid ${primaryBlue}`,
      mx: isMobile ? 0 : 1,
      width: '100%'
    }}>
      <CardHeader
        avatar={
          <Avatar 
            src={getFullProfilePictureUrl(post.profile_picture || post.user?.profile_picture)} 
            sx={{ 
              width: 40,
              height: 40,
              background: `linear-gradient(135deg, ${primaryBlue} 0%, ${secondaryGreen} 100%)`,
              fontWeight: 'bold',
              color: white,
              fontSize: '1rem'
            }}
          >
            {post.username ? post.username.charAt(0).toUpperCase() : 'U'}
          </Avatar>
        }
        title={
          <Typography sx={{ fontWeight: 600, color: darkBlue, fontSize: '0.95rem' }}>
            {post.username || post.user?.username || 'Unknown User'}
          </Typography>
        }
        subheader={
          <Typography variant="body2" sx={{ color: darkGray, fontSize: '0.75rem' }}>
            {new Date(post.created_at).toLocaleString()}
          </Typography>
        }
        action={
          post.user_id === userId && (
            <IconButton 
              aria-label="settings" 
              onClick={(e) => onMenuOpen(e, post.post_id)}
              sx={{ color: darkBlue }}
              size="small"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{
          p: 2,
          '& .MuiCardHeader-content': {
            overflow: 'hidden'
          }
        }}
      />
      <CardContent sx={{ p: 2, pt: 0 }}>
        {post.content && (
          <Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: black, 
                lineHeight: 1.5,
                fontSize: '0.9rem'
              }}
            >
              {expanded ? post.content : truncatedContent}
            </Typography>
            {needsTruncation && (
              <Button
                onClick={() => setExpanded(!expanded)}
                endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{
                  color: primaryBlue,
                  fontSize: '0.8rem',
                  p: 0,
                  mt: 0.5,
                  minWidth: 'auto',
                  textTransform: 'none'
                }}
              >
                {expanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </Box>
        )}
        {post.media_url && (
          <Box sx={{ mt: 2 }}>
            {getFileType(post.media_url) === 'image' && (
              <CardMedia
                component="img"
                image={`${API_BASE_URL}${post.media_url}`}
                alt="Post media"
                loading="lazy"
                sx={{
                  maxHeight: 300,
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: 1,
                  border: `1px solid ${lightGray}`
                }}
              />
            )}
            {getFileType(post.media_url) === 'video' && (
              <CardMedia
                component="video"
                src={`${API_BASE_URL}${post.media_url}`}
                controls
                preload="metadata"
                sx={{
                  maxHeight: 300,
                  width: '100%',
                  borderRadius: 1,
                  border: `1px solid ${lightGray}`
                }}
              />
            )}
            {getFileType(post.media_url) === 'audio' && (
              <CardMedia
                component="audio"
                src={`${API_BASE_URL}${post.media_url}`}
                controls
                preload="metadata"
                sx={{
                  width: '100%',
                  mt: 1,
                  borderRadius: 1
                }}
              />
            )}
            {getFileType(post.media_url) === 'document' && (
              <Box sx={{ 
                p: 1.5, 
                border: `1px solid ${lightGray}`,
                borderRadius: '6px',
                background: lightGray,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-file-pdf" style={{ color: '#e74c3c' }}></i>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Document Attachment</Typography>
                <Button
                  variant="outlined"
                  href={`${API_BASE_URL}${post.media_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    ml: 'auto',
                    color: darkBlue,
                    borderColor: primaryBlue,
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    p: 0.5,
                    minWidth: 'auto',
                    '&:hover': {
                      borderColor: darkBlue,
                      backgroundColor: `${lightBlue}`
                    }
                  }}
                >
                  View/Download
                </Button>
              </Box>
            )}
          </Box>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          gap: '10px', 
          borderTop: `1px solid ${lightGray}`,
          paddingTop: '0.75rem',
          mt: 2
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: darkGray,
            cursor: 'pointer',
            transition: 'color 0.3s',
            '&:hover': {
              color: primaryBlue
            }
          }}>
            <i className="far fa-heart" style={{ fontSize: '0.9rem' }}></i>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Like</Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: darkGray,
            cursor: 'pointer',
            transition: 'color 0.3s',
            '&:hover': {
              color: primaryBlue
            }
          }}>
            <i className="far fa-comment" style={{ fontSize: '0.9rem' }}></i>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Comment</Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: darkGray,
            cursor: 'pointer',
            transition: 'color 0.3s',
            '&:hover': {
              color: primaryBlue
            }
          }}>
            <i className="far fa-share-square" style={{ fontSize: '0.9rem' }}></i>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Share</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

PostCard.displayName = 'PostCard';

const PostsComponent = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pagination, setPagination] = useState({
    hasMore: true,
    nextCursor: null
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const observer = useRef();

  const getFullProfilePictureUrl = useCallback((profilePic) => {
    if (!profilePic) return '/default-avatar.jpg';
    if (profilePic.startsWith('http')) return profilePic;
    return `${PROFILE_PIC_BASE_URL}/${profilePic}`;
  }, []);

  const fetchPosts = useCallback(async (cursor = null, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '10');
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/posts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const responseData = await response.json();
      if (!responseData.data || !Array.isArray(responseData.data)) {
        throw new Error('Invalid response format');
      }
      
      if (isLoadMore) {
        setPosts(prevPosts => {
          const newPosts = responseData.data.filter(newPost => 
            !prevPosts.some(prevPost => prevPost.post_id === newPost.post_id)
          );
          return [...prevPosts, ...newPosts];
        });
      } else {
        setPosts(responseData.data);
      }
      
      setPagination({
        hasMore: responseData.pagination?.hasMore || false,
        nextCursor: responseData.pagination?.nextCursor || null
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again later.');
      if (!isLoadMore) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMorePosts = useCallback(() => {
    if (pagination.nextCursor && pagination.hasMore && !loadingMore) {
      fetchPosts(pagination.nextCursor, true);
    }
  }, [pagination.nextCursor, pagination.hasMore, loadingMore, fetchPosts]);
  const lastPostRef = useCallback(node => {
    if (loadingMore || !pagination.hasMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasMore && !loadingMore) {
        loadMorePosts();
      }
    }, {
      threshold: 0.1, 
      rootMargin: '100px'
    });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, pagination.hasMore, loadMorePosts]);

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleEditFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setEditSelectedFile(file);
      setEditPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const removeEditFile = useCallback(() => {
    setEditSelectedFile(null);
    setEditPreviewUrl(null);
  }, []);

  const handleCreatePost = useCallback(async () => {
    if (!userId) {
      setError('Authentication required. Please log in.');
      return;
    }

    if (!newPostContent.trim() && !selectedFile) {
      setError('Post must have content or a file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('content', newPostContent);
      formData.append('userId', userId);
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prevPosts => [newPost, ...prevPosts]);
        setNewPostContent('');
        setSelectedFile(null);
        setUploadProgress(0);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  }, [userId, newPostContent, selectedFile]);
  const handleMenuOpen = useCallback((event, postId) => {
    setAnchorEl(event.currentTarget);
    setCurrentPostId(postId);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setCurrentPostId(null);
  }, []);
  const handleEditClick = useCallback((post) => {
    setEditingPostId(post.post_id);
    setEditPostContent(post.content || '');
    setEditPreviewUrl(post.media_url ? `${API_BASE_URL}${post.media_url}` : null);
    setIsEditing(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleEditPost = useCallback(async () => {
    if (!editingPostId) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('content', editPostContent);
      formData.append('userId', userId);
      
      if (editSelectedFile) {
        formData.append('media', editSelectedFile);
      }

      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch(`${API_BASE_URL}/api/posts/${editingPostId}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }

      const updatedPost = await response.json();
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.post_id === editingPostId ? updatedPost : post
        )
      );
      cancelEdit();
    } catch (error) {
      console.error('Error updating post:', error);
      setError(error.message || 'Failed to update post');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  }, [editingPostId, editPostContent, editSelectedFile, userId]);

  const confirmDeletePost = useCallback(async () => {
    if (!postToDelete) return;

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const response = await fetch(`${API_BASE_URL}/api/posts/${postToDelete.post_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId: userId })
      });

      if (response.ok) {
        setPosts(prevPosts => 
          prevPosts.filter(post => post.post_id !== postToDelete.post_id)
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError(error.message || 'Failed to delete post');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  }, [postToDelete, userId]);

  const cancelEdit = useCallback(() => {
    setEditingPostId(null);
    setEditPostContent('');
    setEditSelectedFile(null);
    setEditPreviewUrl(null);
    setIsEditing(false);
  }, []);
  const handleDeleteClick = useCallback((post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  }, []);
  const PostMenu = useMemo(() => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      sx={{
        '& .MuiPaper-root': {
          background: white,
          borderRadius: '8px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }
      }}
    >
      <MenuItem 
        onClick={() => handleEditClick(posts.find(post => post.post_id === currentPostId))} 
        sx={{ 
          color: darkBlue,
          transition: 'background-color 0.3s',
          fontSize: '0.9rem',
          '&:hover': {
            backgroundColor: lightBlue,
            color: primaryBlue
          }
        }}
      >
        <EditIcon sx={{ mr: 1, color: darkBlue, fontSize: '1.1rem' }} /> Edit
      </MenuItem>
      <MenuItem 
        onClick={() => handleDeleteClick(posts.find(post => post.post_id === currentPostId))} 
        sx={{ 
          color: 'error.main',
          transition: 'background-color 0.3s',
          fontSize: '0.9rem',
          '&:hover': {
            backgroundColor: lightBlue,
          }
        }}
      >
        <DeleteIcon sx={{ mr: 1, color: 'error.main', fontSize: '1.1rem' }} /> Delete
      </MenuItem>
    </Menu>
  ), [anchorEl, currentPostId, posts, handleMenuClose, handleEditClick, handleDeleteClick]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, var(--dark-blue) 0%, var(--primary-blue) 100%)'
      }}>
        <CircularProgress sx={{ color: white }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      background: lightBlue,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Container 
        maxWidth="md" 
        sx={{ 
          p: isMobile ? 1 : 2,
          minHeight: '100vh',
          maxWidth: '100% !important'
        }}
      >
        
        <Card sx={{ 
          mb: 2, 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          background: white,
          borderLeft: '3px solid transparent',
          mx: isMobile ? 0 : 1
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Avatar 
                src={getFullProfilePictureUrl(user?.profile_picture)} 
                sx={{ 
                  mr: 2,
                  width: 40,
                  height: 40,
                  background: `linear-gradient(135deg, ${primaryBlue} 0%, ${secondaryGreen} 100%)`,
                  fontWeight: 'bold',
                  color: white,
                  fontSize: '1rem'
                }} 
              >
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <TextField
                fullWidth
                placeholder="Share something with the community..."
                variant="outlined"
                size="small"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    background: white,
                    fontSize: '0.9rem',
                    '& fieldset': {
                      border: `1px solid ${lightGray}`,
                    },
                    '&:hover fieldset': {
                      borderColor: primaryBlue
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: primaryBlue
                    }
                  }
                }}
              />
            </Box>

            {selectedFile && (
              <Box sx={{ 
                mb: 2, 
                p: 1.5, 
                border: `1px dashed ${accentGreen}`,
                borderRadius: '6px',
                background: `${accentGreen}12`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </Typography>
                </Box>
                <IconButton onClick={removeFile} size="small" sx={{ color: darkBlue }}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {isUploading && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: secondaryGreen
                    }
                  }}
                />
                <Typography variant="caption" display="block" textAlign="right" sx={{ color: darkBlue, fontSize: '0.7rem' }}>
                  {uploadProgress}%
                </Typography>
              </Box>
            )}

            {error && (
              <Box sx={{ color: 'error.main', mb: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{error}</Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1} justifyContent="space-between">
              <div>
                <input
                  accept="*/*"
                  style={{ display: 'none' }}
                  id="post-file-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="post-file-upload">
                  <Button
                    component="span"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    disabled={isUploading}
                    sx={{
                      color: darkBlue,
                      background: lightGray,
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      '&:hover': {
                        background: '#e2e6ea',
                      }
                    }}
                  >
                    Attach
                  </Button>
                </label>
              </div>
              <Button
                variant="contained"
                onClick={handleCreatePost}
                disabled={(!newPostContent.trim() && !selectedFile) || isUploading}
                sx={{
                  backgroundColor: primaryBlue,
                  color: white,
                  fontWeight: 600,
                  borderRadius: '6px',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  '&:hover': {
                    backgroundColor: darkBlue,
                  },
                  '&:disabled': {
                    opacity: 0.7
                  }
                }}
              >
                Post
              </Button>
            </Stack>
          </CardContent>
        </Card>
        
        <Dialog 
          open={isEditing} 
          onClose={cancelEdit} 
          fullWidth 
          maxWidth="md"
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ 
            background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
            color: white,
            fontWeight: 600,
            p: 2,
            fontSize: '1rem'
          }}>
            Edit Post
          </DialogTitle>
          <DialogContent sx={{ mt: 1, background: lightGray, p: 2 }}>
            <TextField
              fullWidth
              placeholder="Edit your post..."
              variant="outlined"
              size="small"
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              multiline
              rows={isMobile ? 6 : 4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  background: white,
                  fontSize: '0.9rem',
                  '& fieldset': {
                    border: `1px solid ${lightGray}`,
                  }
                }
              }}
            />
            
            {editPreviewUrl && (
              <Box sx={{ mt: 2 }}>
                {editPreviewUrl.startsWith('blob:') ? (
                  <CardMedia
                    component="img"
                    image={editPreviewUrl}
                    alt="Post media"
                    sx={{
                      maxHeight: 250,
                      width: '100%',
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />
                ) : (
                  <CardMedia
                    component="img"
                    image={editPreviewUrl}
                    alt="Post media"
                    loading="lazy"
                    sx={{
                      maxHeight: 250,
                      width: '100%',
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />
                )}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={removeEditFile}
                    startIcon={<CancelIcon />}
                    sx={{ 
                      borderColor: 'error.main', 
                      color: 'error.main',
                      borderRadius: '6px',
                      fontSize: '0.75rem'
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            )}
            
            <Box sx={{ mt: 2 }}>
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="edit-post-file-upload"
                type="file"
                onChange={handleEditFileChange}
              />
              <label htmlFor="edit-post-file-upload">
                <Button
                  component="span"
                  startIcon={<AttachFileIcon />}
                  size="small"
                  sx={{ 
                    mr: 1, 
                    color: darkBlue,
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  Change File
                </Button>
              </label>
            </Box>
          </DialogContent>
          <DialogActions sx={{ background: lightGray, p: 2 }}>
            <Button 
              onClick={cancelEdit} 
              sx={{ 
                color: darkBlue,
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditPost}
              variant="contained"
              disabled={isUploading}
              sx={{
                backgroundColor: primaryBlue,
                color: white,
                borderRadius: '6px',
                fontSize: '0.8rem',
                '&:hover': {
                  backgroundColor: darkBlue,
                }
              }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
        
        <Dialog open={deleteDialogOpen} onClose={cancelDelete} fullScreen={isMobile}>
          <DialogTitle sx={{ 
            background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
            color: white,
            fontWeight: 600,
            p: 2,
            fontSize: '1rem'
          }}>
            Delete Post
          </DialogTitle>
          <DialogContent sx={{ mt: 1, p: 2 }}>
            <Typography sx={{ fontSize: '0.9rem' }}>Are you sure you want to delete this post?</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={cancelDelete} 
              sx={{ 
                color: darkBlue,
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDeletePost}
              variant="contained"
              sx={{
                backgroundColor: primaryBlue,
                color: white,
                borderRadius: '6px',
                fontSize: '0.8rem',
                '&:hover': {
                  backgroundColor: darkBlue,
                }
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        
        {error && posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ fontSize: '0.9rem' }}>{error}</Typography>
          </Box>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ fontSize: '0.9rem' }}>No posts yet. Be the first to share something!</Typography>
          </Box>
        ) : (
          <>
            {PostMenu}
            {posts.map((post, index) => {
              if (index === posts.length - 1) {
                return (
                  <div key={post.post_id} ref={lastPostRef}>
                    <PostCard
                      post={post}
                      userId={userId}
                      onMenuOpen={handleMenuOpen}
                      onEditClick={handleEditClick}
                      onDeleteClick={handleDeleteClick}
                      getFullProfilePictureUrl={getFullProfilePictureUrl}
                    />
                  </div>
                );
              }
              return (
                <PostCard
                  key={post.post_id}
                  post={post}
                  userId={userId}
                  onMenuOpen={handleMenuOpen}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteClick}
                  getFullProfilePictureUrl={getFullProfilePictureUrl}
                />
              );
            })}
            
            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={30} sx={{ color: primaryBlue }} />
              </Box>
            )}
            
            {!pagination.hasMore && posts.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography sx={{ fontSize: '0.9rem', color: darkGray }}>
                  No more posts to load
                </Typography>
              </Box>
            )}
            
            {!loadingMore && pagination.hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Button
                  variant="outlined"
                  onClick={loadMorePosts}
                  sx={{
                    color: primaryBlue,
                    borderColor: primaryBlue,
                    '&:hover': {
                      backgroundColor: lightBlue,
                      borderColor: darkBlue
                    }
                  }}
                >
                  Load More Posts
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default PostsComponent;