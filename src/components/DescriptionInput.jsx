import { useState } from 'react'
import './DescriptionInput.css'

const DescriptionInput = ({ onDescriptionChange, disabled = false, value = '' }) => {
  const [description, setDescription] = useState(value)
  const [charCount, setCharCount] = useState(value.length)
  
  const maxLength = 500

  const handleChange = (e) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setDescription(newValue)
      setCharCount(newValue.length)
      onDescriptionChange(newValue)
    }
  }

  const handleClear = () => {
    setDescription('')
    setCharCount(0)
    onDescriptionChange('')
  }

  return (
    <div className="description-input-container">
      <div className="description-header">
        <h3>Image Description</h3>
        <span className="char-counter">
          {charCount}/{maxLength}
        </span>
      </div>
      
      <div className="description-input-wrapper">
        <textarea
          value={description}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Describe the object in the image to help generate a more accurate 3D model. For example: 'A red ceramic coffee mug with a handle' or 'A wooden chair with four legs and a backrest'..."
          className={`description-textarea ${disabled ? 'disabled' : ''}`}
          rows={4}
        />
        
        {description && !disabled && (
          <button 
            onClick={handleClear}
            className="clear-description-button"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      <div className="description-tips">
        <p><strong>Tips for better results:</strong></p>
        <ul>
          <li>Be specific about the object's shape, material, and key features</li>
          <li>Mention colors, textures, and distinctive characteristics</li>
          <li>Include size references if relevant (e.g., "small", "large")</li>
          <li>Describe the object's purpose or function</li>
        </ul>
      </div>
    </div>
  )
}

export default DescriptionInput
