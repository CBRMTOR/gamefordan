import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Box, Typography, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../../../../context/AuthContext';
import {
  PostCard,
  CreatePostCard,
  EditPostDialog,
  DeleteDialog,
  PostMenu,
  LoadingSpinner,
  PostsContainer
} from './PostsComponentUI';

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

const PostsComponent = () => {
  const { user } = useAuth();
  const userId = user?.user_id;

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <PostsContainer>
<Container 
  maxWidth="md" 
  sx={{ 
    p: 0,
    pt: 4,
    minHeight: '100vh',
    maxWidth: '100% !important'
  }}
>
        <CreatePostCard
          user={user}
          newPostContent={newPostContent}
          setNewPostContent={setNewPostContent}
          selectedFile={selectedFile}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          error={error}
          handleFileChange={handleFileChange}
          removeFile={removeFile}
          handleCreatePost={handleCreatePost}
          getFullProfilePictureUrl={getFullProfilePictureUrl}
        />
        <EditPostDialog
          isEditing={isEditing}
          cancelEdit={cancelEdit}
          editPostContent={editPostContent}
          setEditPostContent={setEditPostContent}
          editPreviewUrl={editPreviewUrl}
          handleEditFileChange={handleEditFileChange}
          removeEditFile={removeEditFile}
          handleEditPost={handleEditPost}
          isUploading={isUploading}
        />
        <DeleteDialog
          deleteDialogOpen={deleteDialogOpen}
          cancelDelete={cancelDelete}
          confirmDeletePost={confirmDeletePost}
        />
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
            <PostMenu
              anchorEl={anchorEl}
              handleMenuClose={handleMenuClose}
              handleEditClick={handleEditClick}
              handleDeleteClick={handleDeleteClick}
              posts={posts}
              currentPostId={currentPostId}
            />
            {posts.map((post, index) => {
              if (index === posts.length - 1) {
                return (
                  <div key={post.post_id} ref={lastPostRef}>
                    <PostCard
                      post={post}
                      userId={userId}
                      onMenuOpen={handleMenuOpen}
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
    </PostsContainer>
  );
};

export default PostsComponent;