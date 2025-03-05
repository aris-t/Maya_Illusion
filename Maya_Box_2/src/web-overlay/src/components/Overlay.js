// src/web-overlay/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/styles.css';

// Super simple React app that renders a big visible element
const App = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999
    }}>
      <div style={{
        backgroundColor: 'purple',
        color: 'white',
        padding: '40px',
        borderRadius: '20px',
        fontSize: '30px',
        boxShadow: '0 0 20px black',
        border: '5px solid yellow'
      }}>
        REACT IS WORKING!
      </div>
    </div>
  );
};

// Directly render without StrictMode or other wrappers
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
} else {
  // If root element doesn't exist, create one and append to body
  console.error('Root element not found, creating one');
  const newRoot = document.createElement('div');
  newRoot.id = 'root-fallback';
  document.body.appendChild(newRoot);
  ReactDOM.createRoot(newRoot).render(<App />);
}

// Log that React initialization completed
console.log('React initialization complete');