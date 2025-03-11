#!/bin/bash

# DeepStream Diagnostics Script
# ----------------------------
echo "=== DeepStream Environment Diagnostics ==="
echo ""

# Display information
echo "=== Display Configuration ==="
echo "DISPLAY variable: $DISPLAY"

# Check if X applications can display
echo ""
echo "=== Testing X display with GStreamer ==="
echo "Running: gst-launch-1.0 videotestsrc num-buffers=60 ! autovideosink"
gst-launch-1.0 videotestsrc num-buffers=60 ! autovideosink

# Check NVIDIA devices
echo ""
echo "=== NVIDIA Device Check ==="
echo "NVIDIA devices in /dev:"
ls -la /dev/nvidia* 2>/dev/null
if [ $? -ne 0 ]; then
    echo "No NVIDIA devices found in /dev!"
fi

# Check NVIDIA driver
echo ""
echo "=== NVIDIA Driver Check ==="
echo "Running nvidia-smi:"
nvidia-smi
if [ $? -ne 0 ]; then
    echo "nvidia-smi failed - NVIDIA driver may not be properly installed!"
fi

# Check user groups
echo ""
echo "=== User Group Permissions ==="
echo "Current user: $(whoami)"
echo "Groups: $(groups)"

# Check GStreamer plugins
echo ""
echo "=== GStreamer Plugin Check ==="
echo "NVIDIA Decoder plugin check:"
gst-inspect-1.0 nvv4l2decoder
if [ $? -ne 0 ]; then
    echo "nvv4l2decoder element not found!"
fi

echo ""
echo "Other required GStreamer plugins:"
for plugin in filesrc qtdemux h264parse decodebin autovideosink videoconvert
do
    echo -n "Checking $plugin: "
    if gst-inspect-1.0 $plugin &>/dev/null; then
        echo "FOUND"
    else
        echo "MISSING"
    fi
done

# Test video file
echo ""
echo "=== Video File Test ==="
echo "Testing sample video with software decoding:"
gst-launch-1.0 filesrc location=samples/sample_video.mp4 ! qtdemux ! h264parse ! decodebin ! videoconvert ! autovideosink

echo ""
echo "Testing sample video with NVIDIA decoding:"
gst-launch-1.0 filesrc location=samples/sample_video.mp4 ! qtdemux ! h264parse ! nvv4l2decoder ! nvvideoconvert ! autovideosink

# Test DeepStream sample
echo ""
echo "=== DeepStream Sample Test ==="
if [ -f "/opt/nvidia/deepstream/deepstream/samples/streams/sample_720p.h264" ]; then
    echo "Testing DeepStream sample H264 file:"
    gst-launch-1.0 filesrc location=/opt/nvidia/deepstream/deepstream/samples/streams/sample_720p.h264 ! h264parse ! nvv4l2decoder ! nvvideoconvert ! autovideosink
else
    echo "DeepStream sample file not found at expected location!"
fi

# Container check
echo ""
echo "=== Container Environment Check ==="
if [ -f "/.dockerenv" ]; then
    echo "Running inside a Docker container"
    
    # Check Docker GPU access
    echo "Docker GPU runtime check:"
    grep nvidia /proc/self/cgroup
    if [ $? -ne 0 ]; then
        echo "Container may not have GPU access. Check if docker was run with --gpus flag."
    fi
else
    echo "Not running in a container environment"
fi

echo ""
echo "=== Diagnostics Complete ==="
