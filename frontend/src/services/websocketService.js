// src/services/websocketService.js
import { transformDetectionData } from './dataTransformer';

class WebSocketService {
  constructor(url = 'ws://localhost:9001') {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.onMessage = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
  }

  connect() {
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (this.onConnect) this.onConnect();
      };
      
      this.socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          
          // Transform the raw detection data to the format needed by our app
          const transformedData = transformDetectionData(rawData);
          
          if (this.onMessage) this.onMessage(transformedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          if (this.onError) this.onError('Failed to parse detection data');
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        
        if (this.onDisconnect) this.onDisconnect();
        
        // Try to reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          setTimeout(() => {
            this.connect();
          }, this.reconnectInterval);
        } else {
          console.error('Max reconnect attempts reached.');
          if (this.onError) this.onError('Unable to reconnect to detection server.');
        }
      };
      
      this.socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        if (this.onError) this.onError('WebSocket connection error');
      };
      
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      if (this.onError) this.onError('Failed to create WebSocket connection');
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
  
  setOnMessage(callback) {
    this.onMessage = callback;
  }
  
  setOnConnect(callback) {
    this.onConnect = callback;
  }
  
  setOnDisconnect(callback) {
    this.onDisconnect = callback;
  }
  
  setOnError(callback) {
    this.onError = callback;
  }
}

// Create a singleton instance
const wsService = new WebSocketService();

export default wsService;