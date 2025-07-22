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

// Available AI models for weight estimation
const AI_MODELS = {
  'gpt-4o-mini': {
    version: '167a3b6f79e1ab52cedcf14cf1b08d63d094958809d9115481623869bc015bd4',
    name: 'GPT-4o Mini',
    description: 'Fast and cost-effective analysis',
    costRange: '$0.01-0.02 per request',
    inputFormat: 'replicate', // prompt + image_input format
    maxTokens: 1000,
    temperature: 0.1
  },
  'claude-4-sonnet': {
    version: 'anthropic/claude-4-sonnet', // Use Claude 4 Sonnet
    name: 'Claude 4 Sonnet',
    description: 'Superior reasoning and analysis',
    costRange: '$0.02-0.04 per request',
    inputFormat: 'messages', // Uses Anthropic Messages API format
    maxTokens: 1500,
    temperature: 0.1
  },
  'gpt-4o': {
    version: '24a50d9cb3c11c252902308e2ffa511fc353b24d312fcdebaab457ce96eab1a5',
    name: 'GPT-4o',
    description: 'Highest quality analysis',
    costRange: '$0.05-0.10 per request',
    inputFormat: 'replicate', // Same as GPT-4o-mini: prompt + image_input
    maxTokens: 2000,
    temperature: 0.1
  }
}

// Default model - load from localStorage if available
let selectedModel = localStorage.getItem('ai_model_selection') || 'gpt-4o-mini'

// Validate the loaded model exists, fallback to default if not
if (!AI_MODELS[selectedModel]) {
  console.warn(`⚠️ Saved model "${selectedModel}" not found, falling back to default`)
  selectedModel = 'gpt-4o-mini'
  localStorage.setItem('ai_model_selection', selectedModel)
}

/**
 * Get available AI models for weight estimation
 * @returns {Object} Available models with their configurations
 */
export const getAvailableModels = () => {
  return AI_MODELS
}

/**
 * Set the AI model to use for weight estimation
 * @param {string} modelKey - The model key (e.g., 'gpt-4o-mini', 'claude-4-sonnet', 'gpt-4o')
 */
export const setEstimationModel = (modelKey) => {
  if (AI_MODELS[modelKey]) {
    selectedModel = modelKey
    // Save to localStorage for persistence
    localStorage.setItem('ai_model_selection', modelKey)
    console.log(`🤖 Weight estimation model set to: ${AI_MODELS[modelKey].name}`)
  } else {
    console.error(`❌ Unknown model: ${modelKey}. Available models:`, Object.keys(AI_MODELS))
  }
}

/**
 * Get the currently selected model
 * @returns {string} Current model key
 */
export const getCurrentModel = () => {
  return selectedModel
}

/**
 * Get the current model configuration
 * @returns {Object} Current model configuration
 */
export const getCurrentModelConfig = () => {
  const config = AI_MODELS[selectedModel]
  if (!config) {
    console.error(`❌ Model configuration not found for: ${selectedModel}. Available models:`, Object.keys(AI_MODELS))
    // Return default config to prevent crashes
    return AI_MODELS['gpt-4o-mini'] || {}
  }
  return config
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
    // Validate file parameter
    if (!file) {
      reject(new Error('No file provided to fileToDataURL'))
      return
    }

    if (!(file instanceof File) && !(file instanceof Blob)) {
      reject(new Error(`Invalid file type provided to fileToDataURL: ${typeof file}`))
      return
    }

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

  // Validate imageFile parameter
  if (!imageFile) {
    console.log(`⚠️ [${sessionId}] No image file provided - this should not happen, use volume-based estimation instead`)
    throw new Error('No image file provided for AI weight estimation')
  }

  // Check if imageFile is a valid File object
  if (!(imageFile instanceof File) && !(imageFile instanceof Blob)) {
    console.error(`❌ [${sessionId}] Invalid image file type:`, {
      imageFile,
      type: typeof imageFile,
      constructor: imageFile?.constructor?.name
    })
    throw new Error('Invalid image file provided - expected File or Blob object')
  }

  console.log(`📁 [${sessionId}] Image file:`, {
    name: imageFile.name || 'unknown',
    size: imageFile.size ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : 'unknown',
    type: imageFile.type || 'unknown'
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
      promptType: typeof prompt,
      promptLength: (prompt && typeof prompt === 'string') ? prompt.length : 0,
      hasImageDataURL: !!imageDataURL,
      imageDataURLType: typeof imageDataURL,
      imageDataURLLength: (imageDataURL && typeof imageDataURL === 'string') ? imageDataURL.length : 0,
      imageDataURLPrefix: (imageDataURL && typeof imageDataURL === 'string') ? imageDataURL.substring(0, 30) + '...' : 'none'
    })

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error(`❌ [${sessionId}] Prompt validation failed:`, {
        prompt,
        type: typeof prompt,
        hasPrompt: !!prompt
      })
      throw new Error('Prompt is empty, invalid, or not a string')
    }

    if (!imageDataURL || typeof imageDataURL !== 'string' || !imageDataURL.startsWith('data:image/')) {
      console.error(`❌ [${sessionId}] Image data URL validation failed:`, {
        hasImageDataURL: !!imageDataURL,
        type: typeof imageDataURL,
        startsWithDataImage: (imageDataURL && typeof imageDataURL === 'string') ? imageDataURL.startsWith('data:image/') : false,
        prefix: (imageDataURL && typeof imageDataURL === 'string') ? imageDataURL.substring(0, 50) : 'none'
      })
      throw new Error('Image data URL is invalid or not a string')
    }

    // Get current model configuration
    const modelConfig = getCurrentModelConfig()

    if (!modelConfig) {
      console.error(`❌ [${sessionId}] Model configuration not found for model: ${selectedModel}`)
      throw new Error(`Model configuration not found for: ${selectedModel}. Available models: ${Object.keys(AI_MODELS).join(', ')}`)
    }

    console.log(`📝 [${sessionId}] Preparing input for ${modelConfig.name || 'unknown'}:`, {
      promptLength: prompt.length, // Safe to access now after validation
      hasImageDataURL: !!imageDataURL,
      model: selectedModel,
      costRange: modelConfig.costRange || 'unknown',
      inputFormat: modelConfig.inputFormat || 'unknown',
      version: modelConfig.version || 'unknown'
    })

    // Create prediction payload based on model format
    let predictionPayload

    if (modelConfig.inputFormat === 'replicate') {
      // GPT-4o-mini format: prompt + image_input
      predictionPayload = {
        version: modelConfig.version || '',
        input: {
          prompt: prompt,
          image_input: [imageDataURL],
          max_completion_tokens: modelConfig.maxTokens || 1000,
          temperature: modelConfig.temperature || 0.1
        }
      }
    } else if (modelConfig.inputFormat === 'messages') {
      // Claude format on Replicate: Uses simple prompt + image format
      predictionPayload = {
        input: {
          prompt: prompt,
          image: imageDataURL,
          max_tokens: modelConfig.maxTokens || 1500,
          temperature: modelConfig.temperature || 0.1
        }
      }
    } else {
      throw new Error(`Unsupported model format: ${modelConfig.inputFormat || 'unknown'}`)
    }

    console.log(`📤 [${sessionId}] Sending prediction payload:`, {
      version: predictionPayload.version,
      inputFormat: modelConfig.inputFormat,
      modelName: modelConfig.inputFormat === 'messages' ? modelConfig.version : 'version-based',
      promptLength: predictionPayload.input.prompt ? predictionPayload.input.prompt.length : 'unknown',
      imageInputCount: modelConfig.inputFormat === 'replicate' ? predictionPayload.input.image_input?.length :
                      modelConfig.inputFormat === 'messages' ? 1 : 'unknown',
      maxTokens: predictionPayload.input.max_completion_tokens || predictionPayload.input.max_tokens,
      temperature: predictionPayload.input.temperature
    })

    // Log the full payload structure (without the actual image data for brevity)
    let payloadForLogging
    if (modelConfig.inputFormat === 'replicate') {
      payloadForLogging = {
        ...predictionPayload,
        input: {
          ...predictionPayload.input,
          image_input: ['[IMAGE_DATA_TRUNCATED]'] // Hide actual image data
        }
      }
    } else if (modelConfig.inputFormat === 'messages') {
      payloadForLogging = {
        input: {
          ...predictionPayload.input,
          prompt: "[PROMPT_TRUNCATED]",
          image: "[IMAGE_DATA_TRUNCATED]"
        }
      }
    }
    console.log(`📋 [${sessionId}] Full payload structure:`, JSON.stringify(payloadForLogging, null, 2))

    // Validate payload one more time before sending
    if (modelConfig.inputFormat === 'replicate') {
      // GPT models use prompt + image_input
      if (!predictionPayload.input.prompt || predictionPayload.input.prompt.trim().length === 0) {
        console.error(`❌ [${sessionId}] Final validation failed: prompt is empty in payload`)
        throw new Error('Prompt is empty in final payload')
      }
      if (!predictionPayload.input.image_input || predictionPayload.input.image_input.length === 0) {
        console.error(`❌ [${sessionId}] Final validation failed: image_input array is empty in payload`)
        throw new Error('Image input array is empty in final payload')
      }
    } else if (modelConfig.inputFormat === 'messages') {
      // Claude models use prompt + image
      if (!predictionPayload.input.prompt || predictionPayload.input.prompt.trim().length === 0) {
        console.error(`❌ [${sessionId}] Final validation failed: prompt is empty in payload`)
        throw new Error('Prompt is empty in final payload')
      }
      if (!predictionPayload.input.image || predictionPayload.input.image.length === 0) {
        console.error(`❌ [${sessionId}] Final validation failed: image is empty in payload`)
        throw new Error('Image is empty in final payload')
      }
    }

    // Use different API endpoint for official models vs version-based models
    let apiEndpoint
    if (modelConfig.inputFormat === 'messages') {
      // For official Anthropic models, use the model-specific endpoint
      apiEndpoint = `/models/${modelConfig.version}/predictions`
    } else {
      // For version-based models, use the general predictions endpoint
      apiEndpoint = '/predictions'
    }

    console.log(`📡 [${sessionId}] Using API endpoint: ${apiEndpoint}`)
    const predictionResponse = await apiClient.post(apiEndpoint, predictionPayload)
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
    console.log(`📦 [${sessionId}] Output type:`, typeof result.output)
    console.log(`📦 [${sessionId}] Output structure:`, result.output)
    console.log(`📦 [${sessionId}] Full result structure:`, Object.keys(result))
    console.log(`📦 [${sessionId}] Model used:`, selectedModel)

    // Parse the AI response
    let analysisResult
    try {
      // Extract text from the response - handle different model formats
      let outputText = ''

      if (typeof result.output === 'string') {
        outputText = result.output
      } else if (Array.isArray(result.output)) {
        outputText = result.output.join('')
      } else if (result.output && typeof result.output === 'object') {
        // Handle object response format - might be Claude's format
        if (result.output.content) {
          outputText = result.output.content
        } else if (result.output.text) {
          outputText = result.output.text
        } else {
          outputText = JSON.stringify(result.output)
        }
      } else if (result.output === null || result.output === undefined) {
        // Check if Claude returns response in a different field
        if (result.content) {
          outputText = result.content
        } else if (result.text) {
          outputText = result.text
        } else {
          throw new Error(`AI returned null/undefined output. Full result: ${JSON.stringify(result)}`)
        }
      } else {
        throw new Error(`Unexpected output format from AI: ${typeof result.output}`)
      }

      // Safety check for outputText
      if (!outputText || typeof outputText !== 'string' || outputText.length === 0) {
        throw new Error(`AI returned empty or invalid response. Model: ${selectedModel}, Type: ${typeof outputText}, Full result: ${JSON.stringify(result)}`)
      }

      console.log(`📝 [${sessionId}] AI response text (first 200 chars):`, outputText.substring(0, Math.min(200, outputText.length)) + '...')
      console.log(`📝 [${sessionId}] AI response length:`, outputText.length)

      // Extract JSON from the response (AI might include additional text)
      const jsonMatch = outputText.match(/\{[\s\S]*\}/)

      if (jsonMatch && jsonMatch[0]) {
        console.log(`📝 [${sessionId}] Found JSON match:`, jsonMatch[0].substring(0, 100) + '...')
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
          sessionId: sessionId,
          aiModel: {
            key: selectedModel,
            name: modelConfig.name,
            description: modelConfig.description,
            costRange: modelConfig.costRange
          }
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

      // Throw error instead of using fallback
      throw new Error(`AI analysis failed to parse response: ${parseError.message}. The AI model may have returned an unexpected format or the response was corrupted.`)
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
      sessionId: sessionId,
      aiModel: analysisResult.aiModel || {
        key: selectedModel,
        name: modelConfig.name,
        description: modelConfig.description,
        costRange: modelConfig.costRange
      }
    }

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
    console.error(`❌ [${sessionId}] Weight estimation failed after ${totalTime}s:`, errorMessage)
    console.error(`❌ [${sessionId}] Full error object:`, error)

    if (error?.response) {
      // Server responded with error status
      const status = error.response?.status || 'unknown'
      const message = error.response?.data?.detail || error.response?.data?.message || error.response?.statusText || 'Unknown server error'

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

/**
 * Clear the saved model selection from localStorage
 */
export const clearModelSelection = () => {
  localStorage.removeItem('ai_model_selection')
  selectedModel = 'gpt-4o-mini' // Reset to default
  console.log(`🗑️ Model selection cleared, reset to default: ${AI_MODELS[selectedModel].name}`)
}
