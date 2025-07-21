import { useState, useEffect } from 'react'
import { getCacheStats, clearCache, clearCorruptedCache } from '../services/modelCache'
import './CacheManager.css'

const CacheManager = () => {
  const [cacheStats, setCacheStats] = useState(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Load cache stats
  const loadCacheStats = () => {
    const stats = getCacheStats()
    setCacheStats(stats)
  }

  useEffect(() => {
    loadCacheStats()
  }, [])

  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear all cached 3D models? This action cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      const success = clearCache()
      if (success) {
        loadCacheStats() // Refresh stats
        alert('Cache cleared successfully!')
      } else {
        alert('Failed to clear cache. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
      alert('An error occurred while clearing the cache.')
    } finally {
      setIsClearing(false)
    }
  }

  const handleFixCache = async () => {
    setIsFixing(true)
    try {
      const removedCount = await clearCorruptedCache()
      loadCacheStats() // Refresh stats
      if (removedCount > 0) {
        alert(`Fixed cache! Removed ${removedCount} corrupted entries.`)
      } else {
        alert('Cache is healthy! No corrupted entries found.')
      }
    } catch (error) {
      console.error('Error fixing cache:', error)
      alert('An error occurred while fixing the cache.')
    } finally {
      setIsFixing(false)
    }
  }

  if (!cacheStats) {
    return (
      <div className="cache-manager loading">
        <span className="spinner small"></span>
        Loading cache information...
      </div>
    )
  }

  return (
    <div className="cache-manager">
      <div className="cache-header">
        <h4>3D Model Cache</h4>
        <button
          className="toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showDetails && (
        <div className="cache-details">
          <div className="cache-stats">
            <div className="stat-item">
              <span className="stat-label">Cached Models:</span>
              <span className="stat-value">{cacheStats.entryCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Storage Used:</span>
              <span className="stat-value">{cacheStats.totalSizeMB} MB</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Models:</span>
              <span className="stat-value">{cacheStats.maxEntries}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Age:</span>
              <span className="stat-value">{cacheStats.maxAgeDays} days</span>
            </div>
          </div>

          <div className="cache-info">
            <p>
              💡 <strong>Cache Benefits:</strong> Previously generated 3D models are stored locally 
              to provide instant results when you upload the same image with identical settings.
            </p>
            <p>
              🔄 <strong>Auto-Cleanup:</strong> Old models are automatically removed after {cacheStats.maxAgeDays} days 
              or when the cache exceeds {cacheStats.maxEntries} models.
            </p>
          </div>

          {cacheStats.entryCount > 0 && (
            <div className="cache-actions">
              <div className="action-buttons">
                <button
                  className="fix-cache-btn"
                  onClick={handleFixCache}
                  disabled={isFixing}
                >
                  {isFixing ? (
                    <>
                      <span className="spinner small"></span>
                      Fixing...
                    </>
                  ) : (
                    <>
                      🔧 Fix Cache
                    </>
                  )}
                </button>
                <button
                  className="clear-cache-btn"
                  onClick={handleClearCache}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <>
                      <span className="spinner small"></span>
                      Clearing...
                    </>
                  ) : (
                    <>
                      🗑️ Clear All Cache
                    </>
                  )}
                </button>
              </div>
              <p className="clear-warning">
                💡 Use "Fix Cache" to remove corrupted entries, or "Clear All Cache" to remove all {cacheStats.entryCount} cached models ({cacheStats.totalSizeMB} MB)
              </p>
            </div>
          )}

          {cacheStats.entryCount === 0 && (
            <div className="empty-cache">
              <p>📭 No models cached yet. Generate a 3D model to start building your cache!</p>
            </div>
          )}
        </div>
      )}

      {!showDetails && cacheStats.entryCount > 0 && (
        <div className="cache-summary">
          <span className="cache-indicator">
            💾 {cacheStats.entryCount} models cached ({cacheStats.totalSizeMB} MB)
          </span>
        </div>
      )}
    </div>
  )
}

export default CacheManager
