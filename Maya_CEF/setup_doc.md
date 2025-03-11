# Setup Guide

This document explains how to set up the Video Overlay with CEF from scratch.

## Prerequisites

Install system dependencies:

```bash
sudo apt-get update
sudo apt-get install build-essential cmake libgtk-3-dev \
libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
```

## CEF Installation

1. Download CEF (automated in setup_cef.sh):

```bash
#!/bin/bash
# setup_cef.sh

# Create directories
mkdir -p cef_libs

# Download CEF
wget https://cef-builds.spotifycdn.com/cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64.tar.bz2

# Extract to libs directory
tar -xjf cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64.tar.bz2 -C cef_libs

# Build CEF wrapper library
mkdir -p cef_libs/build
cd cef_libs/build
cmake -DCMAKE_BUILD_TYPE=Release ../cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64
make -j4 libcef_dll_wrapper

echo "CEF setup completed successfully!"
cd ../../
```

Make the script executable and run it:
```bash
chmod +x setup_cef.sh
./setup_cef.sh
```

## Build Configuration

Create a CMakeLists.txt:

```cmake
cmake_minimum_required(VERSION 3.10)
project(video_overlay_app)

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK REQUIRED gtk+-3.0)
pkg_check_modules(GST REQUIRED gstreamer-1.0 gstreamer-video-1.0)

# Set CEF paths directly
set(CEF_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/cef_libs/cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64")
set(CEF_WRAPPER_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cef_libs/build/libcef_dll_wrapper/libcef_dll_wrapper.a")
set(CEF_LIB_PATH "${CEF_ROOT}/Release/libcef.so")

# Include CEF CMake modules
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CEF_ROOT}/cmake")
include("${CEF_ROOT}/cmake/FindCEF.cmake")
include("${CEF_ROOT}/cmake/cef_variables.cmake")

# Add the source files
set(SOURCE_FILES
    video_app_cef.cpp
)

# Create the executable
add_executable(video_overlay_app ${SOURCE_FILES})

# Add compiler flags
target_compile_features(video_overlay_app PRIVATE cxx_std_17)

# Include directories
target_include_directories(video_overlay_app PRIVATE 
    ${GTK_INCLUDE_DIRS}
    ${GST_INCLUDE_DIRS}
    ${CEF_ROOT}
    ${CEF_ROOT}/include
)

# Link libraries
target_link_libraries(video_overlay_app
    ${GTK_LIBRARIES}
    ${GST_LIBRARIES}
    ${CEF_LIB_PATH}
    ${CEF_WRAPPER_PATH}
)

# Copy CEF resources
add_custom_command(
    TARGET video_overlay_app
    POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CEF_ROOT}/Resources"
            "$<TARGET_FILE_DIR:video_overlay_app>"
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CEF_ROOT}/Release"
            "$<TARGET_FILE_DIR:video_overlay_app>"
)
```

## React Setup

1. Create the web overlay directory structure:
```bash
mkdir -p web-overlay/static/js
```

2. Create a basic index.html in web-overlay/:
```html
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
</body>
</html>
```

3. Create main.js with a basic React app in web-overlay/static/js/:
```js
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
```

## Compile and Run

```bash
mkdir -p build
cd build
cmake ..
make
./video_overlay_app
```

## Common Issues

1. **Missing ICU data**: Copy `icudtl.dat` file:
```bash
cp ../cef_libs/cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64/Resources/icudtl.dat ./
```

2. **Library path issues**: Set LD_LIBRARY_PATH:
```bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(pwd)
```

3. **React not loading**: Check the browser console output and ensure paths are correct.