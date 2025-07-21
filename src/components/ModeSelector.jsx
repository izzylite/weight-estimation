import './ModeSelector.css'

const ModeSelector = ({ mode, onModeChange, disabled = false }) => {
  const modes = [
    {
      id: 'generate',
      title: '🚀 Generate 3D Model',
      description: 'Create a new 3D model from your image using AI',
      time: '~90 seconds',
      cost: '~$0.15',
      pros: ['Latest AI technology', 'Optimized for volume calculation', 'Custom generation'],
      cons: ['Takes time to generate', 'Requires API credits']
    },
    {
      id: 'import',
      title: '📁 Import Existing Model',
      description: 'Upload a pre-existing .glb or .gltf 3D model file',
      time: 'Instant',
      cost: 'Free',
      pros: ['Instant processing', 'No API costs', 'Perfect for testing'],
      cons: ['Need existing model', 'Quality depends on source']
    }
  ]

  return (
    <div className="mode-selector-container">
      <div className="selector-header">
        <h3>⚙️ Choose Processing Mode</h3>
        <p>Select how you want to obtain the 3D model for weight estimation</p>
      </div>

      <div className="mode-options">
        {modes.map((modeOption) => (
          <div
            key={modeOption.id}
            className={`mode-option ${mode === modeOption.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onModeChange(modeOption.id)}
          >
            <div className="mode-header">
              <div className="mode-title">
                <span className="mode-icon">{modeOption.title.split(' ')[0]}</span>
                <span className="mode-name">{modeOption.title.substring(2)}</span>
              </div>
              <div className="mode-radio">
                <input
                  type="radio"
                  name="processing-mode"
                  value={modeOption.id}
                  checked={mode === modeOption.id}
                  onChange={() => onModeChange(modeOption.id)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="mode-description">
              {modeOption.description}
            </div>

            <div className="mode-stats">
              <div className="stat-item">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{modeOption.time}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cost:</span>
                <span className="stat-value">{modeOption.cost}</span>
              </div>
            </div>

            <div className="mode-pros-cons">
              <div className="pros">
                <h5>✅ Pros:</h5>
                <ul>
                  {modeOption.pros.map((pro, index) => (
                    <li key={index}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div className="cons">
                <h5>⚠️ Considerations:</h5>
                <ul>
                  {modeOption.cons.map((con, index) => (
                    <li key={index}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mode-recommendation">
        {mode === 'generate' && (
          <div className="recommendation generate">
            <strong>💡 Recommended for:</strong> First-time users, production use, and when you need the most accurate 3D representation of your object.
          </div>
        )}
        {mode === 'import' && (
          <div className="recommendation import">
            <strong>💡 Recommended for:</strong> Testing, development, when you already have a 3D model, or want to save time and API costs.
          </div>
        )}
      </div>
    </div>
  )
}

export default ModeSelector
