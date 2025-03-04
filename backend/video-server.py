#!/usr/bin/env python3

import gi
gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib

import os
import sys
import logging
import threading
import time
import socket
from flask import Flask, Response, render_template
from flask_cors import CORS

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('VideoServer')

# Initialize GStreamer
logger.info("Initializing GStreamer")
Gst.init(None)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class GStreamerPipeline:
    def __init__(self):
        logger.info("Creating GStreamer pipeline")
        
        # Log available elements (helpful for debugging)
        self._log_available_elements()
        
        # Try different pipeline options - we'll start with autovideosrc
        pipeline_options = [
            """
            v4l2src device=/dev/video0 !
            video/x-raw,framerate=30/1,width=640,height=480 !
            videoconvert !
            tee name=t !
            queue !
            xvimagesink sync=false t. !
            queue !
            jpegenc quality=70 !
            jpegparse !
            multipartmux boundary=--frame !
            tcpserversink host=127.0.0.1 port=5000
            """,

            """
            v4l2src device=/dev/video0 !
            video/x-raw,framerate=30/1,width=640,height=480 !
            videoconvert !
            tee name=t !
            queue !
            xvimagesink sync=false t. !
            queue !
            jpegenc quality=85 !
            multipartmux boundary=spionisto !
            tcpserversink host=127.0.0.1 port=5000
            """,


            # Option 1: Auto Video Source
            """
            testsrc ! 
            videoconvert ! 
            video/x-raw, width=640, height=480, framerate=15/1 ! 
            jpegenc quality=70 ! 
            multipartmux boundary=spionisto ! 
            tcpserversink host=127.0.0.1 port=5000
            """,
            
            # Option 2: Video Test Source
            """
            videotestsrc pattern=ball ! 
            videoconvert ! 
            video/x-raw, width=640, height=480, framerate=15/1 ! 
            jpegenc quality=70 ! 
            multipartmux boundary=spionisto ! 
            tcpserversink host=127.0.0.1 port=5000
            """,
            
            # Option 3: X11 Screen Capture
            """
            ximagesrc use-damage=false ! 
            videoconvert ! 
            videoscale ! 
            video/x-raw, width=1280, height=720, framerate=15/1 ! 
            jpegenc quality=70 ! 
            multipartmux boundary=spionisto ! 
            tcpserversink host=127.0.0.1 port=5000
            """,
            
            # Option 4: Frei0r Plasma Source (if available)
            """
            frei0r-src-plasma ! 
            videoconvert ! 
            video/x-raw, width=640, height=480, framerate=15/1 ! 
            jpegenc quality=70 ! 
            multipartmux boundary=spionisto ! 
            tcpserversink host=127.0.0.1 port=5000
            """
        ]
        
        # Try each pipeline option until one works
        self.pipeline = None
        for i, pipeline_str in enumerate(pipeline_options):
            logger.info(f"Trying pipeline option {i+1}:\n{pipeline_str.strip()}")
            try:
                # Remove newlines and extra spaces for cleaner parsing
                clean_pipeline = ' '.join(pipeline_str.split())
                self.pipeline_string = clean_pipeline
                self.pipeline = Gst.parse_launch(self.pipeline_string)
                
                # Test if the pipeline can enter the READY state
                ret = self.pipeline.set_state(Gst.State.READY)
                if ret == Gst.StateChangeReturn.SUCCESS or ret == Gst.StateChangeReturn.ASYNC:
                    logger.info(f"Successfully created pipeline with option {i+1}")
                    break
                else:
                    logger.warning(f"Pipeline option {i+1} created but couldn't enter READY state")
                    self.pipeline = None
            except gi.repository.GLib.Error as e:
                logger.error(f"Failed to create pipeline option {i+1}: {e}")
                self.pipeline = None
        
        if self.pipeline is None:
            logger.error("All pipeline options failed. Exiting.")
            sys.exit(1)
            
        self.loop = GLib.MainLoop()
        
        # Set up bus to catch errors and EOS
        bus = self.pipeline.get_bus()
        bus.add_signal_watch()
        bus.connect("message::error", self._on_error)
        bus.connect("message::eos", self._on_eos)
        bus.connect("message::state-changed", self._on_state_changed)
        
    def _log_available_elements(self):
        """Log a few key GStreamer elements to help with debugging"""
        elements_to_check = [
            "autovideosrc", "videotestsrc", "ximagesrc", "v4l2src", 
            "jpegenc", "pngenc", "videoconvert", "tcpserversink"
        ]
        
        logger.info("Checking for key GStreamer elements:")
        for element in elements_to_check:
            factory = Gst.ElementFactory.find(element)
            if factory:
                logger.info(f"  ✓ {element} - Available")
            else:
                logger.warning(f"  ✗ {element} - Not available")
    
    def _on_error(self, bus, message):
        err, debug = message.parse_error()
        logger.error(f"GStreamer error: {err}")
        logger.debug(f"GStreamer error debug info: {debug}")
        self.loop.quit()
    
    def _on_eos(self, bus, message):
        logger.info("End of stream reached")
        self.loop.quit()
    
    def _on_state_changed(self, bus, message):
        if message.src == self.pipeline:
            old_state, new_state, pending_state = message.parse_state_changed()
            logger.debug(f"Pipeline state changed from {Gst.Element.state_get_name(old_state)} to {Gst.Element.state_get_name(new_state)}")
        
    def start(self):
        # Start the pipeline
        logger.info("Starting GStreamer pipeline")
        ret = self.pipeline.set_state(Gst.State.PLAYING)
        if ret == Gst.StateChangeReturn.FAILURE:
            logger.error("Failed to set pipeline to playing state")
            return False
            
        logger.info("GStreamer pipeline started")
        
        # Start the GLib main loop in a separate thread
        threading.Thread(target=self._run_loop, daemon=True).start()
        return True
    
    def stop(self):
        # Stop the pipeline
        logger.info("Stopping GStreamer pipeline")
        self.pipeline.set_state(Gst.State.NULL)
        if self.loop.is_running():
            self.loop.quit()
        logger.info("GStreamer pipeline stopped")
    
    def _run_loop(self):
        # Run the GLib main loop
        logger.info("Starting GLib main loop")
        self.loop.run()
        logger.info("GLib main loop exited")

# Create the GStreamer pipeline
pipeline = None

def generate_frames():
    logger.info("Client connected, starting to generate frames")
    client_socket = None
    try:
        # Connect to the TCP server started by GStreamer
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_socket.settimeout(10)  # Set timeout for connection
        logger.debug("Connecting to TCP server at 127.0.0.1:5000")
        client_socket.connect(('127.0.0.1', 5000))
        logger.info("Connected to TCP server successfully")
        
        # Read and yield the JPEG frames
        boundary = b'--spionisto\r\nContent-Type: image/jpeg\r\n\r\n'
        logger.debug(f"Using boundary: {boundary}")
        frame = b''
        frame_count = 0
        last_log_time = time.time()
        bytes_received = 0
        
        # Yield a test frame to confirm the route works at all
        logger.debug("Yielding initial test frame")
        yield (b'--frame\r\nContent-Type: text/plain\r\n\r\nConnection established, waiting for first frame...\r\n')
        
        while True:
            try:
                logger.debug("Waiting to receive data...")
                data = client_socket.recv(4096)
                if not data:
                    logger.warning("Received empty data, connection may be closed")
                    break
                
                bytes_received += len(data)
                logger.debug(f"Received {len(data)} bytes (total: {bytes_received})")
                frame += data
                
                # Log raw data periodically for debugging
                if frame_count == 0:
                    logger.debug(f"First 100 bytes of data: {data[:100]}")
                
                boundary_pos = frame.find(boundary)
                logger.debug(f"Searching for boundary - found at position: {boundary_pos}")
                
                while boundary_pos != -1:
                    jpeg_data = frame[:boundary_pos]
                    frame = frame[boundary_pos + len(boundary):]
                    
                    if jpeg_data:
                        frame_count += 1
                        logger.debug(f"Found frame #{frame_count} with size {len(jpeg_data)} bytes")
                        
                        # Log frame rate every 5 seconds
                        current_time = time.time()
                        if current_time - last_log_time > 5:
                            logger.info(f"Frame rate: {frame_count / (current_time - last_log_time):.2f} fps")
                            frame_count = 0
                            last_log_time = current_time
                        
                        # Try to detect if this is actually a JPEG
                        if jpeg_data.startswith(b'\xff\xd8') and jpeg_data.endswith(b'\xff\xd9'):
                            logger.debug("Frame has valid JPEG markers")
                        else:
                            logger.warning(f"Frame may not be a valid JPEG - first 10 bytes: {jpeg_data[:10]}")
                            
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + jpeg_data + b'\r\n')
                    else:
                        logger.warning("Empty JPEG data segment found")
                    
                    boundary_pos = frame.find(boundary)
                
            except socket.timeout:
                logger.warning("Socket timeout during frame reading")
                yield (b'--frame\r\nContent-Type: text/plain\r\n\r\nTimeout waiting for video frames\r\n')
                break
            except Exception as e:
                logger.error(f"Error reading frames: {e}")
                yield (b'--frame\r\nContent-Type: text/plain\r\n\r\nError reading frames: ' + str(e).encode('utf-8') + b'\r\n')
                break
                
    except ConnectionRefusedError:
        logger.error("Connection refused - GStreamer TCP server not running")
        yield (b'--frame\r\n'
               b'Content-Type: text/plain\r\n\r\n'
               b'Error: Could not connect to video stream server (connection refused)\r\n')
    except socket.timeout:
        logger.error("Connection timeout - GStreamer TCP server not responding")
        yield (b'--frame\r\n'
               b'Content-Type: text/plain\r\n\r\n'
               b'Error: Connection timeout while connecting to video server\r\n')
    except Exception as e:
        logger.error(f"Error in generate_frames: {e}", exc_info=True)
        yield (b'--frame\r\n'
               b'Content-Type: text/plain\r\n\r\n'
               b'Error: ' + str(e).encode('utf-8') + b'\r\n')
    finally:
        if client_socket:
            logger.info("Closing client socket")
            client_socket.close()

@app.route('/video_feed')
def video_feed():
    # Return the video stream as a multipart response
    logger.info("Received request for /video_feed")
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    # A simple status page
    logger.info("Received request for index page")
    pipeline_str = pipeline.pipeline_string if pipeline else "No pipeline created"
    
    return f"""
    <html>
        <head>
            <title>Video Server Status</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                .status {{ padding: 10px; margin: 10px 0; border-radius: 5px; }}
                .success {{ background-color: #dff0d8; border: 1px solid #d6e9c6; color: #3c763d; }}
                .info {{ background-color: #d9edf7; border: 1px solid #bce8f1; color: #31708f; }}
                pre {{ background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }}
            </style>
        </head>
        <body>
            <h1>Video Server Status</h1>
            <div class="status success">Server is running</div>
            <div class="status info">Access the video stream at <a href="/video_feed">/video_feed</a></div>
            <h2>Debug Information</h2>
            <p>Current GStreamer pipeline:</p>
            <pre>{pipeline_str}</pre>
        </body>
    </html>
    """

def start_flask():
    # Start the Flask server
    logger.info("Starting Flask server")
    app.run(host='0.0.0.0', port=8080, debug=False)

if __name__ == '__main__':
    try:
        # Create and start the GStreamer pipeline
        logger.info("Starting video server")
        pipeline = GStreamerPipeline()
        
        if pipeline.start():
            # Start the Flask server (this will block until the server is stopped)
            start_flask()
        else:
            logger.error("Failed to start GStreamer pipeline")
            sys.exit(1)
            
    except KeyboardInterrupt:
        # Handle Ctrl+C
        logger.info("Shutting down due to keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
    finally:
        # Clean up
        if pipeline:
            pipeline.stop()
        logger.info("Video server shut down")