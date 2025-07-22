import axios from 'axios'

// GPT-4o-mini: ~$0.01-0.02 per request
// Claude 4 Sonnet: ~$0.02-0.04 per request
// GPT-4o: ~$0.05-0.10 per request
// Configuration for the Replicate API (shared with 3D generation)
const API_CONFIG = {
  baseURL: import.meta.env.PROD
    ? 'https://corsproxy.io/?https://api.replicate.com/v1'
    : '/api/replicate',
  timeout: 300000, // 5 minutes timeout
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
 * Estimate weight using AI vision model analysis
 * @param {File} imageFile - The original image file
 * @param {number} volume - Calculated volume in cubic units
 * @param {string} description - Optional description of the object
 * @param {Object} options - Additional options
 * @param {Function} options.onProgress - Progress callback function
 * @param {Object} options.modelMetadata - Optional 3D model metadata (vertices, faces, dimensions, etc.)
 * @returns {Promise<Object>} Weight estimation results
 */
export const estimateWeight = async (imageFile, volume, description = '', options = {}) => {
  const startTime = Date.now()
  const sessionId = Math.random().toString(36).substring(2, 11)

  console.log(`⚖️ [${sessionId}] Starting weight estimation`)
  console.log(`📊 [${sessionId}] Input volume: ${volume.toFixed(6)} cubic units`)

  if (!imageFile) {
    console.log(`⚠️ [${sessionId}] No image file provided - this should not happen, use volume-based estimation instead`)
    throw new Error('No image file provided for AI weight estimation')
  }

  console.log(`📁 [${sessionId}] Image file:`, {
    name: imageFile.name,
    size: `${(imageFile.size / 1024 / 1024).toFixed(2)} MB`,
    type: imageFile.type
  })

  try {
    // Check if API token is set
    console.log(`🔍 [${sessionId}] Checking API token status:`, {
      hasToken: !!API_CONFIG.apiToken,
      tokenLength: API_CONFIG.apiToken ? API_CONFIG.apiToken.length : 0,
      tokenPrefix: API_CONFIG.apiToken ? API_CONFIG.apiToken.substring(0, 8) + '...' : 'none'
    })

    if (!API_CONFIG.apiToken) {
      console.error(`❌ [${sessionId}] API token not configured`)
      throw new Error('Replicate API token not configured. Please set your API token in the service configuration.')
    }

    const { onProgress = () => {}, modelMetadata = null } = options

    // Convert image to data URL
    console.log(`🔄 [${sessionId}] Converting image to data URL...`)
    onProgress('Preparing image for AI analysis', 'Converting image format for weight estimation...')
    const imageDataURL = await fileToDataURL(imageFile)
    console.log(`✅ [${sessionId}] Image converted, data URL length: ${imageDataURL.length} chars`)

    // Create detailed prompt for weight estimation with optional 3D model data
    let modelDataSection = ''
    if (modelMetadata) {
      console.log(`📐 [${sessionId}] Including 3D model metadata in analysis`)
      modelDataSection = `

3D MODEL GEOMETRY DATA:
- Vertices: ${modelMetadata.vertices || 'unknown'} (higher values indicate more detailed geometry)
- Faces: ${modelMetadata.faces || 'unknown'} (higher values indicate more complex surface)
- Bounding Box: ${modelMetadata.boundingBox ? `${modelMetadata.boundingBox.x.toFixed(2)} × ${modelMetadata.boundingBox.y.toFixed(2)} × ${modelMetadata.boundingBox.z.toFixed(2)} units` : 'unknown'} (overall dimensions)
- Surface Area: ${modelMetadata.surfaceArea ? modelMetadata.surfaceArea.toFixed(6) + ' square units' : 'unknown'} (total exterior surface)
- Mesh Complexity: ${modelMetadata.complexity || 'unknown'} (indicates level of detail)
- Volume-to-Surface Ratio: ${modelMetadata.surfaceArea ? (volume / modelMetadata.surfaceArea).toFixed(4) : 'unknown'} (lower values suggest hollow or thin-walled structures, higher values suggest solid objects)
- Mesh Count: ${modelMetadata.meshCount || 'unknown'} (number of separate mesh components)`
    }

    const prompt = `Analyze this object and estimate its weight based on the following information:

CALCULATED VOLUME: ${volume.toFixed(6)} cubic units
OBJECT DESCRIPTION: ${description || 'No description provided'}${modelDataSection}

CRITICAL ANALYSIS STEPS:
1. IDENTIFY THE OBJECT TYPE: Look carefully at the image - is this:
   - A single item (one can, one bottle, one object)
   - A multi-pack/case (multiple items in packaging like "12x500ml", "6-pack", "case of...")
   - A container with multiple units inside

2. EXTRACT VOLUME INFORMATION: Look for volume markings on labels:
   - Bottles/cans: "500ml", "70cL", "1L", "330ml", etc.
   - Packages: "12x500ml", "6x330ml", etc.
   - Convert to cubic units: 1ml = 1cm³, 1cL = 10cm³, 1L = 1000cm³
   - COMPARE with calculated volume for validation

3. COUNT AND SCALE: If you see text like "12x", "6-pack", "case", or multiple identical items:
   - The volume represents the ENTIRE package/case
   - Divide the total weight by the number of units
   - Consider both the individual items AND the packaging weight

4. MATERIAL ANALYSIS:
   - Primary material type and properties (aluminum, plastic, glass, cardboard, etc.)
   - Packaging materials (cardboard box, plastic wrap, etc.)
   - Object structure (solid, hollow, thick/thin walls)
   - Visual density cues (surface texture, transparency, color)

5. WEIGHT ESTIMATION:
   - For LIQUID CONTAINERS (bottles, cans with volume markings):
     * Container weight (glass bottle ~400-600g, aluminum can ~15g, plastic bottle ~30-50g)
     * Liquid weight = volume × liquid density (water=1g/ml, alcohol=0.8g/ml, etc.)
     * Total = container + liquid content
   - For single solid items: Use volume × material density
   - For multi-packs: (Individual item weight × quantity) + packaging weight
   - VALIDATE: Compare calculated volume with label volume if visible
   - Account for air gaps in packaging${modelMetadata ? '\n\n5. 3D GEOMETRY ANALYSIS:\n   - Use mesh complexity and surface area for structural assessment\n   - Volume-to-surface ratio helps determine hollow vs solid structures\n   - Multiple mesh components may indicate separate items in a package' : ''}

Provide your analysis in this exact JSON format:
{
  "estimatedWeight": [total weight in grams],
  "unit": "grams",
  "confidence": [0.0 to 1.0],
  "materialType": "[primary material]",
  "density": [estimated density in g/cm³],
  "reasoning": "[detailed explanation including whether this is single item or multi-pack]",
  "weightRange": {
    "min": [minimum weight estimate],
    "max": [maximum weight estimate]
  },
  "structure": "[solid/hollow/mixed]",
  "itemType": "[single/multi-pack/case]",
  "itemCount": [number of individual items if multi-pack, 1 if single],
  "individualItemWeight": [weight per item in grams if multi-pack],
  "packagingWeight": [estimated packaging weight in grams],
  "labelVolume": [volume from label in ml if visible, null if not found],
  "volumeValidation": "[comparison between calculated and label volume]",
  "containerType": "[bottle/can/box/other]",
  "liquidContent": [estimated liquid weight in grams if applicable, 0 if solid],
  "certaintyFactors": {
    "materialIdentification": [0.0 to 1.0],
    "structureAssessment": [0.0 to 1.0],
    "densityEstimation": [0.0 to 1.0],
    "scaleIdentification": [0.0 to 1.0 - confidence in identifying single vs multi-pack],
    "volumeAccuracy": [0.0 to 1.0 - confidence in volume measurement accuracy]
  }
}

Be precise and consider that the volume calculation is accurate. Focus on material properties and structure to estimate density.`

    console.log(`📡 [${sessionId}] Creating weight estimation prediction...`)
    onProgress('Analyzing object with AI', 'AI is examining material properties and structure...')

    // Validate inputs before creating prediction
    console.log(`🔍 [${sessionId}] Validating inputs:`, {
      hasPrompt: !!prompt,
      promptLength: prompt ? prompt.length : 0,
      hasImageDataURL: !!imageDataURL,
      imageDataURLLength: imageDataURL ? imageDataURL.length : 0,
      imageDataURLPrefix: imageDataURL ? imageDataURL.substring(0, 30) + '...' : 'none'
    })

    if (!prompt || prompt.trim().length === 0) {
      console.error(`❌ [${sessionId}] Prompt validation failed:`, { prompt })
      throw new Error('Prompt is empty or invalid')
    }
    if (!imageDataURL || !imageDataURL.startsWith('data:image/')) {
      console.error(`❌ [${sessionId}] Image data URL validation failed:`, { 
        hasImageDataURL: !!imageDataURL,
        startsWithDataImage: imageDataURL ? imageDataURL.startsWith('data:image/') : false,
        prefix: imageDataURL ? imageDataURL.substring(0, 50) : 'none'
      })
      throw new Error('Image data URL is invalid')
    }

    // Use GPT-4o-mini for cost-effective analysis with correct Replicate format
    // Replicate's GPT-4o-mini uses prompt + image_input format, not messages
    console.log(`📝 [${sessionId}] Preparing input for Replicate GPT-4o-mini:`, {
      promptLength: prompt.length,
      hasImageDataURL: !!imageDataURL
    })

    const predictionPayload = {
      version: '167a3b6f79e1ab52cedcf14cf1b08d63d094958809d9115481623869bc015bd4', // GPT-4o-mini latest version
      input: {
        prompt: prompt,
        image_input: [imageDataURL], // Array of image data URLs
        max_completion_tokens: 1000,
        temperature: 0.1 // Low temperature for consistent analysis
      }
    }

    console.log(`📤 [${sessionId}] Sending prediction payload:`, {
      version: predictionPayload.version,
      promptLength: predictionPayload.input.prompt.length,
      imageInputCount: predictionPayload.input.image_input.length,
      maxTokens: predictionPayload.input.max_completion_tokens,
      temperature: predictionPayload.input.temperature
    })

    // Log the full payload structure (without the actual image data for brevity)
    const payloadForLogging = {
      ...predictionPayload,
      input: {
        ...predictionPayload.input,
        image_input: ['[IMAGE_DATA_TRUNCATED]'] // Hide actual image data
      }
    }
    console.log(`📋 [${sessionId}] Full payload structure:`, JSON.stringify(payloadForLogging, null, 2))

    // Validate payload one more time before sending
    if (!predictionPayload.input.prompt || predictionPayload.input.prompt.trim().length === 0) {
      console.error(`❌ [${sessionId}] Final validation failed: prompt is empty in payload`)
      throw new Error('Prompt is empty in final payload')
    }

    if (!predictionPayload.input.image_input || predictionPayload.input.image_input.length === 0) {
      console.error(`❌ [${sessionId}] Final validation failed: image_input array is empty in payload`)
      throw new Error('Image input array is empty in final payload')
    }

    const predictionResponse = await apiClient.post('/predictions', predictionPayload)
    const prediction = predictionResponse.data

    console.log(`✅ [${sessionId}] Weight estimation prediction created:`, {
      id: prediction.id,
      status: prediction.status
    })

    // Poll for completion
    console.log(`⏳ [${sessionId}] Starting polling for weight estimation...`)
    onProgress('AI analyzing object properties', 'Examining material type, density, and structure...')
    let result = prediction
    let pollCount = 0
    const pollStartTime = Date.now()

    while (result.status === 'starting' || result.status === 'processing') {
      pollCount++
      const elapsedTime = ((Date.now() - pollStartTime) / 1000).toFixed(1)
      console.log(`🔄 [${sessionId}] Poll #${pollCount} - Status: ${result.status} (${elapsedTime}s elapsed)`)

      // Check for timeout (AI analysis should be much faster)
      if (elapsedTime > 120) { // 2 minutes timeout for AI analysis
        console.error(`⏰ [${sessionId}] Weight estimation timeout after ${elapsedTime}s`)
        throw new Error(`AI weight estimation timed out after ${Math.round(elapsedTime / 60)} minutes. Please try again.`)
      }

      // Update progress based on elapsed time
      if (elapsedTime < 10) {
        onProgress('AI analyzing object properties', 'Identifying material type and surface characteristics...')
      } else if (elapsedTime < 20) {
        onProgress('AI analyzing object properties', 'Estimating density and structural properties...')
      } else {
        onProgress('AI analyzing object properties', 'Finalizing weight calculation and confidence assessment...')
      }

      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

      const statusResponse = await apiClient.get(`/predictions/${prediction.id}`)
      result = statusResponse.data
    }

    const totalPollTime = ((Date.now() - pollStartTime) / 1000).toFixed(1)
    console.log(`✅ [${sessionId}] Weight estimation polling completed after ${pollCount} polls (${totalPollTime}s)`)
    console.log(`🎯 [${sessionId}] Final status: ${result.status}`)

    if (result.status === 'failed') {
      console.error(`❌ [${sessionId}] Weight estimation failed:`, result.error)
      throw new Error(`Weight estimation failed: ${result.error || 'Unknown error'}`)
    }

    if (result.status !== 'succeeded' || !result.output) {
      console.error(`❌ [${sessionId}] Unexpected result:`, {
        status: result.status,
        hasOutput: !!result.output
      })
      throw new Error('Weight estimation did not complete successfully')
    }

    console.log(`🎉 [${sessionId}] Weight estimation succeeded!`)
    console.log(`📦 [${sessionId}] Raw output:`, result.output)

    // Parse the AI response
    let analysisResult
    try {
      // Extract text from the response (GPT-4o-mini returns string output)
      let outputText = ''
      if (typeof result.output === 'string') {
        outputText = result.output
      } else if (Array.isArray(result.output)) {
        outputText = result.output.join('')
      } else if (result.output && typeof result.output === 'object') {
        // Handle object response format
        outputText = JSON.stringify(result.output)
      } else {
        throw new Error('Unexpected output format from AI')
      }

      console.log(`📝 [${sessionId}] AI response text:`, outputText.substring(0, 200) + '...')

      // Extract JSON from the response (AI might include additional text)
      const jsonMatch = outputText.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])

        // Set defaults for new fields if they don't exist (backward compatibility)
        if (parsedResult.itemType === undefined) {
          parsedResult.itemType = 'single'
        }

        if (parsedResult.itemCount === undefined) {
          parsedResult.itemCount = 1
        }

        if (parsedResult.individualItemWeight === undefined && parsedResult.itemCount > 1) {
          parsedResult.individualItemWeight = parsedResult.estimatedWeight / parsedResult.itemCount
        }

        if (parsedResult.packagingWeight === undefined && parsedResult.itemCount > 1) {
          // Estimate packaging as 5-10% of total weight if not provided
          parsedResult.packagingWeight = parsedResult.estimatedWeight * 0.08
        }

        // Set defaults for new volume-related fields
        if (parsedResult.labelVolume === undefined) {
          parsedResult.labelVolume = null
        }

        if (parsedResult.volumeValidation === undefined) {
          parsedResult.volumeValidation = 'no label volume found'
        }

        if (parsedResult.containerType === undefined) {
          parsedResult.containerType = 'unknown'
        }

        if (parsedResult.liquidContent === undefined) {
          parsedResult.liquidContent = 0
        }

        // Add certainty factors if missing
        if (parsedResult.certaintyFactors) {
          if (parsedResult.certaintyFactors.scaleIdentification === undefined) {
            parsedResult.certaintyFactors.scaleIdentification = 0.7
          }
          if (parsedResult.certaintyFactors.volumeAccuracy === undefined) {
            parsedResult.certaintyFactors.volumeAccuracy = 0.6
          }
        }

        analysisResult = {
          ...parsedResult,
          volume: volume,
          processingTime: ((Date.now() - startTime) / 1000).toFixed(1),
          sessionId: sessionId
        }

        console.log(`✅ [${sessionId}] Successfully parsed AI analysis:`, {
          itemType: analysisResult.itemType,
          itemCount: analysisResult.itemCount,
          totalWeight: analysisResult.estimatedWeight,
          individualWeight: analysisResult.individualItemWeight
        })
      } else {
        throw new Error('No valid JSON found in AI response')
      }
    } catch (parseError) {
      console.error(`❌ [${sessionId}] Failed to parse AI response:`, parseError)
      console.error(`📄 [${sessionId}] Raw output:`, result.output)
      // Fallback analysis based on volume
      analysisResult = {
        estimatedWeight: volume * 1000, // Assume 1g/cm³ density
        unit: 'grams',
        confidence: 0.3,
        materialType: 'unknown',
        density: 1.0,
        reasoning: 'AI analysis failed, using fallback calculation with assumed density of 1g/cm³',
        weightRange: {
          min: volume * 500,
          max: volume * 2000
        },
        structure: 'unknown',
        itemType: 'single',
        itemCount: 1,
        individualItemWeight: volume * 1000,
        packagingWeight: 0,
        certaintyFactors: {
          materialIdentification: 0.1,
          structureAssessment: 0.1,
          densityEstimation: 0.1,
          scaleIdentification: 0.1
        },
        volume: volume,
        processingTime: ((Date.now() - startTime) / 1000).toFixed(1),
        sessionId: sessionId
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`🎉 [${sessionId}] Weight estimation completed successfully!`)
    console.log(`📊 [${sessionId}] Final results:`, {
      estimatedWeight: `${analysisResult.estimatedWeight}g`,
      confidence: `${(analysisResult.confidence * 100).toFixed(1)}%`,
      materialType: analysisResult.materialType,
      totalTime: `${totalTime}s`
    })

    return {
      ...analysisResult,
      volume: volume,
      processingTime: totalTime,
      sessionId: sessionId
    }

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`❌ [${sessionId}] Weight estimation failed after ${totalTime}s:`, error.message)

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
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      } else if (status >= 500) {
        throw new Error('Server error occurred during weight estimation. Please try again.')
      } else {
        throw new Error(`Weight estimation failed: ${message}`)
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to Replicate API. Please check your internet connection.')
    } else {
      // Something else happened
      throw new Error(`Unexpected error: ${error.message}`)
    }
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
