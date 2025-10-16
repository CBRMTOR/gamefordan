import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, Avatar, Stack, 
  LinearProgress, useTheme, styled 
} from '@mui/material';
import axios from 'axios';
import { 
  EmojiEvents as TrophyIcon,
  Person as PersonIcon 
} from '@mui/icons-material';
import confetti from 'canvas-confetti';

const Champions = () => {
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_LEADERBOARD_URL}?limit=3`);
        
        if (response.data.length > 0) {
          setTopPerformers(response.data);
          confetti({
            particleCount: 30,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (err) {
        setError('Failed to load leaderboard data');
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#8DC63F';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3,
        gap: 2
      }}>
        <TrophyIcon sx={{ 
          fontSize: 36,
          color: '#FFD700',
          filter: 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))'
        }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(90deg, #ff00aa 0%, #00ccff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Quiz Champions
        </Typography>
      </Box>

      {topPerformers.length === 0 ? (
        <Typography>No top performers yet. Be the first!</Typography>
      ) : (
        <Stack 
          direction="row" 
          spacing={3} 
          justifyContent="center"
          sx={{ mb: 4 }}
        >
          {topPerformers[1] && (
            <Card 
              sx={{ 
                width: 200, 
                p: 3, 
                textAlign: 'center',
                transform: 'translateY(20px)',
                background: 'linear-gradient(135deg, rgba(192,192,192,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                border: '1px solid rgba(192,192,192,0.3)'
              }}
            >
              <Box sx={{ 
                position: 'relative',
                mb: 2
              }}>
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto',
                    bgcolor: 'rgba(192,192,192,0.3)',
                    border: '3px solid #C0C0C0'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box sx={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#C0C0C0',
                  color: 'white',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  2
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {topPerformers[1].username || 'Anonymous'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {topPerformers[1].quiz_title}
              </Typography>
              <Typography variant="h5" sx={{ color: '#C0C0C0', fontWeight: 800 }}>
                {topPerformers[1].score}%
              </Typography>
            </Card>
          )}
          {topPerformers[0] && (
            <Card 
              sx={{ 
                width: 240, 
                p: 3, 
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                border: '1px solid rgba(255,215,0,0.5)',
                boxShadow: '0 10px 20px rgba(255,215,0,0.2)'
              }}
            >
              <Box sx={{ 
                position: 'relative',
                mb: 2
              }}>
                <Avatar
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    mx: 'auto',
                    bgcolor: 'rgba(255,215,0,0.3)',
                    border: '4px solid #FFD700'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 50 }} />
                </Avatar>
                <Box sx={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#FFD700',
                  color: 'white',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }}>
                  1
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {topPerformers[0].username || 'Anonymous'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {topPerformers[0].quiz_title}
              </Typography>
              <Typography variant="h4" sx={{ color: '#FFD700', fontWeight: 900 }}>
                {topPerformers[0].score}%
              </Typography>
            </Card>
          )}
          {topPerformers[2] && (
            <Card 
              sx={{ 
                width: 200, 
                p: 3, 
                textAlign: 'center',
                transform: 'translateY(20px)',
                background: 'linear-gradient(135deg, rgba(205,127,50,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                border: '1px solid rgba(205,127,50,0.3)'
              }}
            >
              <Box sx={{ 
                position: 'relative',
                mb: 2
              }}>
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto',
                    bgcolor: 'rgba(205,127,50,0.3)',
                    border: '3px solid #CD7F32'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box sx={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#CD7F32',
                  color: 'white',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  3
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {topPerformers[2].username || 'Anonymous'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {topPerformers[2].quiz_title}
              </Typography>
              <Typography variant="h5" sx={{ color: '#CD7F32', fontWeight: 800 }}>
                {topPerformers[2].score}%
              </Typography>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default Champions;