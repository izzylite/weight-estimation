import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Load GLB file and return the 3D model
 * @param {Blob} glbBlob - The GLB file as a blob
 * @returns {Promise<THREE.Group>} The loaded 3D model
 */
export const loadGLBModel = (glbBlob) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    
    // Convert blob to array buffer
    const reader = new FileReader()
    reader.onload = (event) => {
      const arrayBuffer = event.target.result
      
      loader.parse(arrayBuffer, '', (gltf) => {
        resolve(gltf.scene)
      }, (error) => {
        reject(new Error(`Failed to load GLB model: ${error.message}`))
      })
    }
    reader.onerror = () => reject(new Error('Failed to read GLB file'))
    reader.readAsArrayBuffer(glbBlob)
  })
}

/**
 * Calculate the volume of a triangle using the cross product method
 * @param {THREE.Vector3} v0 - First vertex
 * @param {THREE.Vector3} v1 - Second vertex  
 * @param {THREE.Vector3} v2 - Third vertex
 * @returns {number} Volume contribution of the triangle
 */
const calculateTriangleVolume = (v0, v1, v2) => {
  // Calculate volume using the divergence theorem
  // Volume = (1/6) * |v0 · (v1 × v2)|
  const cross = new THREE.Vector3()
  cross.crossVectors(v1, v2)
  return Math.abs(v0.dot(cross)) / 6
}

/**
 * Calculate volume of a mesh using the divergence theorem
 * @param {THREE.Mesh} mesh - The mesh to calculate volume for
 * @returns {number} Volume in cubic units
 */
const calculateMeshVolume = (mesh) => {
  const geometry = mesh.geometry
  
  if (!geometry.isBufferGeometry) {
    throw new Error('Geometry must be BufferGeometry')
  }

  const positions = geometry.attributes.position
  if (!positions) {
    throw new Error('Geometry must have position attribute')
  }

  let volume = 0
  const v0 = new THREE.Vector3()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()

  // Apply mesh transformations
  const matrix = mesh.matrixWorld
  
  if (geometry.index) {
    // Indexed geometry
    const indices = geometry.index.array
    for (let i = 0; i < indices.length; i += 3) {
      v0.fromBufferAttribute(positions, indices[i]).applyMatrix4(matrix)
      v1.fromBufferAttribute(positions, indices[i + 1]).applyMatrix4(matrix)
      v2.fromBufferAttribute(positions, indices[i + 2]).applyMatrix4(matrix)
      
      volume += calculateTriangleVolume(v0, v1, v2)
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.count; i += 3) {
      v0.fromBufferAttribute(positions, i).applyMatrix4(matrix)
      v1.fromBufferAttribute(positions, i + 1).applyMatrix4(matrix)
      v2.fromBufferAttribute(positions, i + 2).applyMatrix4(matrix)
      
      volume += calculateTriangleVolume(v0, v1, v2)
    }
  }

  return Math.abs(volume)
}

/**
 * Calculate the total volume of a 3D model
 * @param {THREE.Group|THREE.Mesh} model - The 3D model
 * @returns {number} Total volume in cubic units
 */
export const calculateModelVolume = (model) => {
  let totalVolume = 0
  
  // Update world matrices
  model.updateMatrixWorld(true)
  
  model.traverse((child) => {
    if (child.isMesh && child.geometry) {
      try {
        const meshVolume = calculateMeshVolume(child)
        totalVolume += meshVolume
      } catch (error) {
        // Skip meshes that can't be processed
      }
    }
  })
  
  return totalVolume
}

/**
 * Get bounding box dimensions of the model
 * @param {THREE.Group|THREE.Mesh} model - The 3D model
 * @returns {Object} Bounding box information
 */
export const getModelDimensions = (model) => {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  
  return {
    width: size.x,
    height: size.y,
    depth: size.z,
    center: center,
    min: box.min,
    max: box.max,
    volume: size.x * size.y * size.z // Bounding box volume
  }
}

/**
 * Calculate volume and provide detailed analysis
 * @param {Blob} glbBlob - The GLB file as a blob
 * @returns {Promise<Object>} Volume analysis results
 */
export const analyzeModelVolume = async (glbBlob) => {
  try {
    const model = await loadGLBModel(glbBlob)
    const volume = calculateModelVolume(model)
    const dimensions = getModelDimensions(model)
    
    // Count meshes and vertices
    let meshCount = 0
    let totalVertices = 0
    let totalFaces = 0
    
    model.traverse((child) => {
      if (child.isMesh && child.geometry) {
        meshCount++
        totalVertices += child.geometry.attributes.position.count
        
        if (child.geometry.index) {
          totalFaces += child.geometry.index.count / 3
        } else {
          totalFaces += child.geometry.attributes.position.count / 3
        }
      }
    })
    
    const result = {
      volume: volume,
      dimensions: dimensions,
      meshCount: meshCount,
      totalVertices: totalVertices,
      totalFaces: Math.floor(totalFaces),
      model: model // Include the loaded model for display
    }

    return result
    
  } catch (error) {
    throw new Error(`Volume analysis failed: ${error.message}`)
  }
}

/**
 * Format volume for display with appropriate units
 * @param {number} volume - Volume in cubic units
 * @param {string} unit - Base unit (e.g., 'mm', 'cm', 'm')
 * @returns {string} Formatted volume string
 */
export const formatVolume = (volume, unit = 'units') => {
  if (volume === 0) return `0 ${unit}³`
  
  const absVolume = Math.abs(volume)
  
  if (absVolume < 0.001) {
    return `${(volume * 1000000).toFixed(3)} m${unit}³`
  } else if (absVolume < 1) {
    return `${(volume * 1000).toFixed(3)} c${unit}³`
  } else if (absVolume < 1000) {
    return `${volume.toFixed(3)} ${unit}³`
  } else if (absVolume < 1000000) {
    return `${(volume / 1000).toFixed(3)} k${unit}³`
  } else {
    return `${(volume / 1000000).toFixed(3)} M${unit}³`
  }
}
