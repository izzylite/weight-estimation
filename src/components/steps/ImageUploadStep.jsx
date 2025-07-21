import React from 'react'
import ImageUpload from '../ImageUpload'
import './ImageUploadStep.css'

const ImageUploadStep = ({
  onImageUpload,
  processingMode,
  disabled,
  uploadedImage,
  description
}) => {
  return (
    <div className="step-section image-upload-step">
      {/* Image Upload */}
      <ImageUpload
        onImageUpload={onImageUpload}
        disabled={disabled}
      />

      {/* Hint */}
      <div className="step-hint">
        💡 {processingMode === 'import'
          ? 'Image is optional but helps improve AI weight analysis accuracy'
          : 'Upload a clear image of your object for 3D model generation'
        }
      </div>

      {/* Requirement notice */}
      {!uploadedImage && (!description || description.trim().length === 0) && (
        <div className="requirement-notice">
          ⚠️ Either an image or description is required to proceed
        </div>
      )}
    </div>
  )
}

export default ImageUploadStep
