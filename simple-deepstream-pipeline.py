#!/usr/bin/env python3

import sys
import gi
gi.require_version('Gst', '1.0')
from gi.repository import GObject, Gst, GLib

# Initialize GStreamer
Gst.init(None)

def main(args):
    # Create the main loop
    loop = GLib.MainLoop()
    
    # Create gstreamer pipeline
    print("Creating Pipeline \n")
    pipeline = Gst.Pipeline()
    if not pipeline:
        sys.stderr.write("Unable to create Pipeline \n")
        return
    
    # Create source element
    print("Creating Source \n")
    source = Gst.ElementFactory.make("filesrc", "file-source")
    if not source:
        sys.stderr.write("Unable to create Source \n")
        return
    
    # Set the input file location
    source.set_property('location', args[1])
    
    # Create parser element
    print("Creating H264Parser \n")
    h264parser = Gst.ElementFactory.make("h264parse", "h264-parser")
    if not h264parser:
        sys.stderr.write("Unable to create h264 parser \n")
        return
    
    # Create decoder element
    print("Creating Decoder \n")
    decoder = Gst.ElementFactory.make("nvv4l2decoder", "nvv4l2-decoder")
    if not decoder:
        sys.stderr.write("Unable to create Nvv4l2 Decoder \n")
        return
    
    # Create converter for video format
    print("Creating Converter \n")
    nvvidconv = Gst.ElementFactory.make("nvvideoconvert", "convertor")
    if not nvvidconv:
        sys.stderr.write("Unable to create nvvidconv \n")
        return
    
    # Create video sink
    print("Creating EGLSink \n")
    sink = Gst.ElementFactory.make("nveglglessink", "nvvideo-renderer")
    if not sink:
        sys.stderr.write("Unable to create egl sink \n")
        return
    
    # Add elements to pipeline
    print("Adding elements to Pipeline \n")
    pipeline.add(source)
    pipeline.add(h264parser)
    pipeline.add(decoder)
    pipeline.add(nvvidconv)
    pipeline.add(sink)
    
    # Link the elements
    print("Linking elements in the Pipeline \n")
    source.link(h264parser)
    h264parser.link(decoder)
    decoder.link(nvvidconv)
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
        print("Error: %s: %s\n" % (err, debug))
        loop.quit()
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.stderr.write("usage: %s <H264 filename>\n" % sys.argv[0])
        sys.exit(1)
    
    main(sys.argv)
