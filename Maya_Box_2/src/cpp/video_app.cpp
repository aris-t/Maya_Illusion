#include <gtk/gtk.h>
#include <gdk/gdkx.h>
#include <webkit2/webkit2.h>
#include <gst/gst.h>
#include <gst/video/videooverlay.h>
#include <gst/rtsp-server/rtsp-server.h>  // Add this at the top
#include <iostream>
#include <string>
#include <filesystem>
#include <unistd.h>

// Global variables
GstElement *pipeline = nullptr;
GstElement *tee = nullptr;
GstElement *videoSink = nullptr;
GstElement *shmSink = nullptr;
GtkWidget *videoWindow = nullptr;
GtkWidget *overlayWindow = nullptr;
GtkWidget *webView = nullptr;
GstRTSPServer *rtspServer = nullptr;

// Configuration - adjust as needed
const bool ENABLE_SHM = true;
const bool ENABLE_RTSP = true;
const std::string SHM_SOCKET_PATH = "/tmp/video-stream";
const std::string RTSP_PORT = "8554";
const std::string RTSP_MOUNT_POINT = "/stream";

// Forward declarations
static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer data);
static void on_message(GstBus *bus, GstMessage *message, gpointer data);
static void cleanup_and_quit();
static void on_load_changed(WebKitWebView *web_view, WebKitLoadEvent load_event, gpointer user_data);
static gboolean on_console_message(WebKitWebView *web_view, gchar *message, gpointer user_data);
static void setup_rtsp_server();

// Debug helper function
void debug_print(const std::string& prefix, const std::string& message) {
    std::cout << "[DEBUG] " << prefix << ": " << message << std::endl;
}

int main(int argc, char *argv[]) {
    debug_print("Init", "Starting application");
    gst_init(&argc, &argv);
    gtk_init(&argc, &argv);

    // Create the video window (bottom layer)
    videoWindow = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(videoWindow), "Video");
    gtk_window_set_default_size(GTK_WINDOW(videoWindow), 1920, 1080);
    gtk_window_set_decorated(GTK_WINDOW(videoWindow), FALSE);
    g_signal_connect(videoWindow, "destroy", G_CALLBACK(cleanup_and_quit), NULL);
    g_signal_connect(videoWindow, "key-press-event", G_CALLBACK(on_key_press), NULL);
    
    // Create overlay window (top layer)
    overlayWindow = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(overlayWindow), "Overlay");
    gtk_window_set_default_size(GTK_WINDOW(overlayWindow), 1920, 1080);
    gtk_window_set_decorated(GTK_WINDOW(overlayWindow), FALSE);
    g_signal_connect(overlayWindow, "destroy", G_CALLBACK(cleanup_and_quit), NULL);
    g_signal_connect(overlayWindow, "key-press-event", G_CALLBACK(on_key_press), NULL);
    
    // Set overlay window to be transparent
    GdkScreen *screen = gtk_window_get_screen(GTK_WINDOW(overlayWindow));
    GdkVisual *visual = gdk_screen_get_rgba_visual(screen);
    if (visual != nullptr && gdk_screen_is_composited(screen)) {
        gtk_widget_set_visual(overlayWindow, visual);
        gtk_widget_set_app_paintable(overlayWindow, TRUE);
    } else {
        debug_print("Error", "Compositing is not available");
    }
    
    // Create the WebKit WebView
    webView = webkit_web_view_new();
    
    // Set WebView to have a transparent background
    GdkRGBA transparent = {0.0, 0.0, 0.0, 0.0};
    webkit_web_view_set_background_color(WEBKIT_WEB_VIEW(webView), &transparent);
    
    // Connect to load-changed and console-message signals
    g_signal_connect(G_OBJECT(webView), "load-changed", G_CALLBACK(on_load_changed), NULL);
    g_signal_connect(webView, "console-message", G_CALLBACK(on_console_message), NULL);
    
    // Add the WebView to the overlay window
    gtk_container_add(GTK_CONTAINER(overlayWindow), webView);

    // Get the current directory for the HTML file
    std::string currentPath = std::filesystem::current_path().string();
    std::string htmlPath = "file://" + currentPath + "/web-overlay/react-overlay.html";
    debug_print("WebView", "Loading HTML from: " + htmlPath);
    
    // Enable JavaScript with enhanced settings
    WebKitSettings *settings = webkit_web_view_get_settings(WEBKIT_WEB_VIEW(webView));
    webkit_settings_set_enable_javascript(settings, TRUE);
    
    // These might not be available in older WebKit versions - try/catch them
    try {
        webkit_settings_set_javascript_can_access_clipboard(settings, TRUE);
    } catch (...) {
        debug_print("WebView", "javascript_can_access_clipboard not supported");
    }
    
    try {
        webkit_settings_set_enable_developer_extras(settings, TRUE);
    } catch (...) {
        debug_print("WebView", "enable_developer_extras not supported");
    }
    
    try {
        webkit_settings_set_hardware_acceleration_policy(settings, WEBKIT_HARDWARE_ACCELERATION_POLICY_NEVER);
    } catch (...) {
        debug_print("WebView", "hardware_acceleration_policy not supported");
    }
    
    try {
        webkit_settings_set_enable_webgl(settings, FALSE);
    } catch (...) {
        debug_print("WebView", "enable_webgl not supported");
    }
    
    // Load the HTML file into WebView
    webkit_web_view_load_uri(WEBKIT_WEB_VIEW(webView), htmlPath.c_str());
    
    // Show video window first
    gtk_widget_show_all(videoWindow);
    gtk_window_fullscreen(GTK_WINDOW(videoWindow));
    
    // Wait for window to be realized
    while (gtk_events_pending()) {
        gtk_main_iteration();
    }
    
    // Get the window handle for GStreamer
    guintptr window_handle = GDK_WINDOW_XID(gtk_widget_get_window(videoWindow));
    debug_print("Window", "Video window XID: " + std::to_string(window_handle));
    
    // Create the pipeline string
    std::string pipeline_str = 
        "v4l2src device=/dev/video0 ! "
        "image/jpeg,width=1920,height=1080,framerate=30/1 ! "
        "jpegdec ! videoconvert ! tee name=t "
        "t. ! queue max-size-buffers=2 leaky=downstream ! xvimagesink name=sink sync=false";
    
    // Create the pipeline with gst_parse_launch
    GError *error = nullptr;
    pipeline = gst_parse_launch(pipeline_str.c_str(), &error);
    
    if (error) {
        debug_print("Pipeline", "Failed to create pipeline: " + std::string(error->message));
        g_clear_error(&error);
        cleanup_and_quit();
        return 1;
    }
    
    // Find the video sink and set window handle
    GstElement *sink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");
    if (sink && GST_IS_VIDEO_OVERLAY(sink)) {
        gst_video_overlay_set_window_handle(GST_VIDEO_OVERLAY(sink), window_handle);
        g_object_set(G_OBJECT(sink), "force-aspect-ratio", FALSE, NULL);
        gst_object_unref(sink);
    }
    
    // Get the tee element for later use
    tee = gst_bin_get_by_name(GST_BIN(pipeline), "t");
    if (!tee) {
        debug_print("Pipeline", "Failed to get tee element");
        cleanup_and_quit();
        return 1;
    }
    
    // Clean up old sockets
    std::string cleanup_cmd = "rm -f " + SHM_SOCKET_PATH + "*";
    system(cleanup_cmd.c_str());
    debug_print("Pipeline", "Cleaned up old shared memory sockets");
    
    // Add shared memory branch if enabled
    if (ENABLE_SHM) {
        // Create elements
        GstElement *shmqueue = gst_element_factory_make("queue", "shm-queue");
        GstElement *shmconvert = gst_element_factory_make("videoconvert", "shm-convert");
        GstElement *shmcapsfilter = gst_element_factory_make("capsfilter", "shm-caps");
        shmSink = gst_element_factory_make("shmsink", "shm-sink");
        
        if (!shmqueue || !shmconvert || !shmcapsfilter || !shmSink) {
            debug_print("Pipeline", "Failed to create shared memory elements");
        } else {
            // Configure capsfilter
            GstCaps *shmcaps = gst_caps_new_simple("video/x-raw",
                "format", G_TYPE_STRING, "I420",
                "width", G_TYPE_INT, 1920,
                "height", G_TYPE_INT, 1080,
                "framerate", GST_TYPE_FRACTION, 30, 1,
                NULL);
            g_object_set(G_OBJECT(shmcapsfilter), "caps", shmcaps, NULL);
            gst_caps_unref(shmcaps);
            
            // Configure shmsink
            g_object_set(G_OBJECT(shmSink),
                        "socket-path", SHM_SOCKET_PATH.c_str(),
                        "perms", 0664,  // Read/write for owner/group, read-only for others
                        "sync", FALSE,
                        "wait-for-connection", FALSE,  // Don't block if no client
                        "shm-size", 10000000,  // 10MB buffer
                        NULL);
            
            // Add elements to pipeline
            gst_bin_add_many(GST_BIN(pipeline), shmqueue, shmconvert, shmcapsfilter, shmSink, NULL);
            
            // Link elements together
            if (!gst_element_link_many(shmqueue, shmconvert, shmcapsfilter, shmSink, NULL)) {
                debug_print("Pipeline", "Failed to link shared memory elements");
                gst_bin_remove_many(GST_BIN(pipeline), shmqueue, shmconvert, shmcapsfilter, shmSink, NULL);
            } else {
                // Link tee to queue
                GstPad *teepad = gst_element_request_pad_simple(tee, "src_%u");
                GstPad *queuepad = gst_element_get_static_pad(shmqueue, "sink");
                
                if (gst_pad_link(teepad, queuepad) != GST_PAD_LINK_OK) {
                    debug_print("Pipeline", "Failed to link tee to shared memory queue");
                } else {
                    debug_print("Pipeline", "Shared memory branch added successfully");
                }
                
                gst_object_unref(queuepad);
            }
        }
    }
    
    // Set up the bus watch
    GstBus *bus = gst_pipeline_get_bus(GST_PIPELINE(pipeline));
    gst_bus_add_signal_watch(bus);
    g_signal_connect(bus, "message", G_CALLBACK(on_message), NULL);
    gst_object_unref(bus);
    
    // Start the pipeline
    GstStateChangeReturn ret = gst_element_set_state(pipeline, GST_STATE_PLAYING);
    if (ret == GST_STATE_CHANGE_FAILURE) {
        debug_print("Pipeline", "Failed to start pipeline");
        cleanup_and_quit();
        return 1;
    }
    
    // Setup RTSP server if enabled
    if (ENABLE_RTSP) {
        setup_rtsp_server();
    }
    
    // Short delay to ensure video is displayed
    usleep(500000);  // 500ms
    
    // Now show the overlay window on top
    gtk_widget_show_all(overlayWindow);
    gtk_window_fullscreen(GTK_WINDOW(overlayWindow));
    
    // Keep overlay window on top
    gtk_window_set_keep_above(GTK_WINDOW(overlayWindow), TRUE);
    
    // Run the GTK main loop
    gtk_main();
    
    return 0;
}

// Setup RTSP server independent of the main pipeline
static void setup_rtsp_server() {
    debug_print("RTSP", "Setting up RTSP server on port " + RTSP_PORT + " at " + RTSP_MOUNT_POINT);
    
    // Create GstRtspServer
    rtspServer = gst_rtsp_server_new();
    if (!rtspServer) {
        debug_print("RTSP", "Failed to create RTSP server");
        return;
    }
    
    // Set the port
    gst_rtsp_server_set_service(rtspServer, RTSP_PORT.c_str());
    
    // Get the mount points
    GstRTSPMountPoints *mounts = gst_rtsp_server_get_mount_points(rtspServer);
    
    // Create factory and configure it
    GstRTSPMediaFactory *factory = gst_rtsp_media_factory_new();
    
    // Set launch line for the factory
    // This creates a completely separate pipeline specifically for RTSP streaming
    gst_rtsp_media_factory_set_launch(factory, 
        "( v4l2src device=/dev/video0 ! "
        "image/jpeg,width=1920,height=1080,framerate=30/1 ! "
        "jpegdec ! videoconvert ! x264enc tune=zerolatency speed-preset=ultrafast "
        "bitrate=2000 key-int-max=30 ! h264parse ! rtph264pay name=pay0 pt=96 )");
    
    // Don't reuse the media - create fresh for each viewer
    gst_rtsp_media_factory_set_shared(factory, TRUE);
    
    // Mount the factory
    gst_rtsp_mount_points_add_factory(mounts, RTSP_MOUNT_POINT.c_str(), factory);
    g_object_unref(mounts);
    
    // Start the RTSP server with default maincontext
    gst_rtsp_server_attach(rtspServer, NULL);
    
    // Just log the URL
    std::string ip = "YOUR_IP_ADDRESS";
    debug_print("RTSP", "RTSP URL: rtsp://" + ip + ":" + RTSP_PORT + RTSP_MOUNT_POINT);
}

// Handle WebKit load events
static void on_load_changed(WebKitWebView *web_view, WebKitLoadEvent load_event, gpointer user_data) {
    switch (load_event) {
        case WEBKIT_LOAD_STARTED:
            debug_print("WebView", "Load started");
            break;
        case WEBKIT_LOAD_REDIRECTED:
            debug_print("WebView", "Load redirected");
            break;
        case WEBKIT_LOAD_COMMITTED:
            debug_print("WebView", "Load committed");
            break;
        case WEBKIT_LOAD_FINISHED:
            debug_print("WebView", "Load finished");
            break;
    }
}

// Handle WebKit console messages
static gboolean on_console_message(WebKitWebView *web_view, gchar *message, gpointer user_data) {
    debug_print("WebKit Console", message ? message : "(null message)");
    return FALSE; // Return FALSE to allow default console handling
}

// Handle keyboard events
static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer data) {
    if (event->keyval == GDK_KEY_Escape) {
        debug_print("KeyPress", "ESC key pressed, quitting");
        cleanup_and_quit();
        return TRUE;
    }
    return FALSE;
}

// Handle GStreamer bus messages
static void on_message(GstBus *bus, GstMessage *message, gpointer data) {
    switch (GST_MESSAGE_TYPE(message)) {
        case GST_MESSAGE_ERROR: {
            GError *err = nullptr;
            gchar *debug_info = nullptr;
            gst_message_parse_error(message, &err, &debug_info);
            
            debug_print("GstError", "Error: " + std::string(err->message));
            debug_print("GstError", "Debug info: " + std::string(debug_info ? debug_info : "none"));
            
            g_clear_error(&err);
            g_free(debug_info);
            
            cleanup_and_quit();
            break;
        }
        case GST_MESSAGE_WARNING: {
            GError *err = nullptr;
            gchar *debug_info = nullptr;
            gst_message_parse_warning(message, &err, &debug_info);
            
            debug_print("GstWarning", "Warning: " + std::string(err->message));
            debug_print("GstWarning", "Debug info: " + std::string(debug_info ? debug_info : "none"));
            
            g_clear_error(&err);
            g_free(debug_info);
            break;
        }
        case GST_MESSAGE_EOS:
            debug_print("GstMessage", "End of stream");
            cleanup_and_quit();
            break;
        default:
            // Unhandled message
            break;
    }
}

// Clean up and quit the application
static void cleanup_and_quit() {
    debug_print("Cleanup", "Cleaning up and quitting");
    
    if (pipeline) {
        debug_print("Cleanup", "Setting pipeline to NULL state");
        gst_element_set_state(pipeline, GST_STATE_NULL);
        debug_print("Cleanup", "Unreferencing pipeline");
        gst_object_unref(pipeline);
        pipeline = nullptr;
    }
    
    if (rtspServer) {
        debug_print("Cleanup", "Cleaning up RTSP server");
        g_object_unref(rtspServer);
        rtspServer = nullptr;
    }
    
    debug_print("Cleanup", "Quitting GTK main loop");
    gtk_main_quit();
}