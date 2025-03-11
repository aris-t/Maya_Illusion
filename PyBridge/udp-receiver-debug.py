import cv2
import numpy as np
import socket
import struct
import time
import logging
from threading import Thread
import os
import traceback

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("udp_receiver_debug.log")
    ]
)
logger = logging.getLogger("UDPVideoReceiver")

class UDPVideoReceiver:
    def __init__(self, host='0.0.0.0', port=5000, buffer_size=65536):
        logger.info(f"Initializing UDPVideoReceiver on {host}:{port}")
        self.host = host
        self.port = port
        self.buffer_size = buffer_size
        self.running = False
        self.latest_frame = None
        self.frame_count = 0
        self.start_time = None
        self.last_frame_time = None
        self.fps_update_interval = 5.0  # seconds
        self.current_fps = 0
        
        # Stats
        self.dropped_frames = 0
        self.successful_frames = 0
        
        try:
            # Setup socket
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.bind((self.host, self.port))
            logger.info(f"Socket bound successfully to {host}:{port}")
            
            # Set socket timeout to prevent blocking indefinitely
            self.sock.settimeout(1.0)
            
            # Setup GStreamer pipeline
            pipeline_str = (
                f"udpsrc port={port} caps=\"application/x-rtp, media=video, "
                f"encoding-name=H264, payload=96\" ! rtph264depay ! h264parse ! "
                f"avdec_h264 ! videoconvert ! appsink"
            )
            logger.debug(f"GStreamer pipeline: {pipeline_str}")
            
            # Check if we're running with hardware acceleration
            if os.path.exists("/dev/dri") or os.path.exists("/dev/nvidia0"):
                logger.info("Hardware acceleration may be available")
            
            self.pipeline = cv2.VideoCapture(pipeline_str, cv2.CAP_GSTREAMER)
            
            if not self.pipeline.isOpened():
                logger.error("Failed to open GStreamer pipeline")
                raise RuntimeError("Failed to open GStreamer pipeline")
            else:
                logger.info("GStreamer pipeline opened successfully")
                
        except Exception as e:
            logger.error(f"Initialization error: {str(e)}")
            logger.error(traceback.format_exc())
            raise
        
    def start(self):
        logger.info("Starting receiver thread")
        self.running = True
        self.start_time = time.time()
        self.last_frame_time = self.start_time
        self.thread = Thread(target=self._receive_loop)
        self.thread.daemon = True
        self.thread.start()
        
    def _receive_loop(self):
        last_stats_time = time.time()
        
        try:
            while self.running:
                ret, frame = self.pipeline.read()
                
                current_time = time.time()
                if current_time - last_stats_time >= self.fps_update_interval:
                    self._log_stats()
                    last_stats_time = current_time
                
                if ret:
                    self.successful_frames += 1
                    self.latest_frame = frame
                    self.frame_count += 1
                    
                    # Calculate FPS over short interval
                    now = time.time()
                    time_diff = now - self.last_frame_time
                    if time_diff > 0:
                        instantaneous_fps = 1.0 / time_diff
                        # Smooth FPS using exponential moving average
                        alpha = 0.2  # Smoothing factor
                        if self.current_fps == 0:
                            self.current_fps = instantaneous_fps
                        else:
                            self.current_fps = (alpha * instantaneous_fps) + ((1-alpha) * self.current_fps)
                    
                    self.last_frame_time = now
                    
                    # Log every 100th frame for debug purposes
                    if self.frame_count % 100 == 0:
                        logger.debug(f"Received frame {self.frame_count}, size: {frame.shape}, FPS: {self.current_fps:.2f}")
                else:
                    self.dropped_frames += 1
                    logger.warning(f"Failed to receive frame. Total drops: {self.dropped_frames}")
                
        except Exception as e:
            logger.error(f"Error in receive loop: {str(e)}")
            logger.error(traceback.format_exc())
            self.running = False
                
    def _log_stats(self):
        uptime = time.time() - self.start_time
        total_frames = self.successful_frames + self.dropped_frames
        drop_rate = (self.dropped_frames / max(total_frames, 1)) * 100
        
        # Check for potential network issues
        if self.current_fps < 10 and uptime > 10:
            logger.warning(f"Low FPS detected: {self.current_fps:.2f}. Possible network or decoding issues.")
            
        logger.info(
            f"Stats: Uptime={uptime:.1f}s, Frames={self.frame_count}, "
            f"FPS={self.current_fps:.2f}, Drops={self.dropped_frames} ({drop_rate:.1f}%)"
        )
        
        # Memory usage (Linux only)
        try:
            import resource
            mem_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024  # MB
            logger.debug(f"Memory usage: {mem_usage:.2f} MB")
        except:
            pass
        
    def get_frame(self):
        return self.latest_frame
        
    def get_stats(self):
        """Return current performance statistics"""
        return {
            "fps": self.current_fps,
            "uptime": time.time() - self.start_time if self.start_time else 0,
            "frames_received": self.successful_frames,
            "frames_dropped": self.dropped_frames,
            "drop_rate": (self.dropped_frames / max(self.successful_frames + self.dropped_frames, 1)) * 100
        }
        
    def stop(self):
        logger.info("Stopping receiver")
        self.running = False
        if hasattr(self, 'thread') and self.thread.is_alive():
            self.thread.join(timeout=1.0)
            logger.debug("Receiver thread joined")
        
        if hasattr(self, 'pipeline'):
            self.pipeline.release()
            logger.debug("Pipeline released")
            
        if hasattr(self, 'sock'):
            self.sock.close()
            logger.debug("Socket closed")
            
        # Final stats
        self._log_stats()

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="UDP Video Receiver")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5000, help="Port to listen on")
    args = parser.parse_args()
    
    logger.info(f"Starting UDP receiver on {args.host}:{args.port}")
    
    try:
        receiver = UDPVideoReceiver(host=args.host, port=args.port)
        receiver.start()
        
        while True:
            frame = receiver.get_frame()
            if frame is not None:
                # Process frame here (AI analysis, etc.)
                # Add frame number and FPS as overlay
                stats = receiver.get_stats()
                cv2.putText(
                    frame, 
                    f"FPS: {stats['fps']:.1f} Drops: {stats['frames_dropped']}", 
                    (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    1, 
                    (0, 255, 0), 
                    2
                )
                
                cv2.imshow('Remote Video', frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    logger.info("User requested quit")
                    break
                elif key == ord('d'):
                    # Print detailed debug info on demand
                    logger.info(f"Detailed stats: {receiver.get_stats()}")
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
