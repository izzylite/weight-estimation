import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import './ModelViewer.css'

// Component to render the 3D model
const Model = ({ model, autoRotate = false }) => {
  const meshRef = useRef()
  
  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  if (!model) return null

  return (
    <primitive 
      ref={meshRef}
      object={model.clone()} 
      scale={1}
      position={[0, 0, 0]}
    />
  )
}

// Loading component
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading 3D model...</p>
  </div>
)

const ModelViewer = ({ analysisResult, onDownload }) => {
  const [autoRotate, setAutoRotate] = useState(true)
  const [showWireframe, setShowWireframe] = useState(false)

  if (!analysisResult) {
    return (
      <div className="model-viewer-container">
        <div className="no-model">
          <p>No 3D model to display</p>
        </div>
      </div>
    )
  }

  const { volume, dimensions, meshCount, totalVertices, totalFaces, model } = analysisResult

  const downloadModel = () => {
    if (onDownload) {
      onDownload()
    }
  }

  return (
    <div className="model-viewer-container">
      <div className="viewer-header">
        <h3>3D Model & Volume Analysis</h3>
        <div className="viewer-controls">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`control-button ${autoRotate ? 'active' : ''}`}
          >
            {autoRotate ? '⏸️' : '▶️'} Auto Rotate
          </button>
          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`control-button ${showWireframe ? 'active' : ''}`}
          >
            🔲 Wireframe
          </button>
          <button
            onClick={downloadModel}
            className="download-button"
          >
            💾 Download GLB
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <div className="canvas-container">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ background: 'linear-gradient(to bottom, #f0f0f0, #e0e0e0)' }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <pointLight position={[-10, -10, -5]} intensity={0.5} />

              <Model model={model} autoRotate={autoRotate} />

              <Environment preset="studio" />
              <ContactShadows
                position={[0, -1, 0]}
                opacity={0.4}
                scale={10}
                blur={2}
                far={4}
              />

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={autoRotate}
                autoRotateSpeed={2}
              />
            </Suspense>
          </Canvas>

          <div className="canvas-overlay">
            <div className="model-info">
              <p>🔄 Drag to rotate • 🔍 Scroll to zoom • 🖱️ Right-click to pan</p>
            </div>
          </div>
        </div>

        <div className="analysis-panel">
          <div className="volume-display">
            <h4>📏 Volume Analysis</h4>
            <div className="volume-value">
              <span className="volume-number">{volume.toFixed(6)}</span>
              <span className="volume-unit">cubic units</span>
            </div>
          </div>

          <div className="dimensions-grid">
            <div className="dimension-item">
              <span className="label">Width:</span>
              <span className="value">{dimensions.width.toFixed(3)}</span>
            </div>
            <div className="dimension-item">
              <span className="label">Height:</span>
              <span className="value">{dimensions.height.toFixed(3)}</span>
            </div>
            <div className="dimension-item">
              <span className="label">Depth:</span>
              <span className="value">{dimensions.depth.toFixed(3)}</span>
            </div>
            <div className="dimension-item">
              <span className="label">Bounding Volume:</span>
              <span className="value">{dimensions.volume.toFixed(3)}</span>
            </div>
          </div>

          <div className="model-stats">
            <h4>📊 Model Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Meshes:</span>
                <span className="stat-value">{meshCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Vertices:</span>
                <span className="stat-value">{totalVertices.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Faces:</span>
                <span className="stat-value">{totalFaces.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="volume-note">
            <p><strong>Note:</strong> Volume is calculated using the divergence theorem on the mesh geometry. Results may vary based on model complexity and mesh quality.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelViewer
