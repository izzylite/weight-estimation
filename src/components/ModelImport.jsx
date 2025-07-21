import { useState, useRef } from 'react'
import './ModelImport.css'

const ModelImport = ({ onModelImport, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false)
  const [importedFile, setImportedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleFileSelection = (file) => {
    // Validate file type
    const validExtensions = ['.glb', '.gltf']
    const fileName = file.name.toLowerCase()
    const isValidType = validExtensions.some(ext => fileName.endsWith(ext))

    if (!isValidType) {
      alert('Please select a valid 3D model file (.glb or .gltf)')
      return
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      alert('File size too large. Please select a file smaller than 50MB.')
      return
    }

    setImportedFile(file)

    // Pass the file directly (File extends Blob)
    onModelImport(file, file.name)
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const clearFile = () => {
    setImportedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onModelImport(null, null)
  }

  return (
    <div className="model-import-container">
      <div className="import-header">
        <h3>📁 Import 3D Model</h3>
        <p>Upload an existing .glb or .gltf file to skip 3D generation</p>
      </div>

      <div
        className={`import-dropzone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''} ${importedFile ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {!importedFile ? (
          <div className="dropzone-content">
            <div className="dropzone-icon">📦</div>
            <div className="dropzone-text">
              <p className="primary-text">
                {dragActive ? 'Drop your 3D model here' : 'Click to select or drag & drop'}
              </p>
              <p className="secondary-text">
                Supports .glb and .gltf files (max 50MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="file-info">
            <div className="file-icon">✅</div>
            <div className="file-details">
              <p className="file-name">{importedFile.name}</p>
              <p className="file-size">
                {(importedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="file-type">
                {importedFile.name.toLowerCase().endsWith('.glb') ? 'GLB Model' : 'GLTF Model'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearFile()
              }}
              className="clear-file-btn"
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {importedFile && (
        <div className="import-success">
          <div className="success-message">
            ✅ 3D model imported successfully! Ready for volume calculation and weight estimation.
          </div>
        </div>
      )}

      <div className="import-help">
        <details>
          <summary>💡 Tips for importing 3D models</summary>
          <div className="help-content">
            <ul>
              <li><strong>File formats:</strong> .glb (recommended) or .gltf files</li>
              <li><strong>File size:</strong> Keep under 50MB for best performance</li>
              <li><strong>Quality:</strong> Higher polygon count = more accurate volume calculation</li>
              <li><strong>Source:</strong> You can use models from previous generations or other 3D tools</li>
              <li><strong>Testing:</strong> Perfect for testing weight estimation without waiting for generation</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  )
}

export default ModelImport
