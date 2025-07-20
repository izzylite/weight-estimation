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
 * Generate 3D model from image using Replicate Hunyuan3D API
 * @param {File} imageFile - The uploaded image file
 * @param {string} description - Optional description of the image
 * @param {Object} options - Additional generation options
 * @returns {Promise<Blob>} The generated GLB file as a blob
 */
export const generateModel = async (imageFile, description = '') => {
  try {
    // Check if API token is set
    if (!API_CONFIG.apiToken) {
      throw new Error('Replicate API token not configured. Please set your API token in the service configuration.')
    }

    // Convert image to data URL
    const imageDataURL = await fileToDataURL(imageFile)

    // Step 1: Create prediction using official Tencent model
    const predictionPayload = {
      version: 'b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb',
      input: {
        image: imageDataURL  // Simplified input - just the image
      }
    }

    const predictionResponse = await apiClient.post('/predictions', predictionPayload)
    const prediction = predictionResponse.data

    // Step 2: Poll for completion
    let result = prediction
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

      const statusResponse = await apiClient.get(`/predictions/${prediction.id}`)
      result = statusResponse.data
    }

    if (result.status === 'failed') {
      throw new Error(`Generation failed: ${result.error || 'Unknown error'}`)
    }

    if (result.status !== 'succeeded' || !result.output) {
      throw new Error('Generation did not complete successfully')
    }

    // Step 3: Download the GLB file
    const glbUrl = result.output

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
    let glbResponse
    try {

      // Strategy 1: Try proxy first for replicate.delivery URLs (most likely to work)
      if (downloadUrl.includes('replicate.delivery')) {
        try {
          const proxyUrl = downloadUrl.replace('https://replicate.delivery', '/api/download')
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
      throw new Error(`Failed to download GLB file: ${error.message}. The model was generated successfully, but the file download encountered restrictions.`)
    }

    return await glbResponse.blob() // Return the GLB file as a blob
    
  } catch (error) {

    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.detail || error.response.data?.message || error.response.statusText

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
