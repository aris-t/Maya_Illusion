import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, Terminal, Shield, 
  Zap, AlertTriangle, Database, Network, Monitor, 
  Settings, RefreshCw, Power, Lock, Eye
} from 'lucide-react';

const CommandDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemMetrics, setSystemMetrics] = useState({
    networkStatus: 'CONNECTED',
    activeAgents: 4,
  });
  
  // Mock command history
  const [commandHistory, setCommandHistory] = useState([
    { id: 1, time: '10:24:13.05', command: 'THING 1', status: 'COMPLETED' },
    { id: 2, time: '10:30:47.23', command: 'THING 2', status: 'IN PROGRESS' },
    { id: 3, time: '10:32:18.97', command: 'THING 3', status: 'PENDING' },
  ]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-10 font-mono text-blue-100 overflow-hidden">
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
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 border-b border-blue-400/30 bg-gray-900/60">
        <div className="flex items-center">
          <div className="w-6 h-6 border-2 border-blue-400 mr-2 relative">
            <div className="absolute inset-0 bg-blue-400/20"></div>
            <div className="absolute top-0 left-0 w-2 h-2 bg-blue-400"></div>
          </div>
          <span className="text-sm font-bold tracking-widest">COMMAND CENTER</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="relative flex items-center">
            <span className="text-sm tracking-wider">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
      
      {/* Command terminal */}
      <div className="absolute top-16 left-0 w-1/2 h-1/2 border-r border-b border-blue-400/30 p-4 bg-gray-900/60">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-widest opacity-80 flex items-center">
            <Terminal className="h-4 w-4 mr-2" />
            LOG
          </div>
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <div className="text-xs">ONLINE</div>
          </div>
        </div>
        
        <div className="border border-blue-400/30 bg-gray-900/80 h-4/5 p-3 overflow-y-auto">
          <div className="space-y-2">
            {commandHistory.map(cmd => (
              <div key={cmd.id} className="text-xs">
                <span className="text-gray-400">[{cmd.time}]</span> 
                <span className="text-blue-300 ml-2">{cmd.command}</span>
                <span className={`ml-2 px-1 text-xs ${
                  cmd.status === 'COMPLETED' ? 'text-green-400' : 
                  cmd.status === 'IN PROGRESS' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {cmd.status}
                </span>
              </div>
            ))}
            <div className="flex items-center mt-4 text-xs">
              <span className="text-gray-400">[{formatTime(currentTime)}]</span>
              <span className="ml-2 text-blue-300">_</span>
              <span className="ml-1 w-2 h-4 bg-blue-400 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security metrics */}
      <div className="absolute top-16 right-0 w-1/2 h-1/2 border-l border-b border-blue-400/30 p-4 bg-gray-900/60">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-widest opacity-80 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            DASHBOARD
          </div>
          <div className="flex items-center text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>AUTO-REFRESH</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(systemMetrics).map(([key, value]) => (
            <div key={key} className="border border-blue-400/30 p-3 bg-gray-900/60">
              <div className="text-xs uppercase tracking-wider mb-2">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-lg font-medium ${
                  key === 'threatLevel' && value === 'MODERATE' ? 'text-yellow-400' :
                  key === 'securityLevel' && value === 'CRITICAL' ? 'text-red-400' : 
                  'text-blue-300'
                }`}>
                  {value}
                </span>
                {typeof value === 'number' && (
                  <div className="w-1/2 h-1 bg-blue-900/40 overflow-hidden">
                    <div 
                      className={`h-full ${
                        value > 80 ? 'bg-green-400' : 
                        value > 50 ? 'bg-blue-400' : 
                        value > 30 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Maps & surveillance */}
      <div className="absolute bottom-0 left-0 right-0 top-1/2 border-t border-blue-400/30 p-4 bg-gray-900/60">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs tracking-widest opacity-80 flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            MAPPING
          </div>
          <div className="flex space-x-4">
            <button className="text-xs border border-blue-400/50 px-2 py-1 bg-gray-900/40">GRID VIEW</button>
            <button className="text-xs border border-blue-400/50 px-2 py-1 bg-blue-900/20">MAP VIEW</button>
          </div>
        </div>
        
        <div className="flex h-4/5">
          <div className="w-2/3 border border-blue-400/30 bg-gray-900/80 relative">
            {/* Map mock */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl text-blue-400/30">MAP DISPLAY</div>
                <div className="text-xs text-blue-300 mt-2">Filler</div>
              </div>
            </div>
            
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
          </div>
          
          <div className="w-1/3 pl-4 space-y-4">
            <div className="border border-blue-400/30 p-3 bg-gray-900/60 h-1/2">
              <div className="text-xs tracking-wider mb-2">UNIT STATUS</div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(unit => (
                  <div key={unit} className="flex items-center justify-between text-xs">
                    <div>UNIT #{unit.toString().padStart(2, '0')}</div>
                    <div className={`px-2 py-0.5 ${
                      unit === 1 ? 'bg-green-400/20 text-green-300' : 
                      unit === 2 ? 'bg-blue-400/20 text-blue-300' : 
                      unit === 3 ? 'bg-yellow-400/20 text-yellow-300' : 
                      'bg-gray-400/20 text-gray-300'
                    }`}>
                      {unit === 1 ? 'DEPLOYED' : 
                       unit === 2 ? 'EN ROUTE' : 
                       unit === 3 ? 'STANDBY' : 
                       'OFFLINE'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border border-blue-400/30 p-3 bg-gray-900/60 h-1/3">
              <div className="text-xs tracking-wider mb-2">ALERTS</div>
              <div className="border border-yellow-400/50 bg-yellow-500/10 p-2 flex items-start">
                <AlertTriangle className="h-3 w-3 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-200">
                  Filler Text
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 py-2 border-t border-blue-400/30 bg-gray-900/60 text-xs">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
          <span>ADMIN CONSOLE</span>
        </div>
        
        <div className="flex space-x-6">
          <div className="flex items-center text-green-400">
            <div className="w-1 h-1 rounded-full bg-green-400 mr-1 animate-pulse"></div>
            CONNECTED
          </div>
          <div>BUILD 0.0.1-ALPHA</div>
        </div>
      </div>
      
    </div>
  );
};

export default CommandDashboard;
