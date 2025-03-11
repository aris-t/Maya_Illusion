# Video Overlay with CEF

A GTK/GStreamer application that displays video with a transparent Chromium (CEF) overlay for React-based UI elements.

## Features

- Video input from webcam or other V4L2 devices
- Transparent browser overlay using CEF (Chromium Embedded Framework)
- React application support
- Customizable UI elements

## Requirements

- Linux with X11 (tested on Ubuntu/Debian)
- GTK3
- GStreamer 1.0
- CMake 3.10+
- C++17 compatible compiler

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/video-overlay-cef.git
cd video-overlay-cef

# Set up CEF
./setup_cef.sh

# Build the application
mkdir -p build
cd build
cmake ..
make

# Run
./video_overlay_app
```

## Key Bindings

- `ESC`: Exit application

## Project Structure

```
├── CMakeLists.txt         # Build configuration
├── video_app_cef.cpp      # Main application code
├── setup_cef.sh           # CEF setup script
├── web-overlay/           # React web application
│   ├── index.html         # HTML entry point
│   └── static/            # Static assets for web overlay
│       └── js/            # JavaScript files
└── cef_libs/              # CEF libraries (after setup)
```

## Troubleshooting

If you encounter issues with React not loading, check that:
1. The web-overlay/static/js/ directory exists with your React bundle
2. Paths in index.html are relative (no leading slash)
3. Console output for detailed error messages

## License

MIT