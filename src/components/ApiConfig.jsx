import { useState, useEffect } from 'react'
import { setApiToken, checkServerStatus, validateTokenFormat } from '../services/hunyuan3d'
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
      setApiToken(savedToken)
      validateToken(savedToken)
    }
  }, [])

  const validateToken = async (tokenToValidate) => {
    setIsChecking(true)
    try {
      // First check format
      if (!validateTokenFormat(tokenToValidate)) {
        setIsValid(false)
        onConfigChange?.(false)
        return
      }

      setApiToken(tokenToValidate)
      const valid = await checkServerStatus()
      setIsValid(valid)
      onConfigChange?.(valid)
    } catch (error) {
      console.error('Token validation error:', error)
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
      <div className="config-header">
        <h3>🔑 API Configuration</h3>
        <div className={`status-indicator ${isValid ? 'valid' : 'invalid'}`}>
          {isChecking ? '⏳' : isValid ? '✅' : '❌'}
        </div>
      </div>

      <div className="config-content">
        <div className="token-input-section">
          <label htmlFor="api-token">Replicate API Token:</label>
          <div className="token-input-wrapper">
            <input
              id="api-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={handleTokenChange}
              placeholder="r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={`token-input ${isValid ? 'valid' : token ? 'invalid' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="toggle-visibility"
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? '👁️' : '🙈'}
            </button>
            {token && (
              <button
                type="button"
                onClick={clearToken}
                className="clear-token"
                title="Clear token"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="config-status">
          {isChecking && (
            <div className="status-message checking">
              🔄 Validating API token...
            </div>
          )}
          {!isChecking && isValid && (
            <div className="status-message valid">
              ✅ API token format is valid and ready to use
            </div>
          )}
          {!isChecking && token && !isValid && (
            <div className="status-message invalid">
              ❌ Invalid API token format. Token should start with "r8_" followed by 40 characters.
            </div>
          )}
          {!token && (
            <div className="status-message empty">
              ℹ️ Please enter your Replicate API token to continue
            </div>
          )}
        </div>

        <div className="config-help">
          <details>
            <summary>How to get your Replicate API token</summary>
            <div className="help-content">
              <ol>
                <li>Go to <a href="https://replicate.com" target="_blank" rel="noopener noreferrer">replicate.com</a></li>
                <li>Sign up or log in to your account</li>
                <li>Visit your <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer">API tokens page</a></li>
                <li>Create a new token or copy an existing one</li>
                <li>Paste it in the field above</li>
              </ol>
              <p><strong>Cost:</strong> ~$0.15 per 3D model generation</p>
              <p><strong>Security:</strong> Your token is stored locally in your browser</p>
              <p><strong>Note:</strong> Full token validation occurs during the first API call due to browser security restrictions</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default ApiConfig
