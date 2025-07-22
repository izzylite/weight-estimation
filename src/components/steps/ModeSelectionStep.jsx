import React from 'react'
import ModeSelector from '../ModeSelector'
import GenerationSettings from '../GenerationSettings'
import ApiConfig from '../ApiConfig'
import CacheManager from '../CacheManager'
import ModelSelector from '../ModelSelector'
import './ModeSelectionStep.css'

const ModeSelectionStep = ({
  processingMode,
  onModeChange,
  onSettingsChange,
  onApiConfigChange,
  onModelChange,
  disabled
}) => {
  return (
    <div className="step-section mode-selection-step">
      {/* API Configuration */}
      <div className="config-section">
        <ApiConfig onConfigChange={onApiConfigChange} />
      </div>

      {/* AI Model Selection */}
      <div className="model-section">
        <ModelSelector
          onModelChange={onModelChange}
          disabled={disabled}
        />
      </div>

      {/* Mode Selection */}
      <ModeSelector
        mode={processingMode}
        onModeChange={onModeChange}
        disabled={disabled}
      />

      {/* Generation Settings (only for generate mode) */}
      {processingMode === 'generate' && (
        <div className="generation-settings">
          <GenerationSettings
            onSettingsChange={onSettingsChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Cache Manager (only for generate mode) */}
      {processingMode === 'generate' && (
        <CacheManager />
      )}
    </div>
  )
}

export default ModeSelectionStep
