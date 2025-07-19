import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import './ImageUpload.css'

const ImageUpload = ({ onImageUpload, disabled = false }) => {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('')
    
    if (rejectedFiles.length > 0) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WebP)')
      return
    }

    const file = acceptedFiles[0]
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target.result)
      }
      reader.readAsDataURL(file)

      // Pass file to parent component
      onImageUpload(file)
    }
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    disabled
  })

  const clearImage = () => {
    setPreview(null)
    setError('')
    onImageUpload(null)
  }

  return (
    <div className="image-upload-container">
      <h3>Upload Image</h3>
      
      {!preview ? (
        <div 
          {...getRootProps()} 
          className={`dropzone ${isDragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <div className="upload-icon">📁</div>
            {isDragActive ? (
              <p>Drop the image here...</p>
            ) : (
              <div>
                <p>Drag & drop an image here, or click to select</p>
                <p className="file-types">Supports: PNG, JPG, JPEG, WebP (max 10MB)</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <button 
            onClick={clearImage} 
            className="clear-button"
            disabled={disabled}
          >
            ✕ Remove
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
