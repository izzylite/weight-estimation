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

    console.log('Starting 3D model generation with Replicate...')
    console.log('Using API endpoint:', API_CONFIG.baseURL)

    // Step 1: Create prediction using official Tencent model
    const predictionPayload = {
      version: 'b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb',
      input: {
        image: imageDataURL  // Simplified input - just the image
      }
    }

    console.log('Sending prediction request:', predictionPayload)
    const predictionResponse = await apiClient.post('/predictions', predictionPayload)

    const prediction = predictionResponse.data
    console.log('Prediction created:', prediction.id)

    // Step 2: Poll for completion
    let result = prediction
    while (result.status === 'starting' || result.status === 'processing') {
      console.log(`Status: ${result.status}...`)
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

    console.log('3D model generated successfully')
    console.log('GLB URL:', result.output)

    // Step 3: Download the GLB file
    const glbUrl = result.output
    console.log('GLB URL type:', typeof glbUrl, 'Value:', glbUrl)

    // Handle different types of output (string URL or object)
    let downloadUrl
    if (typeof glbUrl === 'string') {
      downloadUrl = glbUrl
    } else if (glbUrl && typeof glbUrl === 'object') {
      // The API returns an object like {mesh: "https://replicate.delivery/..."}
      downloadUrl = glbUrl.mesh || glbUrl.url || glbUrl.href || glbUrl.toString()
      console.log('Extracted URL from object:', downloadUrl)
    } else {
      throw new Error('Invalid GLB URL format received from API')
    }

    if (!downloadUrl || typeof downloadUrl !== 'string') {
      throw new Error(`Could not extract valid URL from API response: ${JSON.stringify(glbUrl)}`)
    }

    console.log('Downloading GLB from:', downloadUrl)

    // Try to download the GLB file with multiple strategies
    let glbResponse
    try {
      console.log('Attempting to download GLB file...')

      // Strategy 1: Try proxy first for replicate.delivery URLs (most likely to work)
      if (downloadUrl.includes('replicate.delivery')) {
        try {
          console.log('Strategy 1: Using proxy for replicate.delivery')
          const proxyUrl = downloadUrl.replace('https://replicate.delivery', '/api/download')
          console.log('Proxy URL:', proxyUrl)

          glbResponse = await fetch(proxyUrl)

          if (glbResponse.ok) {
            const contentType = glbResponse.headers.get('content-type')
            console.log('Proxy download successful, content-type:', contentType)

            // Check if we got HTML instead of binary data
            if (contentType && contentType.includes('text/html')) {
              throw new Error('Proxy returned HTML instead of binary data')
            }
          } else {
            throw new Error(`Proxy HTTP ${glbResponse.status}: ${glbResponse.statusText}`)
          }
        } catch (proxyError) {
          console.log('Proxy download failed:', proxyError.message)

          // Strategy 2: Fallback to direct download
          console.log('Strategy 2: Fallback to direct download')
          glbResponse = await fetch(downloadUrl, {
            mode: 'cors',
            credentials: 'omit'
          })

          if (!glbResponse.ok) {
            throw new Error(`Direct download failed: HTTP ${glbResponse.status}`)
          }

          const contentType = glbResponse.headers.get('content-type')
          console.log('Direct download content-type:', contentType)

          if (contentType && contentType.includes('text/html')) {
            throw new Error('Direct download returned HTML instead of binary data')
          }
        }
      } else {
        // For non-replicate.delivery URLs, try direct download only
        console.log('Strategy 1: Direct download for non-replicate URL')
        glbResponse = await fetch(downloadUrl, {
          mode: 'cors',
          credentials: 'omit'
        })

        if (!glbResponse.ok) {
          throw new Error(`HTTP ${glbResponse.status}: ${glbResponse.statusText}`)
        }

        const contentType = glbResponse.headers.get('content-type')
        console.log('Direct download content-type:', contentType)

        if (contentType && contentType.includes('text/html')) {
          throw new Error('Got HTML instead of binary data - CORS issue')
        }
      }

    } catch (error) {
      console.error('All download strategies failed:', error.message)
      throw new Error(`Failed to download GLB file: ${error.message}. The model was generated successfully, but the file download encountered restrictions.`)
    }

    return await glbResponse.blob() // Return the GLB file as a blob
    
  } catch (error) {
    console.error('Error generating 3D model:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : 'No config',
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response'
    })

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
    console.log('Testing proxy connectivity...')
    const response = await fetch('/api/replicate/account', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test',
        'Content-Type': 'application/json',
      },
    })

    console.log('Proxy test response:', response.status, response.statusText)
    // Even if we get 401 (unauthorized), it means the proxy is working
    return response.status === 401 || response.status === 200
  } catch (error) {
    console.error('Proxy test failed:', error)
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
      console.warn('Replicate API token not configured')
      return false
    }

    console.log('Validating token with Replicate API...')

    // First test if proxy is working
    const proxyWorking = await testProxy()
    if (!proxyWorking) {
      console.error('Proxy is not working properly')
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
      console.log('Proxy failed, trying direct API call...')
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

    const data = await response.json()
    console.log('Token validation successful:', data)
    return true

  } catch (error) {
    console.error('Token validation failed:', error)

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network error - this might be a CORS issue or network connectivity problem')
    }

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
    proxyTest: null,
    tokenTest: null,
    error: null
  }

  try {
    // Test proxy
    debug.proxyTest = await testProxy()

    // Test token if available
    if (API_CONFIG.apiToken) {
      debug.tokenTest = await checkServerStatus()
    }
  } catch (error) {
    debug.error = error.message
  }

  console.log('API Debug Info:', debug)
  return debug
}
