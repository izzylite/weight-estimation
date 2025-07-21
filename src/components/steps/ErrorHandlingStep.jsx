import React, { useState } from 'react'
import './ErrorHandlingStep.css'

const ErrorHandlingStep = ({
  error,
  errorDetails,
  onRetry,
  onStartOver,
  onGoBack,
  onChangeSettings,
  onCheckConfiguration,
  disabled = false
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  // Parse error type and provide specific guidance
  const getErrorInfo = (errorMessage) => {
    const message = errorMessage?.toLowerCase() || ''
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'timeout',
        icon: '⏰',
        title: 'Request Timed Out',
        description: 'The operation took longer than expected to complete.',
        severity: 'warning',
        canRetry: true,
        suggestions: [
          'Try again - server load may have decreased',
          'Switch to Turbo Mode for faster processing',
          'Check your internet connection stability',
          'Consider trying during off-peak hours'
        ]
      }
    }
    
    if (message.includes('generation failed') || message.includes('failed')) {
      return {
        type: 'generation_failed',
        icon: '❌',
        title: 'Generation Failed',
        description: 'The 3D model generation process encountered an error.',
        severity: 'error',
        canRetry: true,
        suggestions: [
          'Try uploading a different image with better lighting',
          'Ensure the object is clearly visible and well-framed',
          'Check if the image format is supported (JPG, PNG)',
          'Try reducing image file size if very large'
        ]
      }
    }
    
    if (message.includes('api token') || message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth_error',
        icon: '🔑',
        title: 'Authentication Error',
        description: 'There\'s an issue with your API token configuration.',
        severity: 'error',
        canRetry: false,
        suggestions: [
          'Check that your Replicate API token is correctly entered',
          'Verify the token has the required permissions',
          'Ensure the token hasn\'t expired',
          'Try generating a new API token from Replicate'
        ]
      }
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        type: 'rate_limit',
        icon: '🚦',
        title: 'Rate Limit Exceeded',
        description: 'You\'ve made too many requests in a short time.',
        severity: 'warning',
        canRetry: true,
        suggestions: [
          'Wait a few minutes before trying again',
          'Consider upgrading your Replicate plan for higher limits',
          'Reduce the frequency of requests',
          'Try again during off-peak hours'
        ]
      }
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('cors')) {
      return {
        type: 'network_error',
        icon: '🌐',
        title: 'Network Connection Error',
        description: 'Unable to connect to the required services.',
        severity: 'error',
        canRetry: true,
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable any VPN or proxy that might interfere',
          'Check if your firewall is blocking the connection'
        ]
      }
    }
    
    if (message.includes('server error') || message.includes('500') || message.includes('503')) {
      return {
        type: 'server_error',
        icon: '🔧',
        title: 'Server Error',
        description: 'The service is experiencing technical difficulties.',
        severity: 'error',
        canRetry: true,
        suggestions: [
          'Try again in a few minutes',
          'The issue is likely temporary',
          'Check Replicate\'s status page for known issues',
          'Contact support if the problem persists'
        ]
      }
    }
    
    // Default/unknown error
    return {
      type: 'unknown',
      icon: '⚠️',
      title: 'Unexpected Error',
      description: 'An unexpected error occurred during processing.',
      severity: 'error',
      canRetry: true,
      suggestions: [
        'Try the operation again',
        'Check your input data and settings',
        'Refresh the page if the problem persists',
        'Contact support with the error details below'
      ]
    }
  }

  const errorInfo = getErrorInfo(error)

  const handleRetry = () => {
    if (onRetry && !disabled) {
      onRetry()
    }
  }

  const handleStartOver = () => {
    if (onStartOver && !disabled) {
      onStartOver()
    }
  }

  const handleGoBack = () => {
    if (onGoBack && !disabled) {
      onGoBack()
    }
  }

  const handleChangeSettings = () => {
    if (onChangeSettings && !disabled) {
      onChangeSettings()
    }
  }

  const handleCheckConfiguration = () => {
    if (onCheckConfiguration && !disabled) {
      onCheckConfiguration()
    }
  }

  return (
    <div className="step-section error-handling-step">
      <div className="error-content">
        {/* Error Header */}
        <div className="error-header">
          <div className="error-icon" data-severity={errorInfo.severity}>
            {errorInfo.icon}
          </div>
          <h3>{errorInfo.title}</h3>
          <p className="error-description">{errorInfo.description}</p>
        </div>

        {/* Error Message */}
        <div className="error-message-section">
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
          
          {errorDetails && (
            <div className="error-details-toggle">
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowDetails(!showDetails)}
                disabled={disabled}
              >
                {showDetails ? '▼' : '▶'} Technical Details
              </button>
              
              {showDetails && (
                <div className="error-details">
                  <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="suggestions-section">
          <h4>💡 Suggested Solutions</h4>
          <ul className="suggestions-list">
            {errorInfo.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {/* Troubleshooting */}
        <div className="troubleshooting-section">
          <button
            type="button"
            className="toggle-button"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            disabled={disabled}
          >
            {showTroubleshooting ? '▼' : '▶'} Advanced Troubleshooting
          </button>
          
          {showTroubleshooting && (
            <div className="troubleshooting-content">
              <div className="troubleshooting-item">
                <h5>🔍 Check Connection</h5>
                <p>Verify that the development server proxy is working and you can reach external APIs.</p>
              </div>
              
              <div className="troubleshooting-item">
                <h5>🔑 Verify API Configuration</h5>
                <p>Ensure your Replicate API token is valid and has the necessary permissions.</p>
              </div>
              
              <div className="troubleshooting-item">
                <h5>📊 Check Service Status</h5>
                <p>Visit <a href="https://status.replicate.com" target="_blank" rel="noopener noreferrer">Replicate Status</a> to check for known issues.</p>
              </div>
              
              <div className="troubleshooting-item">
                <h5>🖼️ Image Requirements</h5>
                <p>Ensure your image is clear, well-lit, and shows the object from a good angle. Supported formats: JPG, PNG.</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="error-actions">
          <div className="primary-actions">
            {errorInfo.canRetry && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRetry}
                disabled={disabled}
              >
                🔄 Try Again
              </button>
            )}
            
            {errorInfo.type === 'auth_error' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCheckConfiguration}
                disabled={disabled}
              >
                🔧 Check Configuration
              </button>
            )}
            
            {(errorInfo.type === 'timeout' || errorInfo.type === 'generation_failed') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleChangeSettings}
                disabled={disabled}
              >
                ⚙️ Change Settings
              </button>
            )}
          </div>
          
          <div className="secondary-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleGoBack}
              disabled={disabled}
            >
              ← Go Back
            </button>
            
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleStartOver}
              disabled={disabled}
            >
              🏠 Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorHandlingStep
