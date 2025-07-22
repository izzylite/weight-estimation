import { useState, useEffect } from 'react'
import { getAvailableModels, getCurrentModel, setEstimationModel } from '../services/weightEstimation'
import './ModelSelector.css'

const ModelSelector = ({ onModelChange, disabled = false }) => {
  const [selectedModel, setSelectedModel] = useState(getCurrentModel())
  const [showModels, setShowModels] = useState(false)
  const availableModels = getAvailableModels()

  useEffect(() => {
    // Sync with the service's current model (which loads from localStorage)
    const currentModel = getCurrentModel()
    setSelectedModel(currentModel)

    // Notify parent component of the loaded model
    onModelChange?.(currentModel)

    console.log(`🔄 ModelSelector initialized with saved model: ${availableModels[currentModel]?.name || currentModel}`)
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
      <div className="model-header">
        <button
          type="button"
          onClick={() => setShowModels(!showModels)}
          className="model-toggle"
          disabled={disabled}
        >
          🤖 AI Model Selection {showModels ? '▼' : '▶'}
        </button>
        <div className="current-model-info">
          <span className="current-model-name">{currentModelConfig?.name}</span>
          <span className="current-model-cost">{currentModelConfig?.costRange}</span>
        </div>
      </div>

      {showModels && (
        <div className="model-content">
          <div className="model-cards">
            {Object.entries(availableModels).map(([key, config]) => (
              <div
                key={key}
                className={`model-card ${selectedModel === key ? 'selected' : ''}`}
                onClick={() => !disabled && handleModelChange(key)}
              >
                <div className="model-header">
                  <div className="model-name">
                    {config.name}
                    {selectedModel === key && <span className="selected-badge">✓ Selected</span>}
                  </div>
                  <div className="model-cost">{config.costRange}</div>
                </div>

               

                <div className="model-specs">
                  <div className="spec-row">
                    <span className="spec-label">Max Tokens:</span>
                    <span className="spec-value">{config.maxTokens}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Temperature:</span>
                    <span className="spec-value">{config.temperature}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Description:</span>
                    <span className="spec-value">{config.description}</span>
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
      )}
    </div>
  )
}

export default ModelSelector
