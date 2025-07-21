import React from 'react'
import ProgressIndicator from '../ProgressIndicator'
import './ProcessingStep.css'

const ProcessingStep = ({
  isGenerating,
  progress,
  progressInfo,
  error,
  onCancel
}) => {
  return (
    <div className="step-section processing-step">
      <div className="processing-content">
        <div className="processing-icon">
          <span className="spinner large"></span>
        </div>
        <h3>Analyzing Your Object</h3>
        <p>Please wait while we process your request...</p>

        {(isGenerating || progress) && (
          <div className="progress-section">
            <ProgressIndicator
              status={progress}
              isActive={isGenerating}
              additionalInfo={progressInfo}
            />
          </div>
        )}

        {error && (
          <div className="status-message error">
            ❌ {error}
          </div>
        )}

        {/* Cancel Button */}
        {isGenerating && onCancel && (
          <div className="cancel-section">
            <button
              onClick={onCancel}
              className="cancel-button"
              title="Cancel processing and go back"
            >
              ✕ Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessingStep
