import React from 'react'
import DescriptionInput from '../DescriptionInput'
import './DescriptionStep.css'

const DescriptionStep = ({
  onDescriptionChange,
  value,
  disabled,
  uploadedImage
}) => {
  return (
    <div className="step-section description-step">
      <DescriptionInput
        onDescriptionChange={onDescriptionChange}
        disabled={disabled}
        value={value}
      />
      
      <div className="step-hint">
        💡 Describe your object to help the AI provide more accurate weight estimates
      </div>

      {/* Requirement notice - for both modes */}
      {(!uploadedImage || !value || value.trim().length === 0) && (
        <div className="requirement-notice">
          ⚠️ Description is required to proceed
        </div>
      )}
    </div>
  )
}

export default DescriptionStep
