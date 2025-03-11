import React, { useState, useEffect } from 'react';
import AnimatedAIPolygonOverlay from './AnimatedAIPolygonOverlay';
import wsService from '../services/websocketService';
import { getMockPolygonData } from '../services/aiPolygonService';

// This component manages AI-related overlays and controls
const AIController = ({ useMockData = false }) => {
  const [polygonData, setPolygonData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [activeFilters, setActiveFilters] = useState({
    face: true,
    hand: true,
    object: true,
    person: true,
    lowConfidence: true
  });
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [frameNumber, setFrameNumber] = useState(0);
  
  // Initialize data source - either mock data or WebSocket
  useEffect(() => {
    if (useMockData) {
      // Use mock data for development/testing
      setIsLoading(true);
      
      // Simulate API delay
      const timer = setTimeout(() => {
        const mockData = getMockPolygonData();
        setPolygonData(mockData);
        setIsLoading(false);
        setConnectionStatus('mock');
        setError(null);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Set up WebSocket for real data
      setIsLoading(true);
      
      wsService.setOnMessage((data) => {
        setPolygonData(data);
        setIsLoading(false);
        
        // Update frame number if available in the data
        if (data.length > 0 && data[0].metadata && data[0].metadata.frame !== undefined) {
          setFrameNumber(data[0].metadata.frame);
        }
      });
      
      wsService.setOnConnect(() => {
        setConnectionStatus('connected');
        setError(null);
      });
      
      wsService.setOnDisconnect(() => {
        setConnectionStatus('disconnected');
        setIsLoading(true);
      });
      
      wsService.setOnError((errorMsg) => {
        setError(errorMsg);
      });
      
      // Connect to WebSocket server
      wsService.connect();
      
      // Clean up function
      return () => {
        wsService.disconnect();
      };
    }
  }, [useMockData]);
  
  // Filter the polygon data based on active filters
  const filteredPolygons = polygonData.filter(polygon => {
    const lowerLabel = polygon.label ? polygon.label.toLowerCase() : '';
    
    // Filter by label/type
    if (lowerLabel === 'face' && !activeFilters.face) return false;
    if (lowerLabel === 'hand' && !activeFilters.hand) return false;
    if (lowerLabel === 'object' && !activeFilters.object) return false;
    if (lowerLabel === 'person' && !activeFilters.person) return false;
    
    // Or check metadata type if no direct label match
    if (polygon.metadata && polygon.metadata.type) {
      const lowerType = polygon.metadata.type.toLowerCase();
      if (lowerType === 'face' && !activeFilters.face) return false;
      if (lowerType === 'hand' && !activeFilters.hand) return false;
      if (lowerType === 'object' && !activeFilters.object) return false;
      if (lowerType === 'person' && !activeFilters.person) return false;
    }
    
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
        
        {/* Connection status */}
        <div className="mb-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="opacity-70">STATUS:</span>
            <span className={`
              ${connectionStatus === 'connected' ? 'text-green-400' : 
                connectionStatus === 'mock' ? 'text-yellow-400' : 'text-red-400'}
            `}>
              {connectionStatus === 'connected' ? 'CONNECTED' : 
                connectionStatus === 'mock' ? 'USING MOCK DATA' : 'DISCONNECTED'}
            </span>
          </div>
          {frameNumber > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="opacity-70">FRAME:</span>
              <span>{frameNumber}</span>
            </div>
          )}
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
                    className={`w-4 h-4 border ${activeFilters.person ? 'bg-blue-400/50 border-blue-400' : 'bg-transparent border-gray-400'} mr-2`}
                    onClick={() => toggleFilter('person')}
                  ></button>
                  <span>Person Detection</span>
                </div>
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