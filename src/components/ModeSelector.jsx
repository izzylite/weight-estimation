import './ModeSelector.css'

const ModeSelector = ({ mode, onModeChange, disabled = false }) => {
  const modes = [
    {
      id: 'generate',
      icon: '🚀',
      title: 'Generate 3D Model',
      description: 'AI creates 3D model from image',
      time: '~90s',
      cost: '$0.15'
    },
    {
      id: 'import',
      icon: '📁',
      title: 'Import Model',
      description: 'Upload existing .glb/.gltf file',
      time: 'Instant',
      cost: 'Free'
    }
  ]

  return (
    <div className="mode-selector-container">
      <div className="mode-options">
        {modes.map((modeOption) => (
          <label
            key={modeOption.id}
            className={`mode-option ${mode === modeOption.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
          >
            <input
              type="radio"
              name="processing-mode"
              value={modeOption.id}
              checked={mode === modeOption.id}
              onChange={() => !disabled && onModeChange(modeOption.id)}
              disabled={disabled}
            />
            <div className="mode-content">
              <div className="mode-header">
                <span className="mode-icon">{modeOption.icon}</span>
                <span className="mode-title">{modeOption.title}</span>
              </div>
              <div className="mode-description">{modeOption.description}</div>
              <div className="mode-stats">
                <span className="stat">{modeOption.time}</span>
                <span className="stat-separator">•</span>
                <span className="stat">{modeOption.cost}</span>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

export default ModeSelector
