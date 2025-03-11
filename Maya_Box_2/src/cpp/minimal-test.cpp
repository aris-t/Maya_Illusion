#include <gst/gst.h>
#include <gst/rtsp-server/rtsp-server.h>
#include <iostream>
#include <unistd.h>

static void print_debug(const std::string& msg) {
    std::cout << "[DEBUG] " << msg << std::endl;
}

static void on_pad_added(GstElement *src, GstPad *pad, GstElement *sink) {
    GstPad *sinkpad = gst_element_get_static_pad(sink, "sink");
    gst_pad_link(pad, sinkpad);
    gst_object_unref(sinkpad);
}

int main(int argc, char *argv[]) {
    gst_init(&argc, &argv);

    print_debug("Starting minimal test");
    
    // Cleanup old sockets
    system("rm -f /tmp/video-stream*");
    
    // Create the main pipeline
    GstElement *pipeline = gst_pipeline_new("test-pipeline");
    GstElement *source = gst_element_factory_make("v4l2src", "source");
    GstElement *convert = gst_element_factory_make("videoconvert", "convert");
    GstElement *tee = gst_element_factory_make("tee", "tee");
    
    // Display branch
    GstElement *dispqueue = gst_element_factory_make("queue", "dispqueue");
    GstElement *dispsink = gst_element_factory_make("autovideosink", "dispsink");
    
    // Shared memory branch
    GstElement *shmqueue = gst_element_factory_make("queue", "shmqueue");
    GstElement *shmconvert = gst_element_factory_make("videoconvert", "shmconvert");
    GstElement *shmsink = gst_element_factory_make("shmsink", "shmsink");
    
    // Check all elements were created
    if (!pipeline || !source || !convert || !tee || 
        !dispqueue || !dispsink || 
        !shmqueue || !shmconvert || !shmsink) {
        print_debug("Failed to create elements");
        return -1;
    }
    
    // Configure elements
    g_object_set(G_OBJECT(source), "device", "/dev/video0", NULL);
    g_object_set(G_OBJECT(dispsink), "sync", FALSE, NULL);
    g_object_set(G_OBJECT(shmsink), 
                 "socket-path", "/tmp/video-stream",
                 "perms", 0664,
                 "sync", FALSE,
                 "wait-for-connection", FALSE,
                 "shm-size", 10000000, NULL);
    
    // Build the pipeline
    gst_bin_add_many(GST_BIN(pipeline), source, convert, tee,
                     dispqueue, dispsink, 
                     shmqueue, shmconvert, shmsink, NULL);
    
    // Link elements
    if (!gst_element_link_many(source, convert, tee, NULL)) {
        print_debug("Failed to link source elements");
        return -1;
    }
    
    // Link display branch
    if (!gst_element_link_many(dispqueue, dispsink, NULL)) {
        print_debug("Failed to link display branch");
        return -1;
    }
    
    // Link shared memory branch
    if (!gst_element_link_many(shmqueue, shmconvert, shmsink, NULL)) {
        print_debug("Failed to link shared memory branch");
        return -1;
    }
    
    // Link tee to branches
    GstPad *teepad1 = gst_element_request_pad_simple(tee, "src_%u");
    GstPad *disppad = gst_element_get_static_pad(dispqueue, "sink");
    if (gst_pad_link(teepad1, disppad) != GST_PAD_LINK_OK) {
        print_debug("Failed to link tee to display branch");
        return -1;
    }
    gst_object_unref(disppad);
    
    GstPad *teepad2 = gst_element_request_pad_simple(tee, "src_%u");
    GstPad *shmpad = gst_element_get_static_pad(shmqueue, "sink");
    if (gst_pad_link(teepad2, shmpad) != GST_PAD_LINK_OK) {
        print_debug("Failed to link tee to shared memory branch");
        return -1;
    }
    gst_object_unref(shmpad);
    
    // Setup RTSP server
    GstRTSPServer *server = gst_rtsp_server_new();
    gst_rtsp_server_set_service(server, "8554");
    
    GstRTSPMountPoints *mounts = gst_rtsp_server_get_mount_points(server);
    GstRTSPMediaFactory *factory = gst_rtsp_media_factory_new();
    
    gst_rtsp_media_factory_set_launch(factory, 
       "( v4l2src device=/dev/video0 ! videoconvert ! x264enc tune=zerolatency bitrate=1000 ! "
       "h264parse ! rtph264pay name=pay0 pt=96 )");
    
    gst_rtsp_mount_points_add_factory(mounts, "/stream", factory);
    g_object_unref(mounts);
    
    gst_rtsp_server_attach(server, NULL);
    print_debug("RTSP server ready at rtsp://127.0.0.1:8554/stream");
    
    // Start the pipeline
    gst_element_set_state(pipeline, GST_STATE_PLAYING);
    print_debug("Pipeline started");
    
    // Run for 120 seconds
    print_debug("Running for 120 seconds...");
    sleep(120);
    
    // Cleanup
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(pipeline);
    g_object_unref(server);
    print_debug("Done");
    
    return 0;
}