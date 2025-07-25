import { useState } from 'react'
import './GenerationSettings.css'

const GenerationSettings = ({ onSettingsChange, disabled = false }) => {
  const [settings, setSettings] = useState({
    removeBackground: true,
    generateTexture: false,
    qualityMode: 'turbo' // 'turbo' for speed, 'quality' for best results
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  return (
    <div className="generation-settings">
      <div className="settings-header">
        <button 
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="settings-toggle"
          disabled={disabled}
        >
          ⚙️ 3D Generation Settings {showAdvanced ? '▼' : '▶'}
        </button>
      </div>
      
      {showAdvanced && (
        <div className="settings-content">
          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">Quality vs Speed</label>
                <span className="setting-badge recommended">Choose Mode</span>
              </div>
              <div className="quality-selector">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="qualityMode"
                    value="turbo"
                    checked={settings.qualityMode === 'turbo'}
                    onChange={(e) => handleSettingChange('qualityMode', e.target.value)}
                    disabled={disabled}
                  />
                  <span className="radio-label">
                    <strong>⚡ Turbo Mode</strong>
                    <span className="radio-description">~90 seconds • $0.09 • Good quality</span>
                  </span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="qualityMode"
                    value="quality"
                    checked={settings.qualityMode === 'quality'}
                    onChange={(e) => handleSettingChange('qualityMode', e.target.value)}
                    disabled={disabled}
                  />
                  <span className="radio-label">
                    <strong>🎯 Quality Mode</strong>
                    <span className="radio-description">~3-5 minutes • $0.24 • Best quality</span>
                  </span>
                </label>
              </div>
              <p className="setting-description">
                <strong>Turbo Mode</strong> is recommended for faster results and lower cost.
                Use <strong>Quality Mode</strong> only when you need the highest possible detail.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.removeBackground}
                    onChange={(e) => handleSettingChange('removeBackground', e.target.checked)}
                    disabled={disabled}
                  />
                  <span className="checkmark"></span>
                  Remove Background
                </label>
                <span className="setting-badge recommended">Recommended</span>
              </div>
              <p className="setting-description">
                Automatically removes the background from your input image for cleaner 3D models. 
                This helps the AI focus on the main object and produces better geometry.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.generateTexture}
                    onChange={(e) => handleSettingChange('generateTexture', e.target.checked)}
                    disabled={disabled}
                  />
                  <span className="checkmark"></span>
                  Generate Textures
                </label>
                <span className="setting-badge optional">Optional</span>
              </div>
              <p className="setting-description">
                Generates PBR (Physically Based Rendering) textures for the 3D model. 
                <strong>Disabled by default</strong> for faster processing and cleaner geometry analysis.
              </p>
              <div className="setting-note">
                <p>
                  <strong>💡 Note:</strong> Since we're focusing on volume calculation, textures are not needed 
                  and disabling them makes generation faster and more reliable.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-summary">
            <h4>Current Configuration:</h4>
            <ul>
              <li>
                <span className="summary-label">Quality Mode:</span>
                <span className="summary-value enabled">
                  {settings.qualityMode === 'turbo' ? '⚡ Turbo Mode' : '🎯 Quality Mode'}
                </span>
              </li>
              <li>
                <span className="summary-label">Background Removal:</span>
                <span className={`summary-value ${settings.removeBackground ? 'enabled' : 'disabled'}`}>
                  {settings.removeBackground ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </li>
              <li>
                <span className="summary-label">Texture Generation:</span>
                <span className={`summary-value ${settings.generateTexture ? 'enabled' : 'disabled'}`}>
                  {settings.generateTexture ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </li>
            </ul>
            
            <div className="performance-impact">
              <h5>Expected Impact:</h5>
              <div className="impact-metrics">
                <div className="metric">
                  <span className="metric-label">Processing Time:</span>
                  <span className="metric-value">
                    {settings.qualityMode === 'turbo'
                      ? (settings.generateTexture ? '~2-3 minutes' : '~90 seconds')
                      : (settings.generateTexture ? '~5-7 minutes' : '~3-5 minutes')
                    }
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Cost:</span>
                  <span className="metric-value">
                    {settings.qualityMode === 'turbo' ? '~$0.09' : '~$0.24'}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Quality:</span>
                  <span className="metric-value">
                    {settings.qualityMode === 'turbo' ? 'Good' : 'Best'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GenerationSettings
