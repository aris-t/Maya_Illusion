#include <gtk/gtk.h>
#include <gdk/gdkx.h>
#include <webkit2/webkit2.h>
#include <gst/gst.h>
#include <gst/video/videooverlay.h>
#include <iostream>
#include <string>
#include <filesystem>
#include <unistd.h>

// Global variables
GstElement *pipeline = nullptr;
GtkWidget *videoWindow = nullptr;
GtkWidget *overlayWindow = nullptr;
GtkWidget *webView = nullptr;

// Forward declarations
static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer data);
static void on_message(GstBus *bus, GstMessage *message, gpointer data);
static void cleanup_and_quit();

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
    
    // Add the WebView to the overlay window
    gtk_container_add(GTK_CONTAINER(overlayWindow), webView);

    // Get the current directory for the HTML file
    std::string currentPath = std::filesystem::current_path().string();
    std::string htmlPath = "file://" + currentPath + "/index.html";
    
    // Load the HTML file into WebView
    webkit_web_view_load_uri(WEBKIT_WEB_VIEW(webView), htmlPath.c_str());
    
    // Enable JavaScript
    WebKitSettings *settings = webkit_web_view_get_settings(WEBKIT_WEB_VIEW(webView));
    webkit_settings_set_enable_javascript(settings, TRUE);
    
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
    
    // Create the pipeline using MJPG format with known supported resolution
    GError *error = nullptr;
    
    // Use MJPG format which is supported by your camera
    const gchar *pipelineStr = 
        "v4l2src device=/dev/video0 ! "
        "image/jpeg,width=1920,height=1080,framerate=30/1 ! "
        "jpegdec ! videoconvert ! xvimagesink name=sink sync=false";
    
    debug_print("Pipeline", "Creating pipeline with MJPG format at 1920x1080");
    pipeline = gst_parse_launch(pipelineStr, &error);
    
    if (error) {
        debug_print("Pipeline", "Failed with 1080p: " + std::string(error->message));
        g_clear_error(&error);
        
        // Try with 720p
        pipelineStr = 
            "v4l2src device=/dev/video0 ! "
            "image/jpeg,width=1280,height=720,framerate=30/1 ! "
            "jpegdec ! videoconvert ! xvimagesink name=sink sync=false";
        
        debug_print("Pipeline", "Trying with 720p");
        pipeline = gst_parse_launch(pipelineStr, &error);
        
        if (error) {
            debug_print("Pipeline", "Failed with 720p: " + std::string(error->message));
            g_clear_error(&error);
            
            // Fallback to test source as last resort
            pipelineStr = 
                "videotestsrc pattern=18 ! videoconvert ! "
                "xvimagesink name=sink sync=false";
            
            debug_print("Pipeline", "Falling back to test source");
            pipeline = gst_parse_launch(pipelineStr, &error);
            
            if (error) {
                debug_print("Pipeline", "All pipeline attempts failed");
                g_clear_error(&error);
                return 1;
            }
        }
    }
    
    debug_print("Pipeline", "Pipeline created successfully");
    
    // Set up the bus watch
    GstBus *bus = gst_pipeline_get_bus(GST_PIPELINE(pipeline));
    gst_bus_add_signal_watch(bus);
    g_signal_connect(bus, "message", G_CALLBACK(on_message), NULL);
    gst_object_unref(bus);
    
    // Get the sink and set window handle
    GstElement *sink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");
    if (sink && GST_IS_VIDEO_OVERLAY(sink)) {
        gst_video_overlay_set_window_handle(GST_VIDEO_OVERLAY(sink), window_handle);
        g_object_set(G_OBJECT(sink), "force-aspect-ratio", FALSE, NULL);
        gst_object_unref(sink);
    }
    
    // Start the pipeline
    GstStateChangeReturn ret = gst_element_set_state(pipeline, GST_STATE_PLAYING);
    if (ret == GST_STATE_CHANGE_FAILURE) {
        debug_print("Pipeline", "Failed to start pipeline");
        cleanup_and_quit();
        return 1;
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
    
    debug_print("Cleanup", "Quitting GTK main loop");
    gtk_main_quit();
}
