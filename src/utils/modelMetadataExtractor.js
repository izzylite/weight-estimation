import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

/**
 * Extract detailed metadata from a 3D model for enhanced weight estimation
 * @param {Blob} modelBlob - The 3D model file as a blob
 * @returns {Promise<Object>} Metadata object with geometric properties
 */
export const extractModelMetadata = async (modelBlob) => {
  const startTime = Date.now()
  const sessionId = Math.random().toString(36).substring(2, 11)
  
  console.log(`📐 [${sessionId}] Starting 3D model metadata extraction...`)
  
  try {
    // Create object URL for the blob
    const modelURL = URL.createObjectURL(modelBlob)
    
    // Load the model using GLTFLoader
    const loader = new GLTFLoader()
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        modelURL,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      )
    })
    
    console.log(`✅ [${sessionId}] Model loaded successfully`)
    
    // Clean up object URL
    URL.revokeObjectURL(modelURL)
    
    // Extract geometry data from all meshes
    let totalVertices = 0
    let totalFaces = 0
    let totalSurfaceArea = 0
    const boundingBox = new THREE.Box3()
    const geometries = []
    
    // Traverse the scene to find all meshes
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geometry = child.geometry
        geometries.push(geometry)
        
        // Count vertices and faces
        const vertices = geometry.attributes.position ? geometry.attributes.position.count : 0
        totalVertices += vertices
        
        if (geometry.index) {
          totalFaces += geometry.index.count / 3
        } else {
          totalFaces += vertices / 3
        }
        
        // Calculate surface area for this geometry
        const surfaceArea = calculateSurfaceArea(geometry)
        totalSurfaceArea += surfaceArea
        
        // Expand bounding box
        geometry.computeBoundingBox()
        if (geometry.boundingBox) {
          boundingBox.union(geometry.boundingBox)
        }
      }
    })
    
    // Calculate bounding box dimensions
    const size = new THREE.Vector3()
    boundingBox.getSize(size)
    
    // Determine mesh complexity
    const complexity = classifyMeshComplexity(totalVertices, totalFaces)
    
    // Calculate additional metrics
    const volume = size.x * size.y * size.z // Bounding box volume (approximation)
    const volumeToSurfaceRatio = totalSurfaceArea > 0 ? volume / totalSurfaceArea : 0
    
    const metadata = {
      vertices: totalVertices,
      faces: Math.round(totalFaces),
      boundingBox: {
        x: size.x,
        y: size.y,
        z: size.z
      },
      surfaceArea: totalSurfaceArea,
      complexity: complexity,
      volumeToSurfaceRatio: volumeToSurfaceRatio,
      meshCount: geometries.length,
      processingTime: ((Date.now() - startTime) / 1000).toFixed(2)
    }
    
    console.log(`📊 [${sessionId}] Metadata extracted:`, {
      vertices: metadata.vertices,
      faces: metadata.faces,
      boundingBox: `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`,
      surfaceArea: metadata.surfaceArea.toFixed(6),
      complexity: metadata.complexity,
      processingTime: metadata.processingTime + 's'
    })
    
    return metadata
    
  } catch (error) {
    console.error(`❌ [${sessionId}] Failed to extract model metadata:`, error)
    
    // Return basic metadata with error info
    return {
      vertices: 'unknown',
      faces: 'unknown',
      boundingBox: null,
      surfaceArea: 0,
      complexity: 'unknown',
      volumeToSurfaceRatio: 0,
      meshCount: 0,
      processingTime: ((Date.now() - startTime) / 1000).toFixed(2),
      error: error.message
    }
  }
}

/**
 * Calculate surface area of a geometry
 * @param {THREE.BufferGeometry} geometry - The geometry to analyze
 * @returns {number} Surface area in square units
 */
function calculateSurfaceArea(geometry) {
  if (!geometry.attributes.position) {
    return 0
  }
  
  const positions = geometry.attributes.position.array
  let surfaceArea = 0
  
  if (geometry.index) {
    // Indexed geometry
    const indices = geometry.index.array
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3
      const b = indices[i + 1] * 3
      const c = indices[i + 2] * 3
      
      const area = calculateTriangleArea(
        positions[a], positions[a + 1], positions[a + 2],
        positions[b], positions[b + 1], positions[b + 2],
        positions[c], positions[c + 1], positions[c + 2]
      )
      surfaceArea += area
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.length; i += 9) {
      const area = calculateTriangleArea(
        positions[i], positions[i + 1], positions[i + 2],
        positions[i + 3], positions[i + 4], positions[i + 5],
        positions[i + 6], positions[i + 7], positions[i + 8]
      )
      surfaceArea += area
    }
  }
  
  return surfaceArea
}

/**
 * Calculate area of a triangle given three vertices
 * @param {number} x1, y1, z1 - First vertex coordinates
 * @param {number} x2, y2, z2 - Second vertex coordinates  
 * @param {number} x3, y3, z3 - Third vertex coordinates
 * @returns {number} Triangle area
 */
function calculateTriangleArea(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
  // Using cross product to calculate area
  const v1x = x2 - x1, v1y = y2 - y1, v1z = z2 - z1
  const v2x = x3 - x1, v2y = y3 - y1, v2z = z3 - z1
  
  const crossX = v1y * v2z - v1z * v2y
  const crossY = v1z * v2x - v1x * v2z
  const crossZ = v1x * v2y - v1y * v2x
  
  const magnitude = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
  return magnitude * 0.5
}

/**
 * Classify mesh complexity based on vertex and face count
 * @param {number} vertices - Number of vertices
 * @param {number} faces - Number of faces
 * @returns {string} Complexity classification
 */
function classifyMeshComplexity(vertices, faces) {
  if (vertices < 1000 && faces < 500) {
    return 'low (simple geometry)'
  } else if (vertices < 10000 && faces < 5000) {
    return 'medium (moderate detail)'
  } else if (vertices < 50000 && faces < 25000) {
    return 'high (detailed geometry)'
  } else {
    return 'very high (complex/dense mesh)'
  }
}
