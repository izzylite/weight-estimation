import { useState, useCallback } from 'react'
import ImageUpload from './components/ImageUpload'
import DescriptionInput from './components/DescriptionInput'
import ModelViewer from './components/ModelViewer'
import ProgressIndicator from './components/ProgressIndicator'
import ApiConfig from './components/ApiConfig'
import GenerationSettings from './components/GenerationSettings'
import { generateModel } from './services/hunyuan3d'
import { analyzeModelVolume } from './utils/volumeCalculator'
import './App.css'

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedBlob, setGeneratedBlob] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [progressInfo, setProgressInfo] = useState('')
  const [isApiConfigured, setIsApiConfigured] = useState(false)
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





  const handleGenerate = async () => {
    const sessionId = Math.random().toString(36).substring(2, 11)
    console.log(`🚀 [App-${sessionId}] Starting generation process`)

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

    console.log(`⚙️ [App-${sessionId}] Generation settings:`, generationSettings)
    console.log(`📝 [App-${sessionId}] Description:`, description || '(none)')

    setIsGenerating(true)
    setError('')
    const modelName = generationSettings.qualityMode === 'turbo' ? 'Hunyuan3D-2 Turbo' : 'Hunyuan3D-2.1 Quality'
    setProgress(`Generating 3D model with ${modelName}`)
    setProgressInfo(`Using ${generationSettings.qualityMode} mode • ${generationSettings.generateTexture ? 'textured' : 'geometry-only'} • ${generationSettings.removeBackground ? 'background removal' : 'original background'}`)

    try {
      console.log(`🔄 [App-${sessionId}] Starting 3D model generation...`)

      // Create progress callback
      const handleProgress = (status, info) => {
        setProgress(status)
        setProgressInfo(info)
      }

      // Generate 3D model with current settings and progress callback
      const blob = await generateModel(uploadedImage, description, {
        ...generationSettings,
        onProgress: handleProgress
      })
      console.log(`✅ [App-${sessionId}] 3D model generated successfully`)
      setGeneratedBlob(blob)
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
      setProgress('')
      setProgressInfo('')

    } catch (err) {
      console.error(`❌ [App-${sessionId}] Generation failed:`, err.message)
      setError(err.message || 'Failed to generate 3D model')
      setProgress('')
      setProgressInfo('')
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

  const canGenerate = uploadedImage && !isGenerating && isApiConfigured

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 Weight Estimation Tool</h1>
        <p>Upload an image to generate a 3D model and calculate its volume</p>
      </header>

      <main className="app-main">
        <div className="input-section">
          <ApiConfig onConfigChange={handleApiConfigChange} />

          <ImageUpload
            onImageUpload={handleImageUpload}
            disabled={isGenerating}
          />

          <GenerationSettings
            onSettingsChange={handleSettingsChange}
            disabled={isGenerating}
          />

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
              {isGenerating ? '⏳ Generating...' : '🚀 Generate 3D Model & Calculate Volume'}
            </button>

            {!isApiConfigured && uploadedImage && (
              <p className="config-reminder">
                ⚠️ Please configure your Replicate API token above to generate 3D models
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



        {analysisResult && (
          <ModelViewer
            analysisResult={analysisResult}
            onDownload={handleDownload}
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
