import { useState, useEffect } from 'react'
import { setApiToken, checkServerStatus } from '../services/hunyuan3d'
import { setApiToken as setWeightApiToken } from '../services/weightEstimation'
import './ApiConfig.css'

const ApiConfig = ({ onConfigChange }) => {
  const [token, setToken] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('replicate_api_token')
    if (savedToken) {
      setToken(savedToken)
      setApiToken(savedToken) // For 3D generation
      setWeightApiToken(savedToken) // For weight estimation
      validateToken(savedToken)
    }
  }, [])

  const validateToken = async (tokenToValidate) => {
    setIsChecking(true)
    try {
      setApiToken(tokenToValidate) // For 3D generation
      setWeightApiToken(tokenToValidate) // For weight estimation
      const valid = await checkServerStatus()
      setIsValid(valid)
      onConfigChange?.(valid)
    } catch (error) {
      setIsValid(false)
      onConfigChange?.(false)
    } finally {
      setIsChecking(false)
    }
  }

  const handleTokenChange = (e) => {
    const newToken = e.target.value.trim()
    setToken(newToken)
    
    if (newToken) {
      // Save to localStorage
      localStorage.setItem('replicate_api_token', newToken)
      validateToken(newToken)
    } else {
      localStorage.removeItem('replicate_api_token')
      setIsValid(false)
      onConfigChange?.(false)
    }
  }

  const clearToken = () => {
    setToken('')
    localStorage.removeItem('replicate_api_token')
    setIsValid(false)
    onConfigChange?.(false)
  }

  return (
    <div className="api-config-container">
      <div className="config-content">
        <div className="config-header">
          <div className="header-left">
            <h3>🔑 API Configuration</h3>
            <div className={`status-badge ${isValid ? 'valid' : 'invalid'}`}>
              {isChecking ? '⏳' : isValid ? '✅ Connected' : '❌ Not Connected'}
            </div>
          </div>
        </div>

        <div className="token-input-section">
          <div className="token-input-wrapper">
            <input
              id="api-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={handleTokenChange}
              placeholder="Enter your Replicate API token (r8_...)"
              className={`token-input ${isValid ? 'valid' : token ? 'invalid' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="input-button"
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? '👁️' : '🙈'}
            </button>
            {token && (
              <button
                type="button"
                onClick={clearToken}
                className="input-button clear"
                title="Clear token"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Compact status message */}
        {!isValid && !isChecking && (
          <div className="compact-status">
            {!token ? (
              <span className="status-text info">
                ℹ️ <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer">Get your API token</a> to continue
              </span>
            ) : (
              <span className="status-text error">
                ❌ Invalid token or connection failed
              </span>
            )}
          </div>
        )}

        {isChecking && (
          <div className="compact-status">
            <span className="status-text checking">
              🔄 Validating token...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiConfig
