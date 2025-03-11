#!/usr/bin/env python3

import sys
import gi
gi.require_version('Gst', '1.0')
from gi.repository import GObject, Gst, GLib

# Initialize GStreamer
Gst.init(None)

def main():
    # Create the main loop
    loop = GLib.MainLoop()
    
    # Create gstreamer pipeline
    print("Creating Pipeline \n")
    pipeline = Gst.Pipeline()
    if not pipeline:
        sys.stderr.write("Unable to create Pipeline \n")
        return
    
    # Create v4l2 camera source element
    print("Creating Camera Source \n")
    source = Gst.ElementFactory.make("v4l2src", "camera-source")
    if not source:
        sys.stderr.write("Unable to create v4l2src \n")
        return
    
    # Set the camera device path
    source.set_property('device', '/dev/video0')
    
    # Create capsfilter for camera output format
    print("Creating Caps Filter \n")
    caps_filter = Gst.ElementFactory.make("capsfilter", "caps-filter")
    if not caps_filter:
        sys.stderr.write("Unable to create capsfilter \n")
        return
    
    # Configure camera output format
    # Modify this based on what your camera supports
    caps = Gst.Caps.from_string(
        "video/x-raw, width=640, height=480, framerate=30/1"
    )
    caps_filter.set_property("caps", caps)
    
    # Create converter for format conversion
    print("Creating Converter \n")
    videoconvert = Gst.ElementFactory.make("videoconvert", "video-converter")
    if not videoconvert:
        sys.stderr.write("Unable to create videoconvert \n")
        return
    
    # Create nvvideoconvert for NVIDIA-optimized conversion
    print("Creating NVIDIA Video Converter \n")
    nvvidconv = Gst.ElementFactory.make("nvvideoconvert", "nvidia-converter")
    if not nvvidconv:
        sys.stderr.write("Unable to create nvvideoconvert \n")
        return
    
    # Create video sink
    print("Creating Video Sink \n")
    sink = Gst.ElementFactory.make("autovideosink", "video-renderer")
    if not sink:
        sys.stderr.write("Unable to create autovideosink \n")
        return
    
    # Add elements to pipeline
    print("Adding elements to Pipeline \n")
    pipeline.add(source)
    pipeline.add(caps_filter)
    pipeline.add(videoconvert)
    pipeline.add(nvvidconv)
    pipeline.add(sink)
    
    # Link the elements
    print("Linking elements in the Pipeline \n")
    source.link(caps_filter)
    caps_filter.link(videoconvert)
    videoconvert.link(nvvidconv)
    nvvidconv.link(sink)
    
    # Create bus to listen for messages
    bus = pipeline.get_bus()
    bus.add_signal_watch()
    bus.connect("message", bus_call, loop)
    
    # Start playing
    print("Starting pipeline \n")
    pipeline.set_state(Gst.State.PLAYING)
    
    try:
        loop.run()
    except:
        pass
    
    # Cleanup
    pipeline.set_state(Gst.State.NULL)

def bus_call(bus, message, loop):
    t = message.type
    if t == Gst.MessageType.EOS:
        print("End-of-stream\n")
        loop.quit()
    elif t == Gst.MessageType.ERROR:
        err, debug = message.parse_error()
        print(f"Error: {err}: {debug}\n")
        loop.quit()
    elif t == Gst.MessageType.WARNING:
        warn, debug = message.parse_warning()
        print(f"Warning: {warn}: {debug}\n")
    
    return True

if __name__ == '__main__':
    main()
