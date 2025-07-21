import React from 'react'
import ModelImport from '../ModelImport'
import './ModelUploadStep.css'

const ModelUploadStep = ({ 
  onModelImport, 
  disabled 
}) => {
  return (
    <div className="step-section model-upload-step">
      <ModelImport
        onModelImport={onModelImport}
        disabled={disabled}
      />
    </div>
  )
}

export default ModelUploadStep
