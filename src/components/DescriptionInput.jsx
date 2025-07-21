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
        <label htmlFor="description-input" className="description-label">
          📝 Description (Optional)
        </label>
        <span className="char-counter">
          {charCount}/{maxLength}
        </span>
      </div>

      <div className="description-input-wrapper">
        <textarea
          id="description-input"
          value={description}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Describe the object to improve AI analysis (e.g., 'red ceramic mug', 'wooden chair')..."
          className={`description-textarea ${disabled ? 'disabled' : ''}`}
          rows={3}
        />

        {description && !disabled && (
          <button
            onClick={handleClear}
            className="clear-button"
            type="button"
            title="Clear description"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default DescriptionInput
