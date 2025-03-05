import React from 'react';
import ReactDOM from 'react-dom';

// Super simple React component
const App = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '40px',
      borderRadius: '20px',
      fontSize: '36px',
      fontWeight: 'bold',
      textAlign: 'center',
      border: '5px solid #ff0000'
    }}>
      REACT OVERLAY
      <div style={{
        marginTop: '20px',
        fontSize: '24px'
      }}>
        {new Date().toLocaleTimeString()}
      </div>
    </div>
  </div>
);

// Try to render React component
try {
  ReactDOM.render(<App />, document.getElementById('root'));
  console.log('React successfully rendered');
} catch (error) {
  console.error('React failed to render:', error);
  
  // Create fallback content if React fails
  const fallback = document.createElement('div');
  fallback.style.position = 'fixed';
  fallback.style.top = '50%';
  fallback.style.left = '50%';
  fallback.style.transform = 'translate(-50%, -50%)';
  fallback.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
  fallback.style.color = 'white';
  fallback.style.padding = '30px';
  fallback.style.borderRadius = '10px';
  fallback.style.fontSize = '24px';
  fallback.style.textAlign = 'center';
  fallback.style.zIndex = '99999';
  fallback.textContent = 'FALLBACK: React failed to render';
  
  document.body.appendChild(fallback);
}