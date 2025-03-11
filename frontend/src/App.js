import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import DetroitOverlay from './components/DetroitOverlay';
import CommandDashboard from './components/CommandDashboard';
import AIController from './components/AIController';

function App() {
  // Toggle between mock data and WebSocket
  const [useMockData, setUseMockData] = useState(true);
  
  return (
    <Router>
      <div className="App">
        <div className="video-container relative">
          {/* The div below is our transparent container, no background image anymore */}
          <div className="w-full h-screen bg-transparent"></div>
          
          <Routes>
            <Route 
              path="/" 
              element={
                <>
                  <DetroitOverlay />
                  {/* Center small white plus sign */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white text-2xl font-thin">+</div>
                  </div>
                  
                  {/* Data source toggle button */}
                  <div className="absolute bottom-8 left-8 z-40">
                    <button 
                      onClick={() => setUseMockData(!useMockData)}
                      className="bg-gray-900/80 border border-blue-400/50 px-3 py-2 text-blue-100 font-mono text-xs"
                    >
                      {useMockData ? 'USING MOCK DATA' : 'USING WEBSOCKET'}
                    </button>
                  </div>
                  
                  <AIController useMockData={useMockData} />
                </>
              } 
            />
            <Route 
              path="/command" 
              element={
                <>
                  <CommandDashboard />
                </>
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
