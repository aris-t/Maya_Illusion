import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Info, ZapOff, AlertTriangle, Clock, Users } from 'lucide-react';

const DetroitOverlay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState({
    connection: 'STABLE',
    processingPower: 87,
    memoryLoad: 42,
    simulationModule: 'ACTIVE'
  });
  
  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time in Detroit style - 24hr with milliseconds
  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-10 font-mono text-blue-100 overflow-hidden pointer-events-none">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-blue-200" style={{ top: `${i * 5}%` }} />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`v-${i}`} className="absolute top-0 bottom-0 border-l border-blue-200" style={{ left: `${i * 5}%` }} />
        ))}
      </div>
      
      {/* Top header bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 border-b border-blue-400/30">
        <div className="flex items-center">
          <div className="w-6 h-6 border-2 border-blue-400 mr-2 relative">
            <div className="absolute inset-0 bg-blue-400/20"></div>
            <div className="absolute top-0 left-0 w-2 h-2 bg-blue-400"></div>
          </div>
          <span className="text-sm font-bold tracking-widest">CYBERLIFE</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="relative flex items-center">
            <Clock className="h-4 w-4 mr-2 text-blue-300" />
            <span className="text-sm tracking-wider">{formatTime(currentTime)}</span>
          </div>
          <div className="relative flex items-center">
            <Users className="h-4 w-4 mr-2 text-blue-300" />
            <span className="text-sm tracking-wider">OBSERVERS: 02</span>
          </div>
        </div>
      </div>
      
      {/* Left sidebar */}
      <div className="absolute top-16 left-0 bottom-0 w-64 border-r border-blue-400/30 p-4">
        <div className="text-xs tracking-widest mb-6 opacity-80">SYSTEM DIAGNOSTICS</div>
        
        <div className="space-y-4">
          {Object.entries(systemStatus).map(([key, value], index) => (
            <div key={key} className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs tracking-wider opacity-70">
                  {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </span>
                <span className="text-xs font-bold">{typeof value === 'number' ? `${value}%` : value}</span>
              </div>
              {typeof value === 'number' && (
                <div className="h-1 w-full bg-blue-900/40 overflow-hidden">
                  <div 
                    className="h-full bg-blue-400"
                    style={{ width: `${value}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="border border-yellow-400/50 bg-yellow-500/10 p-3 flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-200">
              <div className="font-bold mb-1">NOTICE</div>
              <div>Emotional deviation detected in processing module. Recommend diagnostics.</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area - for video */}
      <div className="absolute top-16 left-64 right-64 bottom-0">
        {/* Video is behind this div */}
      </div>
      
      {/* Right sidebar */}
      <div className="absolute top-16 right-0 bottom-0 w-64 border-l border-blue-400/30 p-4">
        <div className="text-xs tracking-widest mb-6 opacity-80">DATA ANALYSIS</div>
        
        <div className="space-y-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="border border-blue-400/30 p-3 bg-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wider">DATA POINT #{item}</span>
                <ChevronDown className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-xs opacity-70">Status: Processing</div>
              <div className="mt-2 h-1 w-full bg-blue-900/40 overflow-hidden">
                <div 
                  className="h-full bg-blue-400"
                  style={{ width: `${Math.random() * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <button className="w-full border border-blue-400 py-2 flex items-center justify-center text-sm tracking-wider text-blue-200 bg-blue-900/20 hover:bg-blue-900/40 transition-colors pointer-events-auto">
            <Info className="h-4 w-4 mr-2" />
            ACCESS FULL REPORT
          </button>
        </div>
      </div>
      
      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 py-2 border-t border-blue-400/30 bg-gray-900/60 text-xs">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
          <span>MODEL RK800 // SERIAL #313-248-317</span>
        </div>
        
        <div className="flex space-x-6">
          <div className="flex items-center text-green-400">
            <div className="w-1 h-1 rounded-full bg-green-400 mr-1 animate-pulse"></div>
            SYSTEM OPERATIONAL
          </div>
          <div>SOFTWARE VERSION 43.5.9</div>
        </div>
      </div>
      
      {/* Floating UI elements */}
      <div className="absolute top-1/4 right-1/4 bg-transparent border border-blue-400/50 p-3 backdrop-blur-sm">
        <div className="text-xs tracking-wider mb-1 text-blue-300">TARGET ANALYSIS</div>
        <div className="w-32 h-32 border border-dashed border-blue-400/30 flex items-center justify-center">
          <div className="text-center opacity-60 text-xs">NO TARGET</div>
        </div>
      </div>
      
      {/* Scanning line effect */}
      <div className="scan-line"></div>
      
      {/* Corner triangles - Detroit style */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
    </div>
  );
};

export default DetroitOverlay;
