import { useState } from 'react'
import ModelViewer from './ModelViewer'
import './WeightEstimationResult.css'

const WeightEstimationResult = ({ 
  weightResult, 
  analysisResult, 
  originalImage, 
  onDownload, 
  onStartOver 
}) => {
  const [showModelViewer, setShowModelViewer] = useState(false)

  if (!weightResult) {
    return (
      <div className="weight-result-container">
        <div className="no-result">
          <p>No weight estimation available</p>
        </div>
      </div>
    )
  }

  const {
    estimatedWeight,
    unit,
    confidence,
    materialType,
    density,
    reasoning,
    weightRange,
    structure,
    certaintyFactors,
    volume,
    processingTime,
    itemType = 'single',
    itemCount = 1,
    individualItemWeight,
    packagingWeight,
    labelVolume,
    volumeValidation,
    containerType,
    liquidContent,
    aiModel
  } = weightResult

  const confidencePercentage = (confidence * 100).toFixed(1)
  const weightDisplay = estimatedWeight >= 1000 
    ? `${(estimatedWeight / 1000).toFixed(2)} kg`
    : `${Math.round(estimatedWeight)} g`

  const formatWeight = (weight) => {
    return weight >= 1000 
      ? `${(weight / 1000).toFixed(2)} kg`
      : `${Math.round(weight)} g`
  }

  return (
    <div className="weight-result-container">
      {/* Main Result Display */}
      <div className="result-header">
        <h2>🎯 Weight Estimation Complete</h2>
        <div className="main-result">
          <div className="weight-display">
            <span className="weight-value">{weightDisplay}</span>
            <span className="confidence-badge" data-confidence={confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low'}>
              {confidencePercentage}% confidence
            </span>
          </div>
          <div className="weight-range">
            Range: {formatWeight(weightRange.min)} - {formatWeight(weightRange.max)}
          </div>
        </div>

        {/* Multi-pack Information */}
        {itemType !== 'single' && (
          <div className="multipack-info">
            <h3>📦 Multi-Pack Analysis</h3>
            <div className="multipack-grid">
              <div className="multipack-detail">
                <span className="label">Package Type:</span>
                <span className="value">{itemType}</span>
              </div>
              <div className="multipack-detail">
                <span className="label">Item Count:</span>
                <span className="value">{itemCount} items</span>
              </div>
              {individualItemWeight && (
                <div className="multipack-detail">
                  <span className="label">Per Item Weight:</span>
                  <span className="value">{formatWeight(individualItemWeight)}</span>
                </div>
              )}
              {packagingWeight > 0 && (
                <div className="multipack-detail">
                  <span className="label">Packaging Weight:</span>
                  <span className="value">{formatWeight(packagingWeight)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Analysis */}
      <div className="analysis-details">
        <div className="analysis-grid">
          <div className="analysis-card">
            <h4>🧱 Material Analysis</h4>
            <div className="detail-row">
              <span className="label">Material Type:</span>
              <span className="value">{materialType}</span>
            </div>
            <div className="detail-row">
              <span className="label">Estimated Density:</span>
              <span className="value">{density.toFixed(2)} g/cm³</span>
            </div>
            <div className="detail-row">
              <span className="label">Structure:</span>
              <span className="value">{structure}</span>
            </div>
          </div>

          <div className="analysis-card">
            <h4>📐 Volume & Dimensions</h4>
            <div className="detail-row">
              <span className="label">Calculated Volume:</span>
              <span className="value">{volume.toFixed(4)} cm³</span>
            </div>
            {labelVolume && (
              <>
                <div className="detail-row">
                  <span className="label">Label Volume:</span>
                  <span className="value">{labelVolume} ml</span>
                </div>
                <div className="detail-row">
                  <span className="label">Volume Validation:</span>
                  <span className="value validation-status">{volumeValidation}</span>
                </div>
              </>
            )}
            {containerType && containerType !== 'unknown' && (
              <div className="detail-row">
                <span className="label">Container Type:</span>
                <span className="value">{containerType}</span>
              </div>
            )}
            {liquidContent > 0 && (
              <div className="detail-row">
                <span className="label">Liquid Content:</span>
                <span className="value">{formatWeight(liquidContent)}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Processing Time:</span>
              <span className="value">{processingTime}s</span>
            </div>
          </div>

          {aiModel && (
            <div className="analysis-card">
              <h4>🤖 AI Model Used</h4>
              <div className="detail-row">
                <span className="label">Model:</span>
                <span className="value">{aiModel.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Description:</span>
                <span className="value">{aiModel.description}</span>
              </div>
              <div className="detail-row">
                <span className="label">Cost Range:</span>
                <span className="value">{aiModel.costRange}</span>
              </div>
            </div>
          )}

          <div className="analysis-card">
            <h4>🎯 Confidence Factors</h4>
            <div className="confidence-bars">
              <div className="confidence-item">
                <span className="confidence-label">Material ID</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${certaintyFactors.materialIdentification * 100}%` }}
                  ></div>
                </div>
                <span className="confidence-value">
                  {(certaintyFactors.materialIdentification * 100).toFixed(0)}%
                </span>
              </div>
              <div className="confidence-item">
                <span className="confidence-label">Structure</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${certaintyFactors.structureAssessment * 100}%` }}
                  ></div>
                </div>
                <span className="confidence-value">
                  {(certaintyFactors.structureAssessment * 100).toFixed(0)}%
                </span>
              </div>
              <div className="confidence-item">
                <span className="confidence-label">Density</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${certaintyFactors.densityEstimation * 100}%` }}
                  ></div>
                </div>
                <span className="confidence-value">
                  {(certaintyFactors.densityEstimation * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="reasoning-section">
          <h4>🤖 AI Analysis Reasoning</h4>
          <div className="reasoning-text">
            {reasoning}
          </div>
        </div>

        {/* Original Image Reference */}
        {originalImage && (
          <div className="image-reference">
            <h4>📷 Original Image</h4>
            <div className="image-container">
              <img 
                src={URL.createObjectURL(originalImage)} 
                alt="Original uploaded image" 
                className="reference-image"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={() => setShowModelViewer(!showModelViewer)}
          className="action-button secondary"
        >
          {showModelViewer ? '📊 Hide 3D Model' : '🎨 View 3D Model'}
        </button>
        
        <button
          onClick={onDownload}
          className="action-button secondary"
        >
          💾 Download 3D Model
        </button>
        
        <button
          onClick={onStartOver}
          className="action-button primary"
        >
          🔄 Estimate Another Object
        </button>
      </div>

      {/* 3D Model Viewer (Collapsible) */}
      {showModelViewer && analysisResult && (
        <div className="model-viewer-section">
          <ModelViewer 
            analysisResult={analysisResult}
            onDownload={onDownload}
          />
        </div>
      )}
    </div>
  )
}

export default WeightEstimationResult
