import React, { useState, useEffect } from 'react';
import DetroitOverlay from './components/DetroitOverlay';

function App() {
  const [videoStream, setVideoStream] = useState(null);

  useEffect(() => {
    // Set up WebSocket connection to receive video stream
    const connectToVideoStream = () => {
      try {
        // The video server will be running on port 8080
        const streamUrl = 'http://localhost:8080/video_feed';
        setVideoStream(streamUrl);
        console.log('Connected to video stream');
      } catch (error) {
        console.error('Error connecting to video stream:', error);
        // Try to reconnect after 2 seconds
        setTimeout(connectToVideoStream, 2000);
      }
    };

    connectToVideoStream();
  }, []);

  return (
    <div className="App">
      <div className="video-container relative">
        {videoStream && (
          <img 
            src={videoStream} 
            alt="Video Feed" 
            className="w-full h-screen object-cover"
          />
        )}
        <DetroitOverlay />
      </div>
    </div>
  );
}

export default App;
