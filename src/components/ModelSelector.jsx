import { useState, useEffect } from 'react'
import { getAvailableModels, getCurrentModel, setEstimationModel } from '../services/weightEstimation'
import './ModelSelector.css'

const ModelSelector = ({ onModelChange, disabled = false }) => {
  const [selectedModel, setSelectedModel] = useState(getCurrentModel())
  const [showSelector, setShowSelector] = useState(false)
  const availableModels = getAvailableModels()

  useEffect(() => {
    // Sync with the service's current model
    setSelectedModel(getCurrentModel())
  }, [])

  const handleModelChange = (modelKey) => {
    setSelectedModel(modelKey)
    setEstimationModel(modelKey)
    onModelChange?.(modelKey)
    console.log(`🤖 Model changed to: ${availableModels[modelKey].name}`)
  }

  const currentModelConfig = availableModels[selectedModel]

  return (
    <div className="model-selector">
      <div className="selector-header">
        <button 
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          className="selector-toggle"
          disabled={disabled}
        >
          🤖 AI Model: {currentModelConfig.name} {showSelector ? '▼' : '▶'}
        </button>
        <span className="cost-indicator">{currentModelConfig.costRange}</span>
      </div>
      
      {showSelector && (
        <div className="selector-content">
          <div className="model-grid">
            {Object.entries(availableModels).map(([key, config]) => (
              <div 
                key={key}
                className={`model-option ${selectedModel === key ? 'selected' : ''} ${config.recommended ? 'recommended' : ''}`}
                onClick={() => !disabled && handleModelChange(key)}
              >
                <div className="model-header">
                  <div className="model-name">
                    {config.name}
                    {config.recommended && <span className="recommended-badge">Recommended</span>}
                  </div>
                  <div className="model-cost">{config.costRange}</div>
                </div>
                <div className="model-description">{config.description}</div>
                
                <div className="model-specs">
                  <div className="spec-item">
                    <span className="spec-label">Max Tokens:</span>
                    <span className="spec-value">{config.maxTokens}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Temperature:</span>
                    <span className="spec-value">{config.temperature}</span>
                  </div>
                </div>
                
                {selectedModel === key && (
                  <div className="selected-indicator">
                    ✓ Currently Selected
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="model-info">
            <h4>💡 Model Selection Guide</h4>
            <div className="guide-grid">
              <div className="guide-item">
                <strong>GPT-4o Mini:</strong> Best for quick, cost-effective analysis. Good accuracy for most objects.
              </div>
              <div className="guide-item">
                <strong>Claude 4 Sonnet:</strong> Superior reasoning and detailed analysis. Better for complex objects.
              </div>
              <div className="guide-item">
                <strong>GPT-4o:</strong> Highest quality analysis with best accuracy. Use for critical measurements.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector
