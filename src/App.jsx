import { useState, useCallback } from 'react'
import ModeSelectionStep from './components/steps/ModeSelectionStep'
import ModelUploadStep from './components/steps/ModelUploadStep'
import ImageUploadStep from './components/steps/ImageUploadStep'
import DescriptionStep from './components/steps/DescriptionStep'
import ProcessingStep from './components/steps/ProcessingStep'
import ResultsStep from './components/steps/ResultsStep'
import ErrorHandlingStep from './components/steps/ErrorHandlingStep'
import { generateModel, setApiToken } from './services/hunyuan3d'
import { estimateWeight, setApiToken as setWeightApiToken } from './services/weightEstimation'
import { analyzeModelVolume } from './utils/volumeCalculator'
import { extractModelMetadata } from './utils/modelMetadataExtractor'
import './App.css'

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedBlob, setGeneratedBlob] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [weightResult, setWeightResult] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [progressInfo, setProgressInfo] = useState('')
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  // Wizard steps: 'mode' -> 'upload' -> 'image' -> 'description' -> 'processing' -> 'complete' -> 'error'
  const [currentStep, setCurrentStep] = useState('mode')
  const [errorDetails, setErrorDetails] = useState(null)
  const [processingMode, setProcessingMode] = useState('generate') // 'generate' or 'import'
  const [importedModel, setImportedModel] = useState(null)
  const [importedModelName, setImportedModelName] = useState('')
  const [generationSettings, setGenerationSettings] = useState({
    removeBackground: true,
    generateTexture: false,
    qualityMode: 'turbo' // Default to turbo for faster generation
  })


  // Wizard step definitions
  const wizardSteps = [
    { id: 'mode', title: 'Choose Mode', description: 'Select how to obtain your 3D model' },
    { id: 'upload', title: 'Upload Model', description: 'Upload your 3D model file' },
    { id: 'image', title: 'Add Image', description: 'Upload an image for AI analysis (optional)' },
    { id: 'description', title: 'Add Details', description: 'Describe your object for better analysis' },
    { id: 'processing', title: 'Processing', description: 'Analyzing your object...' },
    { id: 'complete', title: 'Results', description: 'Weight estimation complete!' }
  ]



  const getCurrentStepNumber = () => {
    return wizardSteps.findIndex(step => step.id === currentStep) + 1
  }

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'mode':
        // For generate mode, API must be configured. For import mode, no API needed.
        return processingMode === 'import' || (processingMode === 'generate' && isApiConfigured)
      case 'upload':
        return processingMode === 'generate' || (processingMode === 'import' && importedModel)
      case 'image':
        // Image is required for both generate and import modes
        return uploadedImage
      case 'description':
        // Description is required for both generate and import modes
        return description && description.trim().length > 0
      default:
        return false
    }
  }

  // Get tooltip message for disabled next button
  const getNextButtonTooltip = () => {
    if (canProceedToNextStep()) return ''

    switch (currentStep) {
      case 'mode':
        return processingMode === 'generate' && !isApiConfigured
          ? 'Please configure your API token to proceed'
          : ''
      case 'upload':
        return processingMode === 'import' && !importedModel
          ? 'Please import a 3D model to proceed'
          : ''
      case 'image':
        return !uploadedImage
          ? 'Please upload an image to proceed'
          : ''
      case 'description':
        return (!description || description.trim().length === 0)
          ? 'Please provide a description to proceed'
          : ''
      default:
        return ''
    }
  }

  // Navigation functions
  const goToNextStep = () => {
    const currentIndex = wizardSteps.findIndex(step => step.id === currentStep)
    if (currentIndex < wizardSteps.length - 1 && canProceedToNextStep()) {
      const nextStep = wizardSteps[currentIndex + 1]

      // Skip upload step if in generate mode
      if (nextStep.id === 'upload' && processingMode === 'generate') {
        setCurrentStep('image')
      } else {
        setCurrentStep(nextStep.id)
      }
    }
  }

  const goToPreviousStep = () => {
    const currentIndex = wizardSteps.findIndex(step => step.id === currentStep)
    if (currentIndex > 0) {
      const prevStep = wizardSteps[currentIndex - 1]

      // Skip upload step if in generate mode when going back
      if (prevStep.id === 'upload' && processingMode === 'generate') {
        setCurrentStep('mode')
      } else {
        setCurrentStep(prevStep.id)
      }
    }
  }

  // Check if we can generate (validation for final step)
  const hasImageAndDescription = uploadedImage && (description && description.trim().length > 0)
  const canGenerate = (
    (processingMode === 'generate' && hasImageAndDescription && isApiConfigured) ||
    (processingMode === 'import' && hasImageAndDescription && importedModel) // Import mode requires image, description AND model
  )

  const handleImageUpload = useCallback((file) => {
    setUploadedImage(file)
    setError('')
    // Clear previous results when new image is uploaded
    setGeneratedBlob(null)
    setAnalysisResult(null)
  }, [])

  const handleDescriptionChange = useCallback((desc) => {
    setDescription(desc)
  }, [])

  const handleApiConfigChange = useCallback((isValid) => {
    setIsApiConfigured(isValid)
  }, [])

  const handleSettingsChange = useCallback((settings) => {
    setGenerationSettings(settings)
  }, [])

  const handleModelChange = useCallback((modelKey) => {
    console.log(`🤖 [App] AI model changed to: ${modelKey}`)
    // Model selection is now handled by the weightEstimation service and persisted in localStorage
  }, [])

  const handleModeChange = useCallback((mode) => {
    setProcessingMode(mode)
    // Clear any existing model data when switching modes
    setGeneratedBlob(null)
    setImportedModel(null)
    setImportedModelName('')
    setAnalysisResult(null)
    setWeightResult(null)
    setError('')
  }, [])

  const handleModelImport = useCallback((blob, fileName) => {
    setImportedModel(blob)
    setImportedModelName(fileName || '')
    // Clear any generated model data
    setGeneratedBlob(null)
    setAnalysisResult(null)
    setWeightResult(null)
    setError('')
  }, [])





  const handleGenerate = async () => {
    const sessionId = Math.random().toString(36).substring(2, 11)
    console.log(`🚀 [App-${sessionId}] Starting ${processingMode} process`)

    // Check if user has both image and description (required for generate mode)
    if (processingMode === 'generate' && (!uploadedImage || !description || description.trim().length === 0)) {
      console.warn(`⚠️ [App-${sessionId}] Missing image or description for generation`)
      setError('Please upload an image AND provide a description of your object for 3D model generation')
      return
    }

    if (processingMode === 'generate') {
      if (!uploadedImage) {
        console.warn(`⚠️ [App-${sessionId}] No image uploaded for generation`)
        setError('Please upload an image for 3D model generation')
        return
      }
      if (!isApiConfigured) {
        console.warn(`⚠️ [App-${sessionId}] API not configured`)
        setError('Please configure your Replicate API token first')
        return
      }
    }

    if (processingMode === 'import') {
      if (!importedModel) {
        console.warn(`⚠️ [App-${sessionId}] No 3D model imported`)
        setError('Please import a 3D model file first')
        return
      }
    }

    console.log(`⚙️ [App-${sessionId}] Processing mode:`, processingMode)
    console.log(`📝 [App-${sessionId}] Description:`, description || '(none)')

    setIsGenerating(true)
    setCurrentStep('processing')
    setError('')
    setWeightResult(null)
    setAnalysisResult(null)

    try {
      let blob

      // Create progress callback (used by both modes)
      const handleProgress = (status, info) => {
        setProgress(status)
        setProgressInfo(info)
      }

      if (processingMode === 'generate') {
        console.log(`⚙️ [App-${sessionId}] Generation settings:`, generationSettings)
        const modelName = generationSettings.qualityMode === 'turbo' ? 'Hunyuan3D-2 Turbo' : 'Hunyuan3D-2.1 Quality'
        setProgress(`Generating 3D model with ${modelName}`)
        setProgressInfo(`Using ${generationSettings.qualityMode} mode • ${generationSettings.generateTexture ? 'textured' : 'geometry-only'} • ${generationSettings.removeBackground ? 'background removal' : 'original background'}`)

        console.log(`🔄 [App-${sessionId}] Starting 3D model generation...`)

        // Generate 3D model with current settings and progress callback
        blob = await generateModel(uploadedImage, description, {
          ...generationSettings,
          onProgress: handleProgress
        })
        console.log(`✅ [App-${sessionId}] 3D model generated successfully`)
        setGeneratedBlob(blob)
      } else {
        // Import mode - use the imported model
        console.log(`📁 [App-${sessionId}] Using imported model: ${importedModelName}`)
        setProgress('Processing imported 3D model')
        setProgressInfo(`Using imported model: ${importedModelName}`)
        blob = importedModel
        setGeneratedBlob(blob)
      }

      setProgress('Analyzing volume and geometry')
      setProgressInfo('Loading 3D model and calculating precise volume measurements...')

      console.log(`📊 [App-${sessionId}] Starting volume analysis...`)
      // Analyze volume
      const analysis = await analyzeModelVolume(blob)
      console.log(`✅ [App-${sessionId}] Volume analysis completed:`, {
        volume: analysis.volume,
        meshCount: analysis.meshCount,
        vertices: analysis.totalVertices
      })
      setAnalysisResult(analysis)

      // Extract detailed 3D model metadata for enhanced AI analysis
      console.log(`📐 [App-${sessionId}] Extracting 3D model metadata...`)
      setProgress('Extracting 3D model metadata')
      setProgressInfo('Analyzing mesh geometry, surface area, and structural properties...')
      const modelMetadata = await extractModelMetadata(blob)
      console.log(`✅ [App-${sessionId}] Model metadata extracted:`, modelMetadata)

      // Now estimate weight using AI
      console.log(`⚖️ [App-${sessionId}] Starting weight estimation...`)
      setProgress('Estimating weight with AI')
      setProgressInfo('AI is analyzing material properties and calculating weight...')

      // Ensure API token is set before weight estimation
      const savedToken = localStorage.getItem('replicate_api_token')
      if (savedToken) {
        console.log(`🔑 [App-${sessionId}] Setting API token for both services`)
        setApiToken(savedToken) // For 3D generation
        setWeightApiToken(savedToken) // For weight estimation
      }

      // Handle weight estimation based on mode and available data
      let weightEstimation
      if (uploadedImage) {
        // Use AI estimation with image and 3D model metadata (works for both generate and import modes)
        console.log(`🤖 [App-${sessionId}] Using AI estimation with image and 3D model metadata`)
        weightEstimation = await estimateWeight(uploadedImage, analysis.volume, description, {
          onProgress: handleProgress,
          modelMetadata: modelMetadata
        })
      } else {
        // No image provided - this should not happen as validation requires image
        console.error(`❌ [App-${sessionId}] No image provided for AI weight estimation`)
        throw new Error('Image is required for AI weight estimation. Please upload an image of the object.')
      }

      console.log(`✅ [App-${sessionId}] Weight estimation completed:`, {
        estimatedWeight: `${weightEstimation.estimatedWeight}g`,
        confidence: `${(weightEstimation.confidence * 100).toFixed(1)}%`,
        materialType: weightEstimation.materialType
      })
      setWeightResult(weightEstimation)
      setCurrentStep('complete')
      setProgress('')
      setProgressInfo('')

    } catch (err) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error occurred'
      console.error(`❌ [App-${sessionId}] Generation failed:`, errorMessage)
      console.error(`❌ [App-${sessionId}] Full error object:`, err)

      // Set detailed error information for the error handling page
      setError(errorMessage || 'Failed to generate 3D model and estimate weight')
      setErrorDetails({
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        processingMode: processingMode,
        errorType: err.name || 'Error',
        stack: err.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      })

      setProgress('')
      setProgressInfo('')
      setCurrentStep('error') // Go to error handling step
    } finally {
      setIsGenerating(false)
      console.log(`🏁 [App-${sessionId}] Generation process completed`)
    }
  }

  const handleDownload = () => {
    if (generatedBlob) {
      const url = URL.createObjectURL(generatedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'generated-model.glb'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleStartOver = () => {
    setUploadedImage(null)
    setDescription('')
    setGeneratedBlob(null)
    setImportedModel(null)
    setImportedModelName('')
    setAnalysisResult(null)
    setWeightResult(null)
    setError('')
    setErrorDetails(null)
    setProgress('')
    setProgressInfo('')
    setCurrentStep('mode')
  }

  // Error handling functions
  const handleRetryFromError = () => {
    setError('')
    setErrorDetails(null)
    setCurrentStep('processing')
    // Retry the generation process
    handleGenerate()
  }

  const handleGoBackFromError = () => {
    setError('')
    setErrorDetails(null)
    setCurrentStep('description')
  }

  const handleChangeSettingsFromError = () => {
    setError('')
    setErrorDetails(null)
    setCurrentStep('mode')
  }

  const handleCheckConfigurationFromError = () => {
    setError('')
    setErrorDetails(null)
    setCurrentStep('mode')
    // Could also trigger API configuration modal/section
  }



  const handleCancelProcessing = () => {
    // Stop the generation process
    setIsGenerating(false)
    setProgress('')
    setProgressInfo('')
    setError('')
    setErrorDetails(null)
    // Go back to the description step
    setCurrentStep('description')
  }





  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1>⚖️ AI Weight Estimator</h1>
            <p>Upload an image or 3D model to estimate weight using AI</p>
          </div>
        </header>

        <main className="app-main">
          {/* Wizard Steps */}
          {currentStep !== 'complete' && currentStep !== 'error' && (
            <div className="wizard-container">
              {/* Step Content */}
              <div className="step-content">
                {/* Step 1: Mode Selection */}
                {currentStep === 'mode' && (
                  <ModeSelectionStep
                    processingMode={processingMode}
                    onModeChange={handleModeChange}
                    onSettingsChange={handleSettingsChange}
                    onApiConfigChange={handleApiConfigChange}
                    onModelChange={handleModelChange}
                    disabled={isGenerating}
                  />
                )}

                {/* Step 2: Model Upload (Import mode only) */}
                {currentStep === 'upload' && processingMode === 'import' && (
                  <ModelUploadStep
                    onModelImport={handleModelImport}
                    disabled={isGenerating}
                  />
                )}

                {/* Step 3: Image Upload */}
                {currentStep === 'image' && (
                  <ImageUploadStep
                    onImageUpload={handleImageUpload}
                    processingMode={processingMode}
                    disabled={isGenerating}
                    uploadedImage={uploadedImage}
                    description={description}
                  />
                )}

                {/* Step 4: Description */}
                {currentStep === 'description' && (
                  <DescriptionStep
                    onDescriptionChange={handleDescriptionChange}
                    value={description}
                    disabled={isGenerating}
                    uploadedImage={uploadedImage}
                  />
                )}

                {/* Processing Step */}
                {currentStep === 'processing' && (
                  <ProcessingStep
                    isGenerating={isGenerating}
                    progress={progress}
                    progressInfo={progressInfo}
                    error={error}
                    onCancel={handleCancelProcessing}
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              {currentStep !== 'processing' && (
                <div className="wizard-navigation">
                  <button
                    onClick={goToPreviousStep}
                    disabled={getCurrentStepNumber() === 1}
                    className="nav-button secondary"
                  >
                    ← Previous
                  </button>

                  <div className="nav-spacer"></div>

                  {currentStep === 'description' ? (
                    <div className="estimate-button-container">
                      <button
                        onClick={() => {
                          setCurrentStep('processing')
                          handleGenerate()
                        }}
                        disabled={!canGenerate}
                        className={`nav-button primary ${canGenerate ? 'ready' : 'disabled'}`}
                        title={!canGenerate ? (
                          processingMode === 'generate'
                            ? (!uploadedImage ? 'Please provide both image and description to proceed' : 'Please provide description to proceed')
                            : (!hasImageAndDescription ? 'Please provide both image and description to proceed' : 'Please import a 3D model to proceed')
                        ) : ''}
                      >
                        ⚖️ Estimate Weight
                      </button>
                      {!canGenerate && (
                        <div className="button-help-text">
                          {processingMode === 'generate'
                            ? (!uploadedImage ? 'Please provide both image and description to proceed' : 'Please provide description to proceed')
                            : (!hasImageAndDescription ? 'Please provide both image and description to proceed' : 'Please import a 3D model to proceed')
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="next-button-container">
                      <button
                        onClick={goToNextStep}
                        disabled={!canProceedToNextStep()}
                        className={`nav-button primary ${canProceedToNextStep() ? 'ready' : 'disabled'}`}
                        title={getNextButtonTooltip()}
                      >
                        Next →
                      </button>
                      {!canProceedToNextStep() && getNextButtonTooltip() && (
                        <div className="button-help-text">
                          {getNextButtonTooltip()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show weight estimation result when complete */}
          {currentStep === 'complete' && weightResult && (
            <ResultsStep
              weightResult={weightResult}
              analysisResult={analysisResult}
              originalImage={uploadedImage}
              onDownload={handleDownload}
              onStartOver={handleStartOver}
            />
          )}

          {/* Show error handling page when error occurs */}
          {currentStep === 'error' && error && (
            <ErrorHandlingStep
              error={error}
              errorDetails={errorDetails}
              onRetry={handleRetryFromError}
              onStartOver={handleStartOver}
              onGoBack={handleGoBackFromError}
              onChangeSettings={handleChangeSettingsFromError}
              onCheckConfiguration={handleCheckConfigurationFromError}
              disabled={isGenerating}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
