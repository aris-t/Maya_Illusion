# Detroit: Become Human UI Video Overlay

This project creates a futuristic UI overlay inspired by the game "Detroit: Become Human" for video streams. It consists of a React frontend for the UI and a Python backend using GStreamer to generate a test video source.

## Prerequisites

### Frontend
- Node.js (v14 or higher)
- npm or yarn

### Backend
- Python 3.8 or higher
- GStreamer 1.0 with development files
- PyGObject

## Installation

### Installing GStreamer (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio
```

### Installing GStreamer (macOS with Homebrew)
```bash
brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav
```

### Installing PyGObject (Ubuntu/Debian)
```bash
sudo apt-get install python3-gi python3-gi-cairo gir1.2-gtk-3.0
```

### Installing PyGObject (macOS with Homebrew)
```bash
brew install pygobject3 gtk+3
```

### Setting up the project
1. Clone the repository
```bash
git clone https://github.com/yourusername/detroit-ui-overlay.git
cd detroit-ui-overlay
```

2. Set up the frontend
```bash
cd frontend
npm install
```

3. Set up the backend
```bash
cd ../backend
pip install -r requirements.txt
```

## Usage

1. Start the backend server
```bash
cd backend
python video_server.py
```

2. In a separate terminal, start the frontend
```bash
cd frontend
npm start
```

3. Open your web browser and navigate to http://localhost:3000

## Customization

### Changing the video source
You can modify the GStreamer pipeline in `backend/video_server.py` to use different video sources:

- To use a webcam (if available):
```python
self.pipeline_string = (
    "v4l2src device=/dev/video0 ! "
    "video/x-raw, width=1280, height=720 ! "
    "videoconvert ! "
    "jpegenc quality=85 ! "
    "multipartmux boundary=spionisto ! "
    "tcpserversink host=127.0.0.1 port=5000"
)
```

- To use a video file:
```python
self.pipeline_string = (
    "filesrc location=/path/to/your/video.mp4 ! "
    "decodebin ! "
    "videoconvert ! "
    "videoscale ! "
    "video/x-raw, width=1280, height=720 ! "
    "jpegenc quality=85 ! "
    "multipartmux boundary=spionisto ! "
    "tcpserversink host=127.0.0.1 port=5000"
)
```

### Modifying the UI
Edit the `frontend/src/components/DetroitOverlay.js` file to change the appearance and functionality of the UI overlay.

## License
MIT
