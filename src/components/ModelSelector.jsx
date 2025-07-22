import { useState, useEffect } from 'react'
import { getAvailableModels, getCurrentModel, setEstimationModel } from '../services/weightEstimation'
import './ModelSelector.css'

const ModelSelector = ({ onModelChange, disabled = false }) => {
  const [selectedModel, setSelectedModel] = useState(getCurrentModel())
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

  return (
    <div className="model-selector">
      <div className="model-cards">
        {Object.entries(availableModels).map(([key, config]) => (
          <div
            key={key}
            className={`model-card ${selectedModel === key ? 'selected' : ''} ${config.recommended ? 'recommended' : ''}`}
            onClick={() => !disabled && handleModelChange(key)}
          >
            <div className="model-header">
              <div className="model-name">
                {config.name}
                {config.recommended && <span className="recommended-badge">Recommended</span>}
                {selectedModel === key && <span className="selected-badge">✓ Currently Selected</span>}
              </div>
              <div className="model-cost">{config.costRange}</div>
            </div>

            <div className="model-description">{config.description}</div>

            <div className="model-specs">
              <div className="spec-row">
                <span className="spec-label">Max Tokens:</span>
                <span className="spec-value">{config.maxTokens}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Temperature:</span>
                <span className="spec-value">{config.temperature}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="model-guide">
        <div className="guide-icon">💡</div>
        <div className="guide-title">Model Selection Guide</div>
        <div className="guide-items">
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
  )
}

export default ModelSelector
