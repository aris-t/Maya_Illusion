import os
os.environ['XDG_RUNTIME_DIR'] = '/tmp/runtime-dir'
os.environ['DISPLAY'] = ':0'
os.environ['PYTHONTHREADED'] = '1'

# Must be before other imports
import gi
gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib

# Fix X11 threading
os.environ['GST_GL_XINITTHREADS'] = '1'

import cv2
import numpy as np
import gi
gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib
import threading
import logging
import time
import traceback
import os
import psutil
import signal
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("shm_receiver_debug.log")
    ]
)
logger = logging.getLogger("ShmVideoReceiver")

Gst.init(None)

# Global receiver variable for signal handler
receiver = None

# Signal handler for clean exit
def handle_sigint(sig, frame):
    logger.info("Caught SIGINT, cleaning up...")
    if receiver:
        receiver.stop()
    cv2.destroyAllWindows()
    logger.info("Forced exit")
    os._exit(0)  # Force exit

# Register signal handler
signal.signal(signal.SIGINT, handle_sigint)

class ShmVideoReceiver:
    def __init__(self, socket_path='/tmp/video-stream', width=1920, height=1080, format='I420'):
        logger.info(f"Initializing ShmVideoReceiver: path={socket_path}, resolution={width}x{height}, format={format}")
        self.width = width
        self.height = height
        self.format = format
        self.socket_path = socket_path
        self.latest_frame = None
        self.running = False
        self.last_frame_time = None
        self.frame_count = 0
        self.start_time = None
        self.current_fps = 0
        
        # Stats
        self.successful_frames = 0
        self.dropped_frames = 0
        self.null_buffers = 0
        self.mapping_errors = 0
        self.last_error_time = 0
        self.error_threshold = 5.0  # Seconds between similar error messages
        
        try:
            # Check if socket exists
            if not os.path.exists(socket_path):
                logger.warning(f"Socket {socket_path} doesn't exist yet, waiting...")
            
            # Create GStreamer pipeline - use BGRx for better compatibility
            pipeline_str = (
                f"shmsrc socket-path={socket_path} ! "
                f"video/x-raw,format={format},width={width},height={height},framerate=30/1 ! "
                f"videoconvert ! video/x-raw,format=BGRx ! "
                f"appsink name=sink emit-signals=True sync=false max-buffers=2 drop=true"
            )
            logger.debug(f"GStreamer pipeline: {pipeline_str}")
            
            self.pipeline = Gst.parse_launch(pipeline_str)
            if not self.pipeline:
                raise RuntimeError("Failed to create pipeline")
            
            # Get the appsink element
            self.appsink = self.pipeline.get_by_name('sink')
            if not self.appsink:
                raise RuntimeError("Failed to get appsink element")
                
            self.appsink.connect("new-sample", self._on_new_sample)
            
            # Create GLib MainLoop for handling GStreamer events
            self.loop = GLib.MainLoop()
            
            # Setup error handler
            self.bus = self.pipeline.get_bus()
            self.bus.add_signal_watch()
            self.bus.connect("message::error", self._on_error)
            self.bus.connect("message::warning", self._on_warning)
            self.bus.connect("message::info", self._on_info)
            self.bus.connect("message::state-changed", self._on_state_changed)
            self.bus.connect("message::eos", self._on_eos)
            
            logger.info("ShmVideoReceiver initialized successfully")
            
        except Exception as e:
            logger.error(f"Initialization error: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _on_new_sample(self, sink):
        try:
            sample = sink.emit("pull-sample")
            if not sample:
                self.null_buffers += 1
                if time.time() - self.last_error_time > self.error_threshold:
                    logger.warning(f"Received null sample (count: {self.null_buffers})")
                    self.last_error_time = time.time()
                return Gst.FlowReturn.OK
            
            buf = sample.get_buffer()
            caps = sample.get_caps()
            
            # Get memory mapped buffer
            success, map_info = buf.map(Gst.MapFlags.READ)
            if not success:
                self.mapping_errors += 1
                if time.time() - self.last_error_time > self.error_threshold:
                    logger.error(f"Failed to map buffer (count: {self.mapping_errors})")
                    self.last_error_time = time.time()
                return Gst.FlowReturn.OK
            
            # Create numpy array from buffer data
            try:
                # Get the actual frame size 
                # BGRx format has 4 bytes per pixel
                expected_size = self.width * self.height * 4  
                actual_size = map_info.size
                
                if actual_size < expected_size:
                    if time.time() - self.last_error_time > self.error_threshold:
                        logger.warning(f"Buffer size mismatch: expected {expected_size}, got {actual_size}")
                        self.last_error_time = time.time()
                    self.dropped_frames += 1
                    return Gst.FlowReturn.OK
                
                # BGRx format (4 channels)
                frame = np.ndarray(
                    shape=(self.height, self.width, 4),
                    dtype=np.uint8,
                    buffer=map_info.data
                )
                
                # Convert to BGR by slicing off the 'x' channel
                frame = frame[:, :, 0:3]
                
                # Check for corrupt frame
                if frame.size > 0 and np.isfinite(frame).all():
                    self.latest_frame = frame.copy()  # Make a copy to be safe
                    self.successful_frames += 1
                    
                    # Calculate FPS
                    current_time = time.time()
                    if self.last_frame_time is not None:
                        time_diff = current_time - self.last_frame_time
                        if time_diff > 0:
                            instantaneous_fps = 1.0 / time_diff
                            # Smooth FPS
                            alpha = 0.2
                            if self.current_fps == 0:
                                self.current_fps = instantaneous_fps
                            else:
                                self.current_fps = (alpha * instantaneous_fps) + ((1-alpha) * self.current_fps)
                    
                    self.last_frame_time = current_time
                    self.frame_count += 1
                    
                    # Log occasional frame info
                    if self.frame_count % 100 == 0:
                        logger.debug(f"Frame {self.frame_count}: shape={frame.shape}, " +
                                    f"min={frame.min()}, max={frame.max()}, fps={self.current_fps:.2f}")
                        
                        # Memory tracking
                        process = psutil.Process(os.getpid())
                        logger.debug(f"Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB")
                else:
                    self.dropped_frames += 1
                    logger.warning(f"Corrupt frame detected (count: {self.dropped_frames})")
            
            except Exception as e:
                self.dropped_frames += 1
                if time.time() - self.last_error_time > self.error_threshold:
                    logger.error(f"Error processing frame: {str(e)}")
                    logger.error(traceback.format_exc())
                    self.last_error_time = time.time()
            
            finally:
                buf.unmap(map_info)
                
        except Exception as e:
            if time.time() - self.last_error_time > self.error_threshold:
                logger.error(f"Error in _on_new_sample: {str(e)}")
                logger.error(traceback.format_exc())
                self.last_error_time = time.time()
                
        return Gst.FlowReturn.OK
    
    def _on_error(self, bus, msg):
        err, debug = msg.parse_error()
        logger.error(f"GStreamer error: {err.message}")
        logger.debug(f"GStreamer error debug info: {debug}")
        
    def _on_warning(self, bus, msg):
        warn, debug = msg.parse_warning()
        logger.warning(f"GStreamer warning: {warn.message}")
        logger.debug(f"GStreamer warning debug info: {debug}")
    
    def _on_info(self, bus, msg):
        info, debug = msg.parse_info()
        logger.info(f"GStreamer info: {info.message}")
    
    def _on_eos(self, bus, msg):
        logger.info("End of stream received")
        self.loop.quit()
    
    def _on_state_changed(self, bus, msg):
        if msg.src == self.pipeline:
            old, new, pending = msg.parse_state_changed()
            logger.debug(f"Pipeline state changed from {Gst.Element.state_get_name(old)} to " +
                         f"{Gst.Element.state_get_name(new)}")
    
    def _log_stats(self):
        uptime = time.time() - self.start_time
        total_frames = self.successful_frames + self.dropped_frames
        drop_rate = 0 if total_frames == 0 else (self.dropped_frames / total_frames) * 100
        
        logger.info(
            f"Stats: Uptime={uptime:.1f}s, Frames={self.frame_count}, "
            f"FPS={self.current_fps:.2f}, Drops={self.dropped_frames} ({drop_rate:.1f}%)"
        )
        
        # Check socket file existence periodically
        if not os.path.exists(self.socket_path):
            logger.warning(f"Shared memory socket {self.socket_path} does not exist!")
    
    def start(self):
        logger.info("Starting ShmVideoReceiver")
        self.running = True
        self.start_time = time.time()
        self.last_frame_time = self.start_time
        
        # Wait for socket to appear
        wait_count = 0
        while not os.path.exists(self.socket_path) and wait_count < 10:
            logger.info(f"Waiting for socket {self.socket_path} to appear... ({wait_count+1}/10)")
            time.sleep(1)
            wait_count += 1
            
        if not os.path.exists(self.socket_path):
            logger.warning(f"Socket {self.socket_path} still doesn't exist after waiting, but continuing anyway")
        
        # Start the GStreamer pipeline
        ret = self.pipeline.set_state(Gst.State.PLAYING)
        if ret == Gst.StateChangeReturn.FAILURE:
            logger.error("Failed to start pipeline")
            raise RuntimeError("Failed to start pipeline")
        else:
            logger.info(f"Pipeline state change result: {ret}")
        
        # Run GLib MainLoop in a separate thread
        self.thread = threading.Thread(target=self._run_loop)
        self.thread.daemon = True
        self.thread.start()
        
        # Stats logging thread
        self.stats_thread = threading.Thread(target=self._stats_loop)
        self.stats_thread.daemon = True
        self.stats_thread.start()
    
    def _run_loop(self):
        try:
            logger.debug("GLib MainLoop starting")
            self.loop.run()
            logger.debug("GLib MainLoop exited")
        except Exception as e:
            logger.error(f"Error in GLib MainLoop: {str(e)}")
            logger.error(traceback.format_exc())
    
    def _stats_loop(self):
        try:
            while self.running:
                self._log_stats()
                time.sleep(5.0)  # Log stats every 5 seconds
        except Exception as e:
            logger.error(f"Error in stats loop: {str(e)}")
    
    def get_frame(self):
        return self.latest_frame
    
    def get_stats(self):
        """Return current performance statistics"""
        return {
            "fps": self.current_fps,
            "uptime": time.time() - self.start_time if self.start_time else 0,
            "frames_received": self.successful_frames,
            "frames_dropped": self.dropped_frames,
            "null_buffers": self.null_buffers,
            "mapping_errors": self.mapping_errors
        }
    
    def stop(self):
        logger.info("Stopping ShmVideoReceiver")
        self.running = False
        
        # Stop GLib MainLoop
        if hasattr(self, 'loop') and self.loop.is_running():
            try:
                self.loop.quit()
                logger.debug("MainLoop quit")
            except Exception as e:
                logger.error(f"Error quitting MainLoop: {str(e)}")
        
        # Stop pipeline first
        if hasattr(self, 'pipeline'):
            try:
                self.pipeline.set_state(Gst.State.NULL)
                logger.debug("Pipeline set to NULL state")
            except Exception as e:
                logger.error(f"Error stopping pipeline: {str(e)}")
        
        # Join threads with timeout
        try:
            if hasattr(self, 'thread') and self.thread.is_alive():
                self.thread.join(timeout=0.5)
                logger.debug("MainLoop thread joined" if not self.thread.is_alive() else "MainLoop thread join timed out")
                
            if hasattr(self, 'stats_thread') and self.stats_thread.is_alive():
                self.stats_thread.join(timeout=0.5)
                logger.debug("Stats thread joined" if not self.stats_thread.is_alive() else "Stats thread join timed out")
        except Exception as e:
            logger.error(f"Error joining threads: {str(e)}")
        
        # Final stats
        try:
            self._log_stats()
        except Exception:
            pass
            
        logger.info("ShmVideoReceiver stopped")

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Shared Memory Video Receiver")
    parser.add_argument("--socket-path", default="/tmp/video-stream", help="Socket path")
    parser.add_argument("--width", type=int, default=1920, help="Video width")
    parser.add_argument("--height", type=int, default=1080, help="Video height")
    parser.add_argument("--format", default="I420", help="Video format (I420, BGR, RGB, etc)")
    args = parser.parse_args()
    
    logger.info(f"Starting SHM receiver on {args.socket_path}, {args.width}x{args.height}, format={args.format}")
    
    try:
        receiver = ShmVideoReceiver(
            socket_path=args.socket_path,
            width=args.width,
            height=args.height,
            format=args.format
        )
        receiver.start()
        
        while True:
            frame = receiver.get_frame()
            if frame is not None:
                # Add stats overlay
                stats = receiver.get_stats()
                cv2.putText(
                    frame, 
                    f"FPS: {stats['fps']:.1f} Frames: {stats['frames_received']}", 
                    (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    1, 
                    (0, 255, 0), 
                    2
                )
                
                cv2.putText(
                    frame,
                    f"Press 'q' to quit, 'd' for detailed stats",
                    (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    1
                )
                
                # Show the frame
                cv2.imshow('Shared Memory Video', frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    logger.info("User requested quit")
                    break
                elif key == ord('d'):
                    # Print detailed debug info
                    logger.info(f"Detailed stats: {receiver.get_stats()}")
            else:
                # If no frame yet, still handle key events
                key = cv2.waitKey(100) & 0xFF
                if key == ord('q'):
                    break
                
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Exception in main loop: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        if 'receiver' in locals():
            receiver.stop()
        cv2.destroyAllWindows()
        logger.info("Application shutdown complete")