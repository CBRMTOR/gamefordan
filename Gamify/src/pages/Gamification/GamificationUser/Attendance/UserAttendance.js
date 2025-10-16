import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import QrScanner from 'qr-scanner';
import axios from 'axios';
import './UserAttendance.css'; 

const UserAttendance = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [cameraPermission, setCameraPermission] = useState(null);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const isProcessingRef = useRef(false); 

  const API_ATTENDANCE_URL = process.env.REACT_APP_ATTENDANCE_URL || 'http://localhost:5040/api';

  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setCameraPermission(permission.state);
        
        permission.onchange = () => {
          setCameraPermission(permission.state);
        };
      } catch (error) {
        console.warn('Camera permission API not supported:', error);
      }
    };
    
    checkCameraPermission();
  }, []);
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const scanner = new QrScanner(
      videoElement,
      result => handleScan(result),
      {
        onDecodeError: () => {},
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 2, 
        preferredCamera: 'environment', 
      }
    );

    qrScannerRef.current = scanner;

    scanner.start()
      .then(() => console.log('QR scanner started'))
      .catch(err => {
        console.error('Error starting scanner:', err);
        setMessage('Failed to start camera. Please check permissions.');
        setMessageType('error');
        setScanning(false);
        
        if (err.name === 'NotAllowedError') {
          setMessage('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setMessage('No camera found. Please check your device has a camera.');
        } else if (err.name === 'NotSupportedError') {
          setMessage('Your browser does not support QR scanning. Please try a modern browser like Chrome or Firefox.');
        } else if (err.name === 'NotReadableError') {
          setMessage('Camera is already in use by another application. Please close other camera apps and try again.');
        }
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      qrScannerRef.current = null;
    };
  }, [scanning]);

  const startScanning = () => {
    setMessage('');
    setDebugInfo('');
    setScanning(true);
    isProcessingRef.current = false;
  };

  const stopScanning = useCallback(() => {
    if (qrScannerRef.current) qrScannerRef.current.stop();
    setScanning(false);
  }, []);

  const handleScan = async (result) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    try {
      console.log('Raw QR result:', result);
      
      let sessionData;
      let qrDataString;
      if (typeof result === 'string') {
        qrDataString = result;
      } else if (typeof result === 'object' && result.data) {
        qrDataString = result.data;
      } else {
        throw new Error('Unsupported QR code format received from scanner');
      }

      console.log('QR data string:', qrDataString);
      try {
        sessionData = JSON.parse(qrDataString);
      
        if (!sessionData.sessionId || sessionData.type !== 'attendance') {
          throw new Error('Invalid QR code format: missing required fields');
        }
        
        console.log('Parsed session data:', sessionData);
      } catch (parseError) {
        console.error('Error parsing QR data:', parseError);
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const uuidMatch = qrDataString.match(uuidPattern);
        if (uuidMatch) {
          sessionData = { sessionId: uuidMatch[0] };
        } else {
          throw new Error('Could not extract sessionId from QR code');
        }
      }

      if (!sessionData.sessionId) {
        throw new Error('Invalid QR code: missing sessionId');
      }

      console.log('Extracted sessionId:', sessionData.sessionId);
      stopScanning();
    
      await submitAttendance(sessionData.sessionId);
    } catch (error) {
      console.error('Error processing QR code:', error);
      setMessage(error.message || 'Invalid QR code. Please try again or ask for a new QR code.');
      setMessageType('error');
      setTimeout(() => {
        if (qrScannerRef.current && scanning) {
          qrScannerRef.current.start();
        }
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const submitAttendance = useCallback(async (sessionId) => {
    try {
      const userData = {
        sessionId,
        username: user?.Username || user?.username || '',
        userId: user?.UserID || user?.user_id || user?.user_id || null,
        department: user?.Department || user?.department || null,
        section: user?.Section || user?.section || null,
        team: user?.Team || user?.team || null,
      };

      console.log('Submitting attendance with:', userData);
      if (!userData.username) {
        throw new Error('User information not available. Please log in again.');
      }

      const response = await axios.post(
        `${API_ATTENDANCE_URL}/attendance/submit`,
        userData,
        { 
          withCredentials: true,
          timeout: 10000 
        }
      );

      if (response.data.success) {
        setMessage(`Attendance submitted successfully for: ${response.data.sessionTitle}`);
        setMessageType('success');
      } else {
        throw new Error(response.data.error || 'Failed to submit attendance');
      }
    } catch (error) {
      console.error('Attendance submission error:', error);
      
      let errorMessage = 'Failed to submit attendance';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (errorMessage.includes('already submitted') || errorMessage.includes('already taken')) {
          errorMessage = 'You have already taken attendance for this session.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
      if (scanning && qrScannerRef.current) {
        qrScannerRef.current.start();
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, API_ATTENDANCE_URL, scanning]);
  const handleManualSubmit = async () => {
    const sessionId = prompt('Please enter the session ID:');
    if (sessionId) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(sessionId)) {
        setMessage('Invalid session ID format. Please enter a valid UUID.');
        setMessageType('error');
        return;
      }
      await submitAttendance(sessionId);
    }
  };

  return (
    <div className="user-attendance-container">
      <div className="attendance-card">
        <div className="attendance-header">
          <h2>Attendance Scanner</h2>
          <p>Scan the QR code to mark your attendance</p>
        </div>

        {message && (
          <div className={`alert-message ${messageType === 'success' ? 'success' : 'error'}`}>
            <div className="alert-icon">
              {messageType === 'success' ? '✓' : '⚠'}
            </div>
            <div className="alert-content">
              {message}
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="debug-info">
            <small>Debug: {debugInfo}</small>
          </div>
        )}

        {!scanning ? (
          <div className="scan-init-container">
            <div className="permission-status">
              {cameraPermission === 'denied' && (
                <div className="camera-warning">
                  <span className="warning-icon">⚠</span>
                  Camera access is blocked. Please allow camera permissions in your browser settings.
                </div>
              )}
            </div>
            
            <div className="scan-button-container">
              <button 
                className="btn-scan-qr primary" 
                onClick={startScanning}
                disabled={cameraPermission === 'denied'}
              >
                <span className="scan-icon">📷</span>
                Scan QR Code
              </button>
            </div>
            
            <div className="manual-fallback">
              <p className="fallback-text">Having trouble scanning?</p>
              <button className="btn-manual secondary" onClick={handleManualSubmit}>
                Enter Session ID Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="scanner-container">
            <div className="scanner-viewport">
              <video 
                ref={videoRef} 
                className="scanner-video"
                playsInline
              />
              <div className="scanner-overlay">
                <div className="scan-frame">
                  <div className="frame-corner top-left"></div>
                  <div className="frame-corner top-right"></div>
                  <div className="frame-corner bottom-left"></div>
                  <div className="frame-corner bottom-right"></div>
                </div>
                <p className="scan-instruction">Align the QR code within the frame</p>
              </div>
            </div>
            <div className="scanner-controls">
              <button className="btn-cancel secondary" onClick={stopScanning}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="instructions-container">
          <h4>How to use:</h4>
          <ol className="instructions-list">
            <li>Click "Scan QR Code" button to use your camera</li>
            <li>Allow camera permissions when prompted</li>
            <li>Point your camera at the QR code</li>
            <li>Your attendance will be submitted automatically</li>
            <li>If scanning fails, use "Enter Session ID Manually"</li>
          </ol>
          
          <div className="note-box">
            <strong>Note:</strong> If you see "QR code format error", please ask the administrator to regenerate the QR codes.
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UserAttendance);