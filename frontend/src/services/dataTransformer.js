// src/services/dataTransformer.js

/**
 * Transforms the raw WebSocket detection data to the format expected by
 * the AIPolygonOverlay component
 * 
 * Raw format (from WebSocket):
 * {
 *   frame_number: 123,
 *   objects: [
 *     {
 *       object_id: 1,
 *       class_id: 0,
 *       label: "person",
 *       confidence: 0.95,
 *       polygon: [
 *         { x: 0.1, y: 0.2 }, // coordinates are normalized (0-1)
 *         { x: 0.3, y: 0.2 },
 *         { x: 0.3, y: 0.4 },
 *         { x: 0.1, y: 0.4 }
 *       ]
 *     }
 *   ]
 * }
 * 
 * Target format (for AIPolygonOverlay):
 * [
 *   {
 *     id: '1',
 *     label: 'Face',
 *     confidence: 0.92,
 *     color: '#00FF88',
 *     points: [
 *       { x: 120, y: 80 }, // coordinates are in pixels
 *       { x: 180, y: 80 },
 *       { x: 180, y: 150 },
 *       { x: 120, y: 150 }
 *     ],
 *     metadata: {
 *       type: 'Person',
 *       id: 1
 *     }
 *   }
 * ]
 */

export const transformDetectionData = (rawData) => {
  if (!rawData || !rawData.objects || !Array.isArray(rawData.objects)) {
    return [];
  }
  
  // Get viewport dimensions for converting normalized coordinates to pixels
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // Map class IDs to colors and labels
  const classMapping = {
    0: { color: '#00FF88', type: 'Person' },  // Person - Green
    1: { color: '#4488FF', type: 'Face' },    // Face - Blue
    2: { color: '#FF8800', type: 'Hand' },    // Hand - Orange
    3: { color: '#FF5500', type: 'Object' },  // Generic object - Red
    // Add more mappings as needed
    default: { color: '#FFFFFF', type: 'Unknown' }
  };
  
  // Transform each object
  return rawData.objects.map(obj => {
    // Get class mapping or default
    const mapping = classMapping[obj.class_id] || classMapping.default;
    
    // Determine the label
    let label = obj.label || mapping.type;
    
    // Convert normalized polygon coordinates to pixel coordinates
    const points = obj.polygon.map(point => ({
      x: Math.round(point.x * viewport.width),
      y: Math.round(point.y * viewport.height)
    }));
    
    // Construct metadata from relevant fields
    const metadata = {
      id: obj.object_id,
      type: mapping.type,
      class: obj.class_id
    };
    
    // Add frame number if available
    if (rawData.frame_number !== undefined) {
      metadata.frame = rawData.frame_number;
    }
    
    return {
      id: obj.object_id.toString(),
      label,
      confidence: obj.confidence,
      color: mapping.color,
      points,
      metadata
    };
  });
};

/**
 * Converts pixel coordinates back to normalized coordinates (0-1)
 * This is useful if you need to send data back to the server
 */
export const pixelToNormalizedCoords = (points) => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  return points.map(point => ({
    x: point.x / viewport.width,
    y: point.y / viewport.height
  }));
};