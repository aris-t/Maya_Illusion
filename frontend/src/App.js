import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DetroitOverlay from './components/DetroitOverlay';
import CommandDashboard from './components/CommandDashboard';
import AIController from './components/AIController';

function App() {
  // Import the image from the public folder
  const backgroundImage = process.env.PUBLIC_URL + '/image.png';

  return (
    <Router>
      <div className="App">
        <div className="video-container relative">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="w-full h-screen object-cover"
          />
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
                  <AIController useMockData={true} />
                </>
              } 
            />
            <Route 
              path="/command" 
              element={
                <>
                  <CommandDashboard />
                  <AIController useMockData={true} />
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