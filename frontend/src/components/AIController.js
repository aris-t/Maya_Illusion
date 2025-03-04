import React, { useState, useEffect } from 'react';
import AnimatedAIPolygonOverlay from './AnimatedAIPolygonOverlay';
import { fetchPolygonData, getMockPolygonData } from '../services/aiPolygonService';

// This component manages AI-related overlays and controls
const AIController = ({ useMockData = true }) => {
  const [polygonData, setPolygonData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    face: true,
    hand: true,
    object: true,
    lowConfidence: true
  });
  const [animationSpeed, setAnimationSpeed] = useState(1);
  
  // Fetch data from backend (or use mock data)
  useEffect(() => {
    const getPolygonData = async () => {
      try {
        setIsLoading(true);
        let data;
        
        if (useMockData) {
          // Use mock data for development/testing
          data = getMockPolygonData();
          // Add artificial delay to simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Get real data from backend
          data = await fetchPolygonData();
        }
        
        setPolygonData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load polygon data:', err);
        setError('Failed to load AI analysis data');
        setPolygonData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPolygonData();
    
    // For actual backend, you'd set up polling here
    // For demonstration, we'll just load once
    return () => {};
  }, [useMockData]);
  
  // Filter the polygon data based on active filters
  const filteredPolygons = polygonData.filter(polygon => {
    // Filter by label type
    if (polygon.label.toLowerCase() === 'face' && !activeFilters.face) return false;
    if (polygon.label.toLowerCase() === 'hand' && !activeFilters.hand) return false;
    if (polygon.label.toLowerCase() === 'object' && !activeFilters.object) return false;
    
    // Filter by confidence
    if (polygon.confidence < 0.5 && !activeFilters.lowConfidence) return false;
    
    return true;
  });
  
  // Toggle filters
  const toggleFilter = (filter) => {
    setActiveFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };
  
  return (
    <>
      {/* Main AI polygon overlay with animation */}
      <AnimatedAIPolygonOverlay 
        polygonData={filteredPolygons}
        animationSpeed={animationSpeed} 
      />
      
      {/* Controls panel */}
      <div className="absolute top-20 right-8 z-30 bg-gray-900/80 border border-blue-400/50 p-3 text-blue-100 font-mono text-xs w-48">
        <div className="tracking-widest mb-3 flex items-center justify-between">
          <span>AI ANALYSIS</span>
          {isLoading && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>}
        </div>
        
        {error ? (
          <div className="text-red-400 mb-2">{error}</div>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-xs tracking-wider opacity-70 mb-1">FILTER BY TYPE</div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <button 
                    className={`w-4 h-4 border ${activeFilters.face ? 'bg-blue-400/50 border-blue-400' : 'bg-transparent border-gray-400'} mr-2`}
                    onClick={() => toggleFilter('face')}
                  ></button>
                  <span>Face Detection</span>
                </div>
                <div className="flex items-center">
                  <button 
                    className={`w-4 h-4 border ${activeFilters.hand ? 'bg-blue-400/50 border-blue-400' : 'bg-transparent border-gray-400'} mr-2`}
                    onClick={() => toggleFilter('hand')}
                  ></button>
                  <span>Hand Tracking</span>
                </div>
                <div className="flex items-center">
                  <button 
                    className={`w-4 h-4 border ${activeFilters.object ? 'bg-blue-400/50 border-blue-400' : 'bg-transparent border-gray-400'} mr-2`}
                    onClick={() => toggleFilter('object')}
                  ></button>
                  <span>Object Detection</span>
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs tracking-wider opacity-70 mb-1">FILTER BY CONFIDENCE</div>
              <div className="flex items-center">
                <button 
                  className={`w-4 h-4 border ${activeFilters.lowConfidence ? 'bg-blue-400/50 border-blue-400' : 'bg-transparent border-gray-400'} mr-2`}
                  onClick={() => toggleFilter('lowConfidence')}
                ></button>
                <span>Show Low Confidence</span>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs tracking-wider opacity-70 mb-1">ANIMATION SPEED</div>
              <div className="flex items-center justify-between">
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-400"
                />
                <span className="ml-2">{animationSpeed.toFixed(1)}x</span>
              </div>
            </div>
            
            <div className="text-xs text-center text-blue-300 mt-4">
              {filteredPolygons.length} elements tracked
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AIController;