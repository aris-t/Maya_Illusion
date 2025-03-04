import React, { useState, useEffect, useRef } from 'react';

// This component handles drawing multiple AI-identified polygons that can move and change shape
const AnimatedAIPolygonOverlay = ({ polygonData = [], animationSpeed = 1 }) => {
  const [activePolygon, setActivePolygon] = useState(null);
  const [currentPolygons, setCurrentPolygons] = useState([]);
  const animationRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Use confidence for alpha transparency
  const getPolygonStyle = (polygon) => {
    // Default to white if no color is provided
    const baseColor = polygon.color || '#FFFFFF';
    
    // Use confidence for alpha (0.2 to 0.8 range)
    const alpha = 0.2 + (polygon.confidence * 0.6);
    
    // Extract RGB components from hex color
    let r, g, b;
    
    if (baseColor.startsWith('#')) {
      const hex = baseColor.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (baseColor.startsWith('rgb')) {
      // Handle RGB format
      const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (match) {
        [, r, g, b] = match.map(Number);
      } else {
        // Fallback to white
        r = 255;
        g = 255;
        b = 255;
      }
    } else {
      // Fallback to white
      r = 255;
      g = 255;
      b = 255;
    }
    
    return {
      fill: `rgba(${r}, ${g}, ${b}, ${alpha})`,
      stroke: `rgba(${r}, ${g}, ${b}, 0.8)`
    };
  };

  // Interpolate between two sets of points
  const interpolatePoints = (startPoints, endPoints, progress) => {
    // If the arrays have different lengths, we need to handle that
    // For simplicity, we'll use the smaller length
    const length = Math.min(startPoints.length, endPoints.length);
    
    return Array(length).fill().map((_, i) => ({
      x: startPoints[i].x + (endPoints[i].x - startPoints[i].x) * progress,
      y: startPoints[i].y + (endPoints[i].y - startPoints[i].y) * progress
    }));
  };
  
  // Function to add "random" movement to polygons
  const addRandomMovement = (polygon) => {
    // Create a slightly modified version of the polygon points
    const newPoints = polygon.points.map(point => ({
      x: point.x + (Math.random() * 10 - 5), // Move by -5 to +5 pixels
      y: point.y + (Math.random() * 10 - 5)
    }));
    
    return {
      ...polygon,
      targetPoints: newPoints,
      animationProgress: 0,
      animationDuration: 500 + Math.random() * 1000 // 0.5-1.5 seconds
    };
  };
  
  // Initialize polygons with animation properties when polygonData changes
  useEffect(() => {
    if (polygonData.length > 0) {
      setCurrentPolygons(polygonData.map(polygon => ({
        ...polygon,
        // Store original points as both current and target initially
        originalPoints: [...polygon.points],
        targetPoints: [...polygon.points],
        animationProgress: 0,
        animationDuration: 1000 // Default 1 second for animation
      })));
    }
  }, [polygonData]);
  
  // Animation loop
  useEffect(() => {
    // Skip if no polygons
    if (currentPolygons.length === 0) return;
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;
      
      // Update each polygon's animation progress
      setCurrentPolygons(prevPolygons => 
        prevPolygons.map(polygon => {
          // Calculate new progress
          let newProgress = polygon.animationProgress + 
            (deltaTime / polygon.animationDuration) * animationSpeed;
          
          // If animation is complete
          if (newProgress >= 1) {
            // Animation complete - set a new target
            return addRandomMovement({
              ...polygon,
              points: polygon.targetPoints, // Current position becomes the starting position
              animationProgress: 0
            });
          }
          
          // Animation in progress - interpolate points
          return {
            ...polygon,
            animationProgress: newProgress,
            // Current displayed points are interpolated between original and target
            currentPoints: interpolatePoints(
              polygon.points, 
              polygon.targetPoints, 
              newProgress
            )
          };
        })
      );
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentPolygons, animationSpeed]);
  
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Render each polygon */}
      {currentPolygons.map((polygon, index) => {
        // Use currentPoints if available, otherwise fall back to original points
        const displayPoints = polygon.currentPoints || polygon.points;
        const style = getPolygonStyle(polygon);
        
        return (
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
                points={displayPoints.map(point => `${point.x},${point.y}`).join(' ')}
                fill={style.fill}
                stroke={activePolygon === index ? style.stroke : `${style.stroke.replace(/[\d.]+\)$/, '0.5)')}` }
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
                    Math.min(...displayPoints.map(p => p.x)) + 10,
                    10
                  ),
                  top: Math.max(
                    Math.min(...displayPoints.map(p => p.y)) - 50,
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
                <div className="flex items-center justify-between mt-1">
                  <span className="opacity-70">TRACKING:</span>
                  <span className="text-blue-300">ACTIVE</span>
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
        );
      })}
    </div>
  );
};

export default AnimatedAIPolygonOverlay;