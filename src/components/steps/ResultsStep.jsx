import React from 'react'
import WeightEstimationResult from '../WeightEstimationResult'
import './ResultsStep.css'

const ResultsStep = ({ 
  weightResult,
  analysisResult,
  originalImage,
  onDownload,
  onStartOver
}) => {
  return (
    <div className="results-step">
      <WeightEstimationResult
        weightResult={weightResult}
        analysisResult={analysisResult}
        originalImage={originalImage}
        onDownload={onDownload}
        onStartOver={onStartOver}
      />
    </div>
  )
}

export default ResultsStep
