#!/bin/bash

# Script to download and set up CEF for the video overlay application
echo "Setting up CEF for video overlay application"

# Create directories
mkdir -p cef_libs

# Download CEF
echo "Downloading CEF..."
wget https://cef-builds.spotifycdn.com/cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64.tar.bz2

# Extract to libs directory
echo "Extracting CEF..."
tar -xjf cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64.tar.bz2 -C cef_libs

# Build CEF wrapper library
echo "Building CEF wrapper library..."
mkdir -p cef_libs/build
cd cef_libs/build
cmake -DCMAKE_BUILD_TYPE=Release ../cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64
make -j4 libcef_dll_wrapper

echo "CEF setup completed successfully!"
cd ../../

# Create basic web overlay structure
echo "Creating web overlay directory structure..."
mkdir -p web-overlay/static/js

# Create a basic HTML file if it doesn't exist
if [ ! -f web-overlay/index.html ]; then
  echo "Creating basic index.html..."
  cat > web-overlay/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Video Overlay</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: transparent;
    }
  </style>
  <script defer="defer" src="static/js/main.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.onload = function() {
      console.log("Window loaded");
    }
  </script>
</body>
</html>
EOF
fi

# Create a basic React test file
echo "Creating basic React test file..."
cat > web-overlay/static/js/main.js << 'EOF'
// Simple React test component
const e = React.createElement;

const App = () => {
  return e('div', {
    style: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'Arial',
      fontSize: '18px'
    },
    'data-react-initialized': 'true'
  }, 'CEF React Overlay');
};

// Load React from CDN if needed
if (typeof React === 'undefined') {
  const reactScript = document.createElement('script');
  reactScript.src = 'https://unpkg.com/react@17/umd/react.production.min.js';
  reactScript.onload = loadReactDOM;
  document.head.appendChild(reactScript);
} else {
  loadReactDOM();
}

function loadReactDOM() {
  if (typeof ReactDOM === 'undefined') {
    const reactDOMScript = document.createElement('script');
    reactDOMScript.src = 'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js';
    reactDOMScript.onload = renderApp;
    document.head.appendChild(reactDOMScript);
  } else {
    renderApp();
  }
}

function renderApp() {
  ReactDOM.render(e(App), document.getElementById('root'));
  console.log('React app rendered successfully');
}
EOF

echo "Setup complete! You can now build the application with:"
echo "  mkdir -p build"
echo "  cd build"
echo "  cmake .."
echo "  make"
echo ""
echo "Then run it with:"
echo "  ./video_overlay_app"