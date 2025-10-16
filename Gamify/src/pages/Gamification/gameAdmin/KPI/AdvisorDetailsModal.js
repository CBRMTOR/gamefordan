import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

function AdvisorDetailsModal({ advisor, metrics, roundMetricsDisplay, onClose }) {
  if (!advisor) return null;

  const metricDetails = advisor.metric_details || {};

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #0072BB 0%, #004E80 100%)', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">Advisor Performance Details</Typography>
        <Button 
          onClick={onClose} 
          sx={{ 
            color: 'white', 
            minWidth: 'auto',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#004E80' }}>
            {advisor.advisor_name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Extension: ${advisor.extension_id}`} 
              variant="outlined" 
              sx={{ borderColor: '#0072BB', color: '#0072BB' }}
            />
            <Chip 
              label={`Total Points: ${advisor.total_points}`} 
              sx={{ 
                background: 'linear-gradient(135deg, #15A245 0%, #80C41C 100%)', 
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            <Chip 
              label={`Submitted: ${new Date(advisor.submitted_at).toLocaleString()}`} 
              variant="outlined" 
            />
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f8f9fa' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#004E80' }}>Metric</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#004E80' }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#004E80' }}>Points Earned</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(metricDetails).map(([metric, details]) => (
                <TableRow key={metric}>
                  <TableCell sx={{ color: '#495057' }}>
                    {metric.replace(/_/g, ' ').toUpperCase()}
                  </TableCell>
                  <TableCell sx={{ color: '#495057' }}>
                    {details.value || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={details.points || 0} 
                      size="small"
                      sx={{ 
                        background: details.points > 0 ? 
                          'linear-gradient(135deg, #15A245 0%, #80C41C 100%)' : 
                          '#e9ecef',
                        color: details.points > 0 ? 'white' : '#6c757d',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {Object.keys(metricDetails).length === 0 && (
          <Typography variant="body2" sx={{ textAlign: 'center', p: 3, color: '#6c757d' }}>
            No metric details available for this advisor.
          </Typography>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e9ecef' }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #0072BB 0%, #004E80 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #004E80 0%, #003153 100%)',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AdvisorDetailsModal;