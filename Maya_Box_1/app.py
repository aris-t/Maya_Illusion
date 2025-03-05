#!/usr/bin/env python3

import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('GdkX11', '3.0')
gi.require_version('Gst', '1.0')
gi.require_version('WebKit2', '4.0')  # Native GTK WebKit
from gi.repository import Gtk, Gdk, GdkX11, GLib, Gst, WebKit2

import os
import sys
import signal

class VideoOverlayApp:
    def __init__(self):
        # Initialize GStreamer
        Gst.init(None)
        
        # Create the GTK window
        self.window = Gtk.Window()
        self.window.set_title("Video with Web Overlay")
        self.window.set_default_size(1280, 720)
        self.window.connect("destroy", self.quit)
        self.window.connect("key-press-event", self.on_key_press)
        
        # Create a GtkOverlay to stack widgets
        self.overlay_container = Gtk.Overlay()
        
        # Create drawing area for video (bottom layer)
        self.video_area = Gtk.DrawingArea()
        self.video_area.connect("realize", self.on_video_realize)
        
        # Add video area as the base layer
        self.overlay_container.add(self.video_area)
        
        # Create WebKit WebView for the overlay (top layer)
        self.webview = WebKit2.WebView()
        self.webview.set_background_color(Gdk.RGBA(0, 0, 0, 0))  # Transparent background
        
        # Make WebView transparent to mouse events for parts of it that are visually transparent
        self.webview.connect("decide-policy", self.on_decide_policy)
        
        # Set up the web context and settings
        context = WebKit2.WebContext.get_default()
        self.webview.get_settings().set_property("enable-developer-extras", True)
        
        # Set the WebView as an overlay widget (on top of video)
        self.webview.set_size_request(1280, 720)
        self.overlay_container.add_overlay(self.webview)
        
        # Add the overlay container to the window
        self.window.add(self.overlay_container)
        
        # Setup GStreamer pipeline
        # For testing, start with videotestsrc, switch to v4l2src later
        self.setup_video_pipeline()
        
        # Load the HTML overlay
        html_path = "file://" + os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
        self.webview.load_uri(html_path)
    
    def setup_video_pipeline(self):
        # Create GStreamer pipeline with tee for potential UDP streaming
        pipeline_str = (
            "videotestsrc ! "  # Test source - replace with v4l2src for webcam
            "videoconvert ! "
            "tee name=t ! "    # Tee element for splitting the stream
            "queue ! "         # Queue for the display branch
            "videoconvert ! "
            "autovideosink name=sink "
            # Uncomment below for UDP stream when needed
            #"t. ! queue ! videoconvert ! x264enc tune=zerolatency ! rtph264pay ! "
            #"udpsink host=127.0.0.1 port=5000"
        )
        
        # Alternative webcam pipeline - uncomment when ready
        """
        pipeline_str = (
            "v4l2src device=/dev/video0 ! "
            "image/jpeg,width=1280,height=720,framerate=30/1 ! "
            "jpegdec ! "
            "videoconvert ! "
            "tee name=t ! "
            "queue ! "
            "videoconvert ! "
            "autovideosink name=sink "
            # Uncomment below for UDP stream when needed
            #"t. ! queue ! videoconvert ! x264enc tune=zerolatency ! rtph264pay ! "
            #"udpsink host=127.0.0.1 port=5000"
        )
        """
        
        try:
            self.pipeline = Gst.parse_launch(pipeline_str)
            print("Pipeline created successfully")
        except GLib.Error as e:
            print(f"Error creating pipeline: {e}")
            # Fall back to a simpler pipeline
            self.pipeline = Gst.parse_launch("videotestsrc ! autovideosink name=sink")
        
        # Get sink element
        self.sink = self.pipeline.get_by_name("sink")
        
        # Setup bus watch
        bus = self.pipeline.get_bus()
        bus.add_signal_watch()
        bus.connect("message", self.on_message)
    
    def on_video_realize(self, widget):
        # Set video window handle
        window = widget.get_window()
        
        if self.sink and hasattr(self.sink, "set_window_handle"):
            try:
                xid = window.get_xid()
                self.sink.set_window_handle(xid)
                print(f"Set window handle: {xid}")
            except Exception as e:
                print(f"Could not set window handle: {e}")
        
        # Start playing the video
        self.pipeline.set_state(Gst.State.PLAYING)
    
    def on_decide_policy(self, webview, decision, decision_type):
        # This callback helps with making transparent parts of the overlay
        # pass-through for mouse events
        return False  # Let WebKit handle the decision
    
    def on_message(self, bus, message):
        message_type = message.type
        
        if message_type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            print(f"GStreamer Error: {err}, {debug}")
            self.quit()
        elif message_type == Gst.MessageType.WARNING:
            err, debug = message.parse_warning()
            print(f"GStreamer Warning: {err}, {debug}")
        elif message_type == Gst.MessageType.EOS:
            print("End of stream")
    
    def on_key_press(self, widget, event):
        if event.keyval == Gdk.KEY_Escape:
            self.quit()
        elif event.keyval == Gdk.KEY_f:  # 'f' key toggles fullscreen
            if self.window.get_window().get_state() & Gdk.WindowState.FULLSCREEN:
                self.window.unfullscreen()
            else:
                self.window.fullscreen()
        return False
    
    def run(self):
        # Show all widgets
        self.window.show_all()
        
        # Start GTK main loop
        Gtk.main()
    
    def quit(self, *args):
        print("Quitting application...")
        self.pipeline.set_state(Gst.State.NULL)
        Gtk.main_quit()

if __name__ == "__main__":
    # Handle Ctrl+C gracefully
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    
    app = VideoOverlayApp()
    app.run()
