import React, { useState, useEffect } from 'react';

// This component handles drawing multiple AI-identified polygons
const AIPolygonOverlay = ({ polygonData = [] }) => {
  // You can fetch data from your backend here
  // For now we'll use the prop passed in
  
  const [activePolygon, setActivePolygon] = useState(null);
  
  // Function to calculate color based on confidence level
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'rgba(0, 255, 128, 0.4)'; // High confidence - green
    if (confidence >= 0.5) return 'rgba(255, 255, 0, 0.4)';  // Medium confidence - yellow
    return 'rgba(255, 0, 0, 0.4)';                          // Low confidence - red
  };
  
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Render each polygon */}
      {polygonData.map((polygon, index) => (
        <div 
          key={index}
          className="absolute pointer-events-auto cursor-pointer"
          style={{
            left: 0,
            top: 0,
            width: '100%',
            height: '100%'
          }}
          onMouseEnter={() => setActivePolygon(index)}
          onMouseLeave={() => setActivePolygon(null)}
        >
          {/* SVG overlay for the polygon */}
          <svg 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <polygon
              points={polygon.points.map(point => `${point.x},${point.y}`).join(' ')}
              fill={getConfidenceColor(polygon.confidence)}
              stroke={activePolygon === index ? "rgba(0, 191, 255, 0.8)" : "rgba(0, 191, 255, 0.5)"}
              strokeWidth={activePolygon === index ? "2" : "1"}
              strokeDasharray={activePolygon === index ? "none" : "5,5"}
            />
          </svg>
          
          {/* Information tooltip - only show when active */}
          {activePolygon === index && (
            <div 
              className="absolute bg-gray-900/80 border border-blue-400/70 text-blue-100 p-2 font-mono text-xs z-30"
              style={{
                left: Math.max(
                  Math.min(...polygon.points.map(p => p.x)) + 10,
                  10
                ),
                top: Math.max(
                  Math.min(...polygon.points.map(p => p.y)) - 50,
                  10
                ),
              }}
            >
              <div className="tracking-wider mb-1">{polygon.label.toUpperCase()}</div>
              <div className="flex items-center justify-between">
                <span>CONFIDENCE:</span>
                <span className={`
                  ${polygon.confidence >= 0.8 ? 'text-green-400' : 
                    polygon.confidence >= 0.5 ? 'text-yellow-400' : 'text-red-400'}
                `}>
                  {Math.round(polygon.confidence * 100)}%
                </span>
              </div>
              {polygon.metadata && Object.entries(polygon.metadata).map(([key, value], i) => (
                <div key={i} className="flex items-center justify-between mt-1">
                  <span className="opacity-70">{key.toUpperCase()}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AIPolygonOverlay;