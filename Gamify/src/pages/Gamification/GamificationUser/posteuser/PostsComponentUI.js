import React, { useState, useMemo } from 'react';
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
export const PostCard = React.memo(({ 
  post, 
  userId, 
  onMenuOpen, 
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
const API_BASE_URL = process.env.REACT_APP_API_USER_POSTS_URL; 
const mediaUrl = `${API_BASE_URL}${post.media_url}`;
  const getFileType = (url) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    return 'document';
  };

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

export const CreatePostCard = ({ 
  user, 
  newPostContent, 
  setNewPostContent, 
  selectedFile, 
  isUploading, 
  uploadProgress, 
  error, 
  handleFileChange, 
  removeFile, 
  handleCreatePost, 
  getFullProfilePictureUrl 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
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
  );
};

export const EditPostDialog = ({ 
  isEditing, 
  cancelEdit, 
  editPostContent, 
  setEditPostContent, 
  editPreviewUrl, 
  handleEditFileChange, 
  removeEditFile, 
  handleEditPost, 
  isUploading 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
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
  );
};

export const DeleteDialog = ({ 
  deleteDialogOpen, 
  cancelDelete, 
  confirmDeletePost 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
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
  );
};

export const PostMenu = ({ 
  anchorEl, 
  handleMenuClose, 
  handleEditClick, 
  handleDeleteClick, 
  posts, 
  currentPostId 
}) => {
  return (
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
  );
};

export const LoadingSpinner = () => (
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

export const PostsContainer = ({ children, isMobile }) => (
  <Box sx={{ 
    background: lightBlue,
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden'
  }}>
    {children}
  </Box>
);