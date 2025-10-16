import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
const primaryBlue = "#0072BB";
const secondaryGreen = "#15A245";
const darkBlue = "#004E80";
const lightGray = "#f8f9fa";
const white = "#ffffff";

function AdvisorDetailsModal({ advisor, metrics, roundMetricsDisplay, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  if (!advisor) return null;
  const metricDetails = typeof advisor.metric_details === 'string' 
    ? JSON.parse(advisor.metric_details) 
    : advisor.metric_details || {};

  const getPointsForMetric = (metricName, value) => {
    if (!value || value === '') return 0;
    const numericValue = parseFloat(value);
    const metricRanges = (roundMetricsDisplay && roundMetricsDisplay[metricName]) || [];
    for (const range of metricRanges) {
      if (numericValue >= range.range_from && numericValue <= range.range_to) {
        return range.points;
      }
    }
    return 0;
  };
  const metricsArray = Array.isArray(metrics) ? metrics : [];
  const metricKeys = metricsArray.length > 0 
    ? metricsArray 
    : Object.keys(metricDetails);

  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
          color: white,
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
          Advisor Performance Details
        </Typography>
        <IconButton
          edge="end"
          onClick={onClose}
          sx={{ color: white }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: lightGray }}>
        <Card sx={{ mb: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: darkBlue, mb: { xs: 1, sm: 0 } }}>
                {advisor.advisor_name}
              </Typography>
              <Box sx={{ 
                background: secondaryGreen, 
                color: white, 
                px: 2, 
                py: 1, 
                borderRadius: 2,
                textAlign: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 300 }}>
                  Total Points
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {advisor.total_points}
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 600, color: darkBlue, mr: 1 }}>
                    Extension ID:
                  </Box>
                  {advisor.extension_id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 600, color: darkBlue, mr: 1 }}>
                    Round:
                  </Box>
                  {advisor.round}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 600, color: darkBlue, mr: 1 }}>
                    Last Updated:
                  </Box>
                  {advisor.view_time ? new Date(advisor.view_time).toLocaleString() : 'Not set'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Typography variant="h6" sx={{ mb: 2, color: darkBlue, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '6px', height: '6px', borderRadius: '50%', background: primaryBlue, mr: 1 }}></Box>
          Metric Performance
        </Typography>
        
        {metricKeys.length === 0 ? (
          <Card sx={{ p: 3, textAlign: 'center', boxShadow: 2 }}>
            <Typography variant="body1" color="text.secondary">
              No metric data available for this advisor
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {metricKeys.map(metric => {
              const metricData = metricDetails[metric] || {};
              const metricValue = metricData.value || 0;
              const points = metricData.points || getPointsForMetric(metric, metricValue);
              
              return (
                <Grid item xs={12} sm={6} key={metric}>
                  <Card sx={{ 
                    height: '100%', 
                    boxShadow: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle2" component="h4" sx={{ 
                        fontWeight: 600, 
                        color: darkBlue,
                        textTransform: 'capitalize',
                        mb: 2,
                        fontSize: '0.9rem'
                      }}>
                        {metric.replace(/_/g, ' ')}
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          Value:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {metricValue}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          Points:
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 700, 
                          color: points > 0 ? secondaryGreen : 'text.secondary'
                        }}>
                          {points}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdvisorDetailsModal;