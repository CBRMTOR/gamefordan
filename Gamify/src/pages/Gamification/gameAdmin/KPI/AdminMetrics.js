import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';

function AdminMetrics({ latestRound, setLatestRound, roundMetricsDisplay, setRoundMetricsDisplay }) {
  const [metrics, setMetrics] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState({});
  const [rangeLoading, setRangeLoading] = useState(false);
  const [roundDetails, setRoundDetails] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [viewTimeDialog, setViewTimeDialog] = useState(false);
  const [viewTime, setViewTime] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (latestRound > 0) {
      fetchRoundDetails(latestRound);
    }
  }, [latestRound]);
  
  useEffect(() => {
    if (roundDetails.length > 0) {
      const organizedMetrics = {};
      roundDetails.forEach(item => {
        if (!organizedMetrics[item.metric_name]) {
          organizedMetrics[item.metric_name] = [];
        }
        organizedMetrics[item.metric_name].push({
          range_from: item.range_from,
          range_to: item.range_to,
          points: item.points,
        });
      });
      setRoundMetricsDisplay(organizedMetrics);
    }
  }, [roundDetails, setRoundMetricsDisplay]);

  const fetchRoundDetails = useCallback(async (round) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/round-details/${round}`);
      setRoundDetails(response.data);
    } catch (error) {
      console.error('Error fetching round details:', error);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, []);

  const addRange = useCallback((metric) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: [...(prev[metric] || []), { range_from: '', range_to: '', points: '' }],
    }));
  }, []);

  const removeRange = useCallback((metric, index) => {
    const updated = [...(selectedMetrics[metric] || [])];
    updated.splice(index, 1);
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: updated,
    }));
  }, [selectedMetrics]);

  const updateRange = useCallback((metric, index, field, value) => {
    const updated = [...(selectedMetrics[metric] || [])];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: updated,
    }));
  }, [selectedMetrics]);

  const handleMetricSelection = useCallback((metric, checked) => {
    if (checked) {
      setSelectedMetrics(prev => ({
        ...prev,
        [metric]: prev[metric] || [{ range_from: '', range_to: '', points: '' }],
      }));
    } else {
      const newSelected = { ...selectedMetrics };
      delete newSelected[metric];
      setSelectedMetrics(newSelected);
    }
  }, [selectedMetrics]);

  const saveMetrics = useCallback(async () => {
    try {
      setRangeLoading(true);
      const data = Object.entries(selectedMetrics).map(([metric_name, ranges]) => ({
        metric_name,
        ranges: ranges.filter(range => 
          range.range_from !== '' && range.range_to !== '' && range.points !== ''
        ),
      }));

      const response = await axios.post(`${process.env.REACT_APP_KPI_URL}/save-metrics`, { data });
      setLatestRound(response.data.round);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (error) {
      console.error('Error saving metrics:', error);
      setUploadStatus('error');
    } finally {
      setRangeLoading(false);
    }
  }, [selectedMetrics, setLatestRound]);

  const downloadTemplate = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/kpi/template`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'kpi_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) {
      setUploadStatus('error');
      return;
    }

    try {
      setRangeLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      if (viewTime) {
        await axios.post(`${process.env.REACT_APP_KPI_URL}/kpi/set-view-time`, { viewTime });
      }

      const response = await axios.post(`${process.env.REACT_APP_KPI_URL}/kpi/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus('success');
      setSelectedFile(null);
      setViewTime('');
      setViewTimeDialog(false);
      
      if (window.refreshLeaderboard) {
        window.refreshLeaderboard();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('error');
    } finally {
      setRangeLoading(false);
    }
  }, [selectedFile, viewTime]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setViewTimeDialog(true);
    }
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Define Performance Ranges
      </Typography>

      {uploadStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Operation completed successfully!
        </Alert>
      )}
      {uploadStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          An error occurred. Please try again.
        </Alert>
      )}

      {rangeLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2}>
        {metrics.map(metric => (
          <Grid item xs={12} key={metric}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!selectedMetrics[metric]}
                    onChange={(e) => handleMetricSelection(metric, e.target.checked)}
                  />
                }
                label={<Typography variant="subtitle1">{metric.replace(/_/g, ' ').toUpperCase()}</Typography>}
              />
              
              {selectedMetrics[metric]?.map((range, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    label="From"
                    value={range.range_from}
                    onChange={(e) => updateRange(metric, index, 'range_from', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="To"
                    value={range.range_to}
                    onChange={(e) => updateRange(metric, index, 'range_to', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Points"
                    value={range.points}
                    onChange={(e) => updateRange(metric, index, 'points', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeRange(metric, index)}
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                </Box>
              ))}
              
              {selectedMetrics[metric] && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addRange(metric)}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Add Range
                </Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={saveMetrics}
          disabled={Object.keys(selectedMetrics).length === 0 || rangeLoading}
        >
          Save Metrics
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
        
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadIcon />}
        >
          Upload KPI Data
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
        </Button>
      </Box>

      {/* View Time Dialog */}
      <Dialog open={viewTimeDialog} onClose={() => setViewTimeDialog(false)}>
        <DialogTitle>Set View Time</DialogTitle>
        <DialogContent>
          <TextField
            label="View Time"
            type="datetime-local"
            value={viewTime}
            onChange={(e) => setViewTime(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewTimeDialog(false)}>Cancel</Button>
          <Button onClick={handleFileUpload} variant="contained">
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminMetrics;