import { useState, useCallback } from 'react'
import ImageUpload from './components/ImageUpload'
import DescriptionInput from './components/DescriptionInput'
import ProgressIndicator from './components/ProgressIndicator'
import ApiConfig from './components/ApiConfig'
import GenerationSettings from './components/GenerationSettings'
import ModeSelector from './components/ModeSelector'
import ModelImport from './components/ModelImport'
import WeightEstimationResult from './components/WeightEstimationResult'
import { generateModel, setApiToken } from './services/hunyuan3d'
import { estimateWeight, setApiToken as setWeightApiToken } from './services/weightEstimation'
import { analyzeModelVolume } from './utils/volumeCalculator'
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
  const [currentStep, setCurrentStep] = useState('upload') // 'upload', 'generating', 'complete'
  const [processingMode, setProcessingMode] = useState('generate') // 'generate' or 'import'
  const [importedModel, setImportedModel] = useState(null)
  const [importedModelName, setImportedModelName] = useState('')
  const [generationSettings, setGenerationSettings] = useState({
    removeBackground: true,
    generateTexture: false,
    qualityMode: 'turbo' // Default to turbo for faster generation
  })

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

    if (processingMode === 'generate') {
      if (!uploadedImage) {
        console.warn(`⚠️ [App-${sessionId}] No image uploaded`)
        setError('Please upload an image first')
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
    setCurrentStep('generating')
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
      if (processingMode === 'import' && !uploadedImage) {
        console.log(`⚠️ [App-${sessionId}] Import mode without image - using volume-based estimation`)
        // Create a simple volume-based estimation
        weightEstimation = {
          estimatedWeight: analysis.volume * 1000, // Assume 1g/cm³ density
          unit: 'grams',
          confidence: 0.5,
          materialType: 'unknown',
          density: 1.0,
          reasoning: 'Weight estimated based on volume only (no image provided for AI analysis). Assumed density of 1g/cm³.',
          weightRange: {
            min: analysis.volume * 500,  // 0.5g/cm³
            max: analysis.volume * 2000  // 2g/cm³
          },
          structure: 'unknown',
          certaintyFactors: {
            materialIdentification: 0.1,
            structureAssessment: 0.3,
            densityEstimation: 0.2
          },
          volume: analysis.volume,
          processingTime: '0.1',
          sessionId: sessionId
        }
      } else if (uploadedImage) {
        // Use AI estimation with image (works for both generate and import modes)
        console.log(`🤖 [App-${sessionId}] Using AI estimation with image`)
        weightEstimation = await estimateWeight(uploadedImage, analysis.volume, description, {
          onProgress: handleProgress
        })
      } else {
        throw new Error('No image available for weight estimation')
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
      console.error(`❌ [App-${sessionId}] Generation failed:`, err.message)
      setError(err.message || 'Failed to generate 3D model and estimate weight')
      setProgress('')
      setProgressInfo('')
      setCurrentStep('upload')
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
    setProgress('')
    setProgressInfo('')
    setCurrentStep('upload')
  }

  const canGenerate = !isGenerating &&
    ((processingMode === 'generate' && uploadedImage && isApiConfigured) ||
     (processingMode === 'import' && importedModel))



  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 Weight Estimation Tool</h1>
        <p>Upload an image to generate a 3D model and estimate its weight using AI</p>
      </header>

      <main className="app-main">
        {/* Show input section only when not complete */}
        {currentStep !== 'complete' && (
          <div className="input-section">
            <ApiConfig onConfigChange={handleApiConfigChange} />

            <div className="image-upload-section">
              <ImageUpload
                onImageUpload={handleImageUpload}
                disabled={isGenerating}
              />
              {processingMode === 'import' && (
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
                  💡 Image is optional in import mode - upload for better AI weight analysis, or skip for volume-based estimation
                </p>
              )}
            </div>

            <ModeSelector
              mode={processingMode}
              onModeChange={handleModeChange}
              disabled={isGenerating}
            />

            {processingMode === 'generate' && (
              <GenerationSettings
                onSettingsChange={handleSettingsChange}
                disabled={isGenerating}
              />
            )}

            {processingMode === 'import' && (
              <ModelImport
                onModelImport={handleModelImport}
                disabled={isGenerating}
              />
            )}

            <DescriptionInput
              onDescriptionChange={handleDescriptionChange}
              disabled={isGenerating}
              value={description}
            />

            <div className="generate-section">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`generate-button ${canGenerate ? 'ready' : 'disabled'}`}
              >
                {isGenerating ? '⏳ Processing...' : '⚖️ Estimate Weight'}
              </button>

              {processingMode === 'generate' && !isApiConfigured && uploadedImage && (
                <p className="config-reminder">
                  ⚠️ Please configure your Replicate API token above to generate 3D models
                </p>
              )}

              {processingMode === 'import' && !importedModel && (
                <p className="config-reminder">
                  📁 Please import a 3D model file above to proceed with weight estimation
                </p>
              )}

              {(isGenerating || progress) && (
                <ProgressIndicator
                  status={progress}
                  isActive={isGenerating}
                  additionalInfo={progressInfo}
                />
              )}
            </div>

            {error && (
              <div className="error-section">
                <div className="error-message">
                  ❌ {error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show weight estimation result when complete */}
        {currentStep === 'complete' && weightResult && (
          <WeightEstimationResult
            weightResult={weightResult}
            analysisResult={analysisResult}
            originalImage={uploadedImage}
            onDownload={handleDownload}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Hunyuan3D-2 via Replicate API • Built with React & Three.js</p>
      </footer>
    </div>
  )
}

export default App
