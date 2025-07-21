import axios from 'axios'

// Configuration for the Replicate API
const API_CONFIG = {
  baseURL: '/api/replicate', // Use Vite proxy to avoid CORS issues
  timeout: 300000, // 5 minutes timeout for 3D generation
  apiToken: '', // Set your Replicate API token here
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Authorization': `Bearer ${API_CONFIG.apiToken}`,
    'Content-Type': 'application/json',
  }
})

/**
 * Convert file to data URL for Replicate API
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} Data URL string
 */
const fileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Replicate expects full data URL (data:image/png;base64,...)
      resolve(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Generate 3D model from image using Hunyuan3D-2.1 (Enhanced version)
 * @param {File} imageFile - The uploaded image file
 * @param {string} description - Optional description of the image
 * @param {Object} options - Additional generation options
 * @param {boolean} options.removeBackground - Remove background from input image (default: true)
 * @param {boolean} options.generateTexture - Generate PBR textures (default: false for faster processing)
 * @returns {Promise<Blob>} The generated GLB file as a blob
 */
export const generateModel = async (imageFile, description = '', options = {}) => {
  const startTime = Date.now()
  const sessionId = Math.random().toString(36).substring(2, 11)

  console.log(`🚀 [${sessionId}] Starting 3D model generation`)
  console.log(`📁 [${sessionId}] Image file:`, {
    name: imageFile.name,
    size: `${(imageFile.size / 1024 / 1024).toFixed(2)} MB`,
    type: imageFile.type
  })

  try {
    // Check if API token is set
    if (!API_CONFIG.apiToken) {
      console.error(`❌ [${sessionId}] API token not configured`)
      throw new Error('Replicate API token not configured. Please set your API token in the service configuration.')
    }
    console.log(`✅ [${sessionId}] API token configured`)

    // Extract options with defaults
    const {
      removeBackground = true,
      generateTexture = false
    } = options

    console.log(`⚙️ [${sessionId}] Generation settings:`, {
      removeBackground,
      generateTexture,
      hasDescription: !!description?.trim()
    })

    // Convert image to data URL
    console.log(`🔄 [${sessionId}] Converting image to data URL...`)
    const imageDataURL = await fileToDataURL(imageFile)
    console.log(`✅ [${sessionId}] Image converted, data URL length: ${imageDataURL.length} chars`)

    // Step 1: Create prediction using enhanced Hunyuan3D-2.1 model with texture and background options
    console.log(`📡 [${sessionId}] Creating prediction with Hunyuan3D-2.1...`)
    const predictionPayload = {
      version: '1e4b5ad0343fd1ec8cfbf8c2a7f21a0c0c54f2dc9d115942893540bd965742e6', // ndreca/hunyuan3d-2.1
      input: {
        image: imageDataURL,
        remove_background: removeBackground,    // Remove background for cleaner models
        generate_texture: generateTexture       // Disable texture generation for faster processing and cleaner geometry
      }
    }

    // Add description if provided (some models support text conditioning)
    if (description && description.trim()) {
      predictionPayload.input.text = description.trim()
      console.log(`📝 [${sessionId}] Added text description: "${description.trim()}"`)
    }

    console.log(`🔗 [${sessionId}] Sending prediction request to Replicate...`)
    const predictionResponse = await apiClient.post('/predictions', predictionPayload)
    const prediction = predictionResponse.data

    console.log(`✅ [${sessionId}] Prediction created:`, {
      id: prediction.id,
      status: prediction.status,
      model: 'ndreca/hunyuan3d-2.1'
    })

    // Step 2: Poll for completion
    console.log(`⏳ [${sessionId}] Starting polling for completion...`)
    let result = prediction
    let pollCount = 0
    const pollStartTime = Date.now()

    while (result.status === 'starting' || result.status === 'processing') {
      pollCount++
      const elapsedTime = ((Date.now() - pollStartTime) / 1000).toFixed(1)
      console.log(`🔄 [${sessionId}] Poll #${pollCount} - Status: ${result.status} (${elapsedTime}s elapsed)`)

      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

      const statusResponse = await apiClient.get(`/predictions/${prediction.id}`)
      result = statusResponse.data

      // Log progress if available
      if (result.logs) {
        const newLogs = result.logs.split('\n').slice(-3).join('\n').trim()
        if (newLogs) {
          console.log(`📋 [${sessionId}] Latest logs: ${newLogs}`)
        }
      }
    }

    const totalPollTime = ((Date.now() - pollStartTime) / 1000).toFixed(1)
    console.log(`✅ [${sessionId}] Polling completed after ${pollCount} polls (${totalPollTime}s)`)
    console.log(`🎯 [${sessionId}] Final status: ${result.status}`)

    if (result.status === 'failed') {
      console.error(`❌ [${sessionId}] Generation failed:`, result.error)
      throw new Error(`Generation failed: ${result.error || 'Unknown error'}`)
    }

    if (result.status !== 'succeeded' || !result.output) {
      console.error(`❌ [${sessionId}] Unexpected result:`, {
        status: result.status,
        hasOutput: !!result.output
      })
      throw new Error('Generation did not complete successfully')
    }

    console.log(`🎉 [${sessionId}] Generation succeeded!`)
    console.log(`📦 [${sessionId}] Output received:`, {
      type: typeof result.output,
      value: result.output
    })

    // Step 3: Download the GLB file
    const glbUrl = result.output
    console.log(`📥 [${sessionId}] Starting GLB download from: ${glbUrl}`)

    // Handle different types of output (string URL or object)
    let downloadUrl
    if (typeof glbUrl === 'string') {
      downloadUrl = glbUrl
    } else if (glbUrl && typeof glbUrl === 'object') {
      // The API returns an object like {mesh: "https://replicate.delivery/..."}
      downloadUrl = glbUrl.mesh || glbUrl.url || glbUrl.href || glbUrl.toString()
    } else {
      throw new Error('Invalid GLB URL format received from API')
    }

    if (!downloadUrl || typeof downloadUrl !== 'string') {
      throw new Error(`Could not extract valid URL from API response: ${JSON.stringify(glbUrl)}`)
    }

    // Try to download the GLB file with multiple strategies
    console.log(`🔄 [${sessionId}] Attempting GLB download...`)
    let glbResponse
    try {

      // Strategy 1: Try proxy first for replicate.delivery URLs (most likely to work)
      if (downloadUrl.includes('replicate.delivery')) {
        console.log(`🔗 [${sessionId}] Using proxy strategy for replicate.delivery URL`)
        try {
          const proxyUrl = downloadUrl.replace('https://replicate.delivery', '/api/download')
          console.log(`📡 [${sessionId}] Proxy URL: ${proxyUrl}`)
          glbResponse = await fetch(proxyUrl)

          if (glbResponse.ok) {
            const contentType = glbResponse.headers.get('content-type')

            // Check if we got HTML instead of binary data
            if (contentType && contentType.includes('text/html')) {
              throw new Error('Proxy returned HTML instead of binary data')
            }
          } else {
            throw new Error(`Proxy HTTP ${glbResponse.status}: ${glbResponse.statusText}`)
          }
        } catch (proxyError) {
          // Strategy 2: Fallback to direct download
          glbResponse = await fetch(downloadUrl, {
            mode: 'cors',
            credentials: 'omit'
          })

          if (!glbResponse.ok) {
            throw new Error(`Direct download failed: HTTP ${glbResponse.status}`)
          }

          const contentType = glbResponse.headers.get('content-type')

          if (contentType && contentType.includes('text/html')) {
            throw new Error('Direct download returned HTML instead of binary data')
          }
        }
      } else {
        // For non-replicate.delivery URLs, try direct download only
        glbResponse = await fetch(downloadUrl, {
          mode: 'cors',
          credentials: 'omit'
        })

        if (!glbResponse.ok) {
          throw new Error(`HTTP ${glbResponse.status}: ${glbResponse.statusText}`)
        }

        const contentType = glbResponse.headers.get('content-type')

        if (contentType && contentType.includes('text/html')) {
          throw new Error('Got HTML instead of binary data - CORS issue')
        }
      }

    } catch (error) {
      console.error(`❌ [${sessionId}] Download failed:`, error.message)
      throw new Error(`Failed to download GLB file: ${error.message}. The model was generated successfully, but the file download encountered restrictions.`)
    }

    console.log(`📦 [${sessionId}] Converting response to blob...`)
    const blob = await glbResponse.blob()
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`🎉 [${sessionId}] 3D model generation completed successfully!`)
    console.log(`📊 [${sessionId}] Final stats:`, {
      totalTime: `${totalTime}s`,
      blobSize: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      blobType: blob.type
    })

    return blob // Return the GLB file as a blob
    
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`❌ [${sessionId}] Generation failed after ${totalTime}s:`, error.message)

    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.detail || error.response.data?.message || error.response.statusText

      console.error(`🔥 [${sessionId}] Server error:`, {
        status,
        message,
        url: error.response.config?.url
      })

      if (status === 401) {
        throw new Error('Invalid API token. Please check your Replicate API token and try again.')
      } else if (status === 403) {
        throw new Error('API token does not have required permissions. Please check your Replicate account.')
      } else if (status === 404) {
        throw new Error('Model not found. The Hunyuan3D-2 model may not be available.')
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      } else if (status >= 500) {
        throw new Error('Server error occurred during 3D model generation. Please try again.')
      } else {
        throw new Error(`Generation failed: ${message}`)
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to Replicate API. Please check your internet connection and ensure the development server proxy is working.')
    } else {
      // Something else happened
      throw new Error(`Unexpected error: ${error.message}`)
    }
  }
}

/**
 * Test proxy connectivity
 * @returns {Promise<boolean>} True if proxy is working
 */
export const testProxy = async () => {
  try {
    // Test with a simple request that should return 401 (unauthorized) if proxy works
    const response = await fetch('/api/replicate/account', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })

    // Even if we get 401 (unauthorized), it means the proxy is working
    // If we get network errors, the proxy isn't working
    return response.status === 401 || response.status === 200 || response.status === 403
  } catch (error) {
    return false
  }
}

/**
 * Simple connectivity test that doesn't require authentication
 * @returns {Promise<boolean>} True if basic connectivity works
 */
export const testBasicConnectivity = async () => {
  try {
    // Test a simple GET request to the proxy endpoint
    const response = await fetch('/api/replicate', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Any response (even 401) means the proxy is working
    return response.status >= 200 && response.status < 600
  } catch (error) {
    return false
  }
}

/**
 * Check if the Replicate API is available and token is valid
 * @returns {Promise<boolean>} True if API is available
 */
export const checkServerStatus = async () => {
  try {
    if (!API_CONFIG.apiToken) {
      return false
    }

    // First test if proxy is working
    const proxyWorking = await testProxy()
    if (!proxyWorking) {
      return false
    }

    // Try proxy first, then fallback to direct API call
    let response
    try {
      // Try using the proxy endpoint first
      response = await fetch('/api/replicate/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiToken}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (proxyError) {
      // Fallback to direct API call
      response = await fetch('https://api.replicate.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiToken}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      })
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API token')
      } else if (response.status === 403) {
        throw new Error('API token does not have required permissions')
      } else {
        throw new Error(`API request failed with status ${response.status}`)
      }
    }

    await response.json()
    return true

  } catch (error) {
    return false
  }
}

/**
 * Set custom API configuration
 * @param {Object} config - New configuration
 */
export const setApiConfig = (config) => {
  Object.assign(API_CONFIG, config)

  // Update axios instance
  apiClient.defaults.baseURL = API_CONFIG.baseURL
  apiClient.defaults.timeout = API_CONFIG.timeout

  // Update authorization header if token changed
  if (config.apiToken) {
    apiClient.defaults.headers['Authorization'] = `Bearer ${config.apiToken}`
  }
}

/**
 * Set Replicate API token
 * @param {string} token - Replicate API token
 */
export const setApiToken = (token) => {
  API_CONFIG.apiToken = token
  apiClient.defaults.headers['Authorization'] = `Bearer ${token}`
}

/**
 * Get current API configuration
 * @returns {Object} Current configuration
 */
export const getApiConfig = () => {
  return { ...API_CONFIG }
}

/**
 * Debug function to test API connectivity
 * @returns {Promise<Object>} Debug information
 */
export const debugApiConnection = async () => {
  const debug = {
    config: getApiConfig(),
    basicConnectivity: null,
    proxyTest: null,
    tokenTest: null,
    error: null
  }

  try {
    // Test basic connectivity first
    debug.basicConnectivity = await testBasicConnectivity()

    // Test proxy
    debug.proxyTest = await testProxy()

    // Test token if available
    if (API_CONFIG.apiToken) {
      debug.tokenTest = await checkServerStatus()
    }
  } catch (error) {
    debug.error = error.message
  }

  return debug
}
