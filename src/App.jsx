import { useState, useCallback } from 'react'
import ImageUpload from './components/ImageUpload'
import DescriptionInput from './components/DescriptionInput'
import ModelViewer from './components/ModelViewer'
import LoadingSpinner from './components/LoadingSpinner'
import ApiConfig from './components/ApiConfig'
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
  const [isApiConfigured, setIsApiConfigured] = useState(false)

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



  const handleGenerate = async () => {
    if (!uploadedImage) {
      setError('Please upload an image first')
      return
    }

    if (!isApiConfigured) {
      setError('Please configure your Replicate API token first')
      return
    }

    setIsGenerating(true)
    setError('')
    setProgress('Generating 3D model with Replicate...')

    try {
      // Generate 3D model
      const blob = await generateModel(uploadedImage, description)
      setGeneratedBlob(blob)
      setProgress('Analyzing volume...')

      // Analyze volume
      const analysis = await analyzeModelVolume(blob)
      setAnalysisResult(analysis)
      setProgress('')

    } catch (err) {
      setError(err.message || 'Failed to generate 3D model')
      setProgress('')
    } finally {
      setIsGenerating(false)
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

            {progress && (
              <div className="progress-message">
                {progress}
              </div>
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

        {isGenerating && (
          <LoadingSpinner message={progress || 'Processing...'} />
        )}

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
