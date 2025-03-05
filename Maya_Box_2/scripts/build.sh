#!/bin/bash

# Build the React overlay
echo "Building React overlay..."
cd src/web-overlay
npm install
npm run build

# Copy build files to the correct location
echo "Copying build files..."
mkdir -p ../../build/web-overlay
cp -r build/* ../../build/web-overlay/

# Build the C++ application
echo "Building C++ application..."
cd ../../
make

echo "Build complete!"
