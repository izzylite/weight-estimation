/**
 * 3D Model Caching Service
 * Caches generated 3D models based on image content and generation settings
 * to speed up repeated requests with the same image
 */

// Cache configuration
const CACHE_CONFIG = {
  maxCacheSize: 50, // Maximum number of cached models
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  storagePrefix: 'model_cache_',
  indexKey: 'model_cache_index'
}

/**
 * Generate a unique cache key for an image and settings combination
 * @param {File} imageFile - The image file
 * @param {Object} settings - Generation settings
 * @returns {Promise<string>} Cache key
 */
const generateCacheKey = async (imageFile, settings = {}) => {
  try {
    // Validate inputs
    if (!imageFile || typeof imageFile.arrayBuffer !== 'function') {
      throw new Error('Invalid image file')
    }

    // Create a hash from image content and settings
    const imageBuffer = await imageFile.arrayBuffer()

    // Check if crypto.subtle is available
    if (!crypto || !crypto.subtle) {
      throw new Error('Crypto API not available')
    }

    const imageHash = await crypto.subtle.digest('SHA-256', imageBuffer)
    const imageHashHex = Array.from(new Uint8Array(imageHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Create settings hash with clean object
    const cleanSettings = {
      qualityMode: settings.qualityMode || 'turbo',
      removeBackground: settings.removeBackground !== false, // Default true
      generateTexture: settings.generateTexture || false,
      description: (settings.description || '').trim()
    }

    const settingsString = JSON.stringify(cleanSettings)
    const settingsBuffer = new TextEncoder().encode(settingsString)
    const settingsHash = await crypto.subtle.digest('SHA-256', settingsBuffer)
    const settingsHashHex = Array.from(new Uint8Array(settingsHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return `${imageHashHex.substring(0, 16)}_${settingsHashHex.substring(0, 8)}`
  } catch (error) {
    console.error('Failed to generate cache key:', error)
    // Fallback to simpler key generation
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileName = imageFile?.name?.replace(/[^a-zA-Z0-9]/g, '') || 'unknown'
    const settingsHash = JSON.stringify(settings).length.toString(36)
    return `fallback_${fileName}_${settingsHash}_${timestamp}_${random}`
  }
}

/**
 * Get cache index from localStorage
 * @returns {Array} Cache index array
 */
const getCacheIndex = () => {
  try {
    const indexData = localStorage.getItem(CACHE_CONFIG.indexKey)
    return indexData ? JSON.parse(indexData) : []
  } catch (error) {
    console.error('Failed to get cache index:', error)
    return []
  }
}

/**
 * Save cache index to localStorage
 * @param {Array} index - Cache index array
 */
const saveCacheIndex = (index) => {
  try {
    localStorage.setItem(CACHE_CONFIG.indexKey, JSON.stringify(index))
  } catch (error) {
    console.error('Failed to save cache index:', error)
  }
}

/**
 * Clean up expired cache entries
 */
const cleanupExpiredEntries = () => {
  const index = getCacheIndex()
  const now = Date.now()
  const validEntries = []

  index.forEach(entry => {
    if (now - entry.timestamp < CACHE_CONFIG.maxCacheAge) {
      validEntries.push(entry)
    } else {
      // Remove expired entry from localStorage
      try {
        localStorage.removeItem(CACHE_CONFIG.storagePrefix + entry.key)
        console.log(`🗑️ Removed expired cache entry: ${entry.key}`)
      } catch (error) {
        console.error('Failed to remove expired cache entry:', error)
      }
    }
  })

  if (validEntries.length !== index.length) {
    saveCacheIndex(validEntries)
    console.log(`🧹 Cleaned up ${index.length - validEntries.length} expired cache entries`)
  }
}

/**
 * Enforce cache size limit by removing oldest entries
 */
const enforceCacheLimit = () => {
  const index = getCacheIndex()
  
  if (index.length <= CACHE_CONFIG.maxCacheSize) {
    return
  }

  // Sort by timestamp (oldest first)
  index.sort((a, b) => a.timestamp - b.timestamp)
  
  // Remove oldest entries
  const entriesToRemove = index.length - CACHE_CONFIG.maxCacheSize
  const removedEntries = index.splice(0, entriesToRemove)

  removedEntries.forEach(entry => {
    try {
      localStorage.removeItem(CACHE_CONFIG.storagePrefix + entry.key)
      console.log(`🗑️ Removed old cache entry to enforce limit: ${entry.key}`)
    } catch (error) {
      console.error('Failed to remove old cache entry:', error)
    }
  })

  saveCacheIndex(index)
  console.log(`📦 Enforced cache limit, removed ${entriesToRemove} old entries`)
}

/**
 * Check if a cached model exists for the given image and settings
 * @param {File} imageFile - The image file
 * @param {Object} settings - Generation settings
 * @returns {Promise<Object|null>} Cached model data or null if not found
 */
export const getCachedModel = async (imageFile, settings = {}) => {
  try {
    console.log('🔍 Checking cache for existing 3D model...')
    
    // Clean up expired entries first
    cleanupExpiredEntries()
    
    const cacheKey = await generateCacheKey(imageFile, settings)
    console.log(`🔑 Generated cache key: ${cacheKey}`)
    
    const cachedData = localStorage.getItem(CACHE_CONFIG.storagePrefix + cacheKey)
    
    if (!cachedData) {
      console.log('❌ No cached model found')
      return null
    }

    const parsedData = JSON.parse(cachedData)
    
    // Verify the cached data is still valid
    if (Date.now() - parsedData.timestamp > CACHE_CONFIG.maxCacheAge) {
      console.log('⏰ Cached model expired, removing...')
      localStorage.removeItem(CACHE_CONFIG.storagePrefix + cacheKey)
      return null
    }

    // Convert base64 back to blob using fetch (more reliable)
    let blob
    try {
      // Create a data URL and fetch it to get the blob
      const dataUrl = `data:model/gltf-binary;base64,${parsedData.modelData}`
      const response = await fetch(dataUrl)
      blob = await response.blob()
    } catch (decodeError) {
      console.error('❌ Failed to decode cached model data:', decodeError)
      // Remove corrupted cache entry
      localStorage.removeItem(CACHE_CONFIG.storagePrefix + cacheKey)
      return null
    }

    console.log(`✅ Found cached model! Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
    
    return {
      blob: blob,
      metadata: parsedData.metadata,
      timestamp: parsedData.timestamp,
      cacheKey: cacheKey
    }
  } catch (error) {
    console.error('❌ Failed to get cached model:', error)
    return null
  }
}

/**
 * Cache a generated 3D model
 * @param {File} imageFile - The original image file
 * @param {Object} settings - Generation settings used
 * @param {Blob} modelBlob - The generated 3D model blob
 * @param {Object} metadata - Additional metadata about the model
 * @returns {Promise<boolean>} Success status
 */
export const cacheModel = async (imageFile, settings, modelBlob, metadata = {}) => {
  try {
    console.log('💾 Caching generated 3D model...')

    const cacheKey = await generateCacheKey(imageFile, settings)
    console.log(`🔑 Cache key: ${cacheKey}`)

    // Check if model is too large for localStorage (5MB limit per item)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (modelBlob.size > maxSize) {
      console.warn(`⚠️ Model too large to cache: ${(modelBlob.size / 1024 / 1024).toFixed(2)} MB > 5MB`)
      return false
    }

    // Convert blob to base64 for storage using FileReader (more reliable)
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          // Remove the data URL prefix (data:application/octet-stream;base64,)
          const result = reader.result
          if (!result || typeof result !== 'string') {
            throw new Error('Invalid FileReader result')
          }

          const base64 = result.split(',')[1]
          if (!base64) {
            throw new Error('No base64 data found in result')
          }

          // Validate base64 format
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
            throw new Error('Invalid base64 format')
          }

          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(modelBlob)
    })

    // Test the base64 data by trying to decode it
    try {
      const testDataUrl = `data:model/gltf-binary;base64,${base64Data}`
      const testResponse = await fetch(testDataUrl)
      const testBlob = await testResponse.blob()
      if (testBlob.size !== modelBlob.size) {
        throw new Error(`Size mismatch: original ${modelBlob.size}, decoded ${testBlob.size}`)
      }
      console.log(`✅ Base64 encoding validated, size: ${testBlob.size} bytes`)
    } catch (validationError) {
      console.error('❌ Base64 validation failed:', validationError)
      throw new Error(`Base64 encoding validation failed: ${validationError.message}`)
    }

    // Create clean metadata object without circular references
    const cleanMetadata = {
      generationTime: metadata.generationTime || 'unknown',
      modelSize: modelBlob.size,
      qualityMode: metadata.qualityMode || 'unknown',
      sessionId: metadata.sessionId || 'unknown',
      originalSize: modelBlob.size,
      modelType: modelBlob.type
    }

    // Create clean settings object
    const cleanSettings = {
      qualityMode: settings.qualityMode || 'turbo',
      removeBackground: settings.removeBackground !== false,
      generateTexture: settings.generateTexture || false,
      description: settings.description || ''
    }

    const cacheData = {
      modelData: base64Data,
      metadata: cleanMetadata,
      settings: cleanSettings,
      timestamp: Date.now(),
      imageInfo: {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      }
    }

    // Try to store the cached data with error handling
    try {
      const cacheDataString = JSON.stringify(cacheData)
      localStorage.setItem(CACHE_CONFIG.storagePrefix + cacheKey, cacheDataString)
    } catch (storageError) {
      if (storageError.name === 'QuotaExceededError') {
        console.warn('⚠️ Storage quota exceeded, clearing old cache entries...')
        // Try to free up space by removing old entries
        const index = getCacheIndex()
        if (index.length > 0) {
          // Remove oldest entry
          index.sort((a, b) => a.timestamp - b.timestamp)
          const oldestEntry = index.shift()
          localStorage.removeItem(CACHE_CONFIG.storagePrefix + oldestEntry.key)
          saveCacheIndex(index)

          // Try storing again
          localStorage.setItem(CACHE_CONFIG.storagePrefix + cacheKey, JSON.stringify(cacheData))
        } else {
          throw storageError
        }
      } else {
        throw storageError
      }
    }

    // Update cache index
    const index = getCacheIndex()
    const existingIndex = index.findIndex(entry => entry.key === cacheKey)

    if (existingIndex >= 0) {
      // Update existing entry
      index[existingIndex].timestamp = Date.now()
    } else {
      // Add new entry
      index.push({
        key: cacheKey,
        timestamp: Date.now(),
        imageInfo: cacheData.imageInfo,
        settings: cleanSettings
      })
    }

    saveCacheIndex(index)

    // Enforce cache limits
    enforceCacheLimit()

    console.log(`✅ Model cached successfully! Size: ${(modelBlob.size / 1024 / 1024).toFixed(2)} MB`)
    return true
  } catch (error) {
    console.error('❌ Failed to cache model:', error)
    return false
  }
}

/**
 * Clear all cached models
 * @returns {boolean} Success status
 */
export const clearCache = () => {
  try {
    console.log('🗑️ Clearing all cached models...')

    const index = getCacheIndex()
    let removedCount = 0

    index.forEach(entry => {
      try {
        localStorage.removeItem(CACHE_CONFIG.storagePrefix + entry.key)
        removedCount++
      } catch (error) {
        console.error(`Failed to remove cache entry ${entry.key}:`, error)
      }
    })

    localStorage.removeItem(CACHE_CONFIG.indexKey)

    console.log(`✅ Cleared ${removedCount} cached models`)
    return true
  } catch (error) {
    console.error('❌ Failed to clear cache:', error)
    return false
  }
}

/**
 * Clear corrupted cache entries
 * @returns {number} Number of corrupted entries removed
 */
export const clearCorruptedCache = async () => {
  try {
    console.log('🔍 Checking for corrupted cache entries...')

    const index = getCacheIndex()
    let removedCount = 0
    const validEntries = []

    for (const entry of index) {
      try {
        const cachedData = localStorage.getItem(CACHE_CONFIG.storagePrefix + entry.key)
        if (!cachedData) {
          console.log(`🗑️ Removing entry with missing data: ${entry.key}`)
          removedCount++
          continue
        }

        const parsedData = JSON.parse(cachedData)
        if (!parsedData.modelData) {
          console.log(`🗑️ Removing entry with no model data: ${entry.key}`)
          localStorage.removeItem(CACHE_CONFIG.storagePrefix + entry.key)
          removedCount++
          continue
        }

        // Test base64 decoding
        const testDataUrl = `data:model/gltf-binary;base64,${parsedData.modelData}`
        const testResponse = await fetch(testDataUrl)
        await testResponse.blob()

        // If we get here, the entry is valid
        validEntries.push(entry)
      } catch (error) {
        console.log(`🗑️ Removing corrupted entry: ${entry.key} (${error.message})`)
        localStorage.removeItem(CACHE_CONFIG.storagePrefix + entry.key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      saveCacheIndex(validEntries)
      console.log(`✅ Removed ${removedCount} corrupted cache entries`)
    } else {
      console.log(`✅ No corrupted cache entries found`)
    }

    return removedCount
  } catch (error) {
    console.error('❌ Failed to clear corrupted cache:', error)
    return 0
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  try {
    const index = getCacheIndex()
    let totalSize = 0
    
    index.forEach(entry => {
      try {
        const cachedData = localStorage.getItem(CACHE_CONFIG.storagePrefix + entry.key)
        if (cachedData) {
          totalSize += cachedData.length
        }
      } catch (error) {
        // Skip entries that can't be read
      }
    })
    
    return {
      entryCount: index.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      maxEntries: CACHE_CONFIG.maxCacheSize,
      maxAgeDays: CACHE_CONFIG.maxCacheAge / (24 * 60 * 60 * 1000)
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return {
      entryCount: 0,
      totalSizeBytes: 0,
      totalSizeMB: '0.00',
      maxEntries: CACHE_CONFIG.maxCacheSize,
      maxAgeDays: CACHE_CONFIG.maxCacheAge / (24 * 60 * 60 * 1000)
    }
  }
}
