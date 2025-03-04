import os
import time
from flask import Flask, Response, send_file
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "Video server is running. Access the stream at /video_feed"

@app.route('/video_feed')
def video_feed():
    def generate():
        # Start the GStreamer process that saves frames to disk
        process = subprocess.Popen([
            'gst-launch-1.0',
            'v4l2src', 'device=/dev/video0', '!',
            'video/x-raw,framerate=15/1,width=640,height=480', '!',
            'videoconvert', '!', 
            'jpegenc', 'quality=70', '!',
            'multifilesink', 'location=/tmp/frame.jpg', 'max-files=1'
        ])
        
        try:
            # Stream the frames as they're created
            while True:
                try:
                    # Small delay to not overload the system
                    time.sleep(0.03)
                    
                    if os.path.exists('/tmp/frame.jpg'):
                        with open('/tmp/frame.jpg', 'rb') as f:
                            frame_data = f.read()
                            
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
                except Exception as e:
                    print(f"Error reading frame: {e}")
                    time.sleep(0.1)
        finally:
            process.terminate()
            process.wait()
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/test')
def test():
    return "API is working"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)