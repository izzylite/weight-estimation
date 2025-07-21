import { useState, useEffect } from 'react'
import './ProgressIndicator.css'

/**
 * Enhanced progress indicator with detailed status and infinite animation
 * @param {Object} props Component props
 * @param {string} props.status Current status message
 * @param {boolean} props.isActive Whether the progress is active
 * @param {string} props.additionalInfo Additional information to display
 */
const ProgressIndicator = ({ status, isActive, additionalInfo }) => {
  const [dots, setDots] = useState('.')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [progressPhase, setProgressPhase] = useState(0)

  // Animated dots for loading indicator
  useEffect(() => {
    if (!isActive) return

    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)

    return () => clearInterval(dotsInterval)
  }, [isActive])

  // Track elapsed time
  useEffect(() => {
    if (!isActive) {
      setElapsedTime(0)
      return
    }

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive])

  // Update progress phase based on elapsed time and status
  useEffect(() => {
    if (!isActive) return

    // Determine progress phase based on status and time
    if (status.includes('Generating 3D model')) {
      if (elapsedTime < 30) {
        setProgressPhase(0) // Initial setup
      } else if (elapsedTime < 90) {
        setProgressPhase(1) // Processing image
      } else if (elapsedTime < 180) {
        setProgressPhase(2) // Generating geometry
      } else {
        setProgressPhase(3) // Finalizing model
      }
    } else if (status.includes('Analyzing volume')) {
      setProgressPhase(4) // Volume analysis
    }
  }, [elapsedTime, status, isActive])

  // Format elapsed time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Get detailed status message based on progress phase
  const getDetailedStatus = () => {
    if (!isActive) return ''

    switch (progressPhase) {
      case 0:
        return 'Initializing AI model and preparing your image...'
      case 1:
        return 'Processing image and detecting object boundaries...'
      case 2:
        return 'Generating 3D geometry from image features...'
      case 3:
        return 'Finalizing model and preparing for download...'
      case 4:
        return 'Calculating volume and analyzing 3D geometry...'
      default:
        return 'Processing...'
    }
  }

  // Get estimated time remaining based on progress phase
  const getEstimatedTime = () => {
    if (!isActive) return ''

    switch (progressPhase) {
      case 0:
        return 'Estimated time: 3-5 minutes'
      case 1:
        return 'Estimated time: 2-4 minutes remaining'
      case 2:
        return 'Estimated time: 1-3 minutes remaining'
      case 3:
        return 'Almost done, just a moment longer...'
      case 4:
        return 'Almost complete...'
      default:
        return ''
    }
  }

  if (!isActive && !status) return null

  return (
    <div className={`progress-indicator ${isActive ? 'active' : ''}`}>
      <div className="progress-content">
        <div className="progress-header">
          <h3>{status}{isActive ? dots : ''}</h3>
          {isActive && (
            <span className="elapsed-time">
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>

        {isActive && (
          <>
            <div className="progress-track">
              <div className="progress-bar"></div>
            </div>
            
            <div className="progress-details">
              <p className="detailed-status">{getDetailedStatus()}</p>
              <p className="estimated-time">{getEstimatedTime()}</p>
              {additionalInfo && (
                <p className="additional-info">{additionalInfo}</p>
              )}
            </div>
            
            <div className="progress-tips">
              <p>💡 Tip: 3D generation is computationally intensive and may take several minutes.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProgressIndicator
