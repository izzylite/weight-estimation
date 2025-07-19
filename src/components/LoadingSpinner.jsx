import './LoadingSpinner.css'

const LoadingSpinner = ({ message = 'Loading...', size = 'large' }) => {
  return (
    <div className={`loading-container ${size}`}>
      <div className="loading-content">
        <div className="spinner-wrapper">
          <div className="spinner"></div>
          <div className="spinner-inner"></div>
        </div>
        <div className="loading-message">
          <h3>{message}</h3>
          <p>This may take a few minutes depending on image complexity...</p>
        </div>
        <div className="loading-tips">
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <span>Generating high-quality 3D model</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎨</span>
            <span>Applying realistic textures</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📐</span>
            <span>Calculating precise volume</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
