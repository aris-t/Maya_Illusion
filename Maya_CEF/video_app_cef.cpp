#include <gtk/gtk.h>
#include <gdk/gdkx.h>
#include <gst/gst.h>
#include <gst/video/videooverlay.h>
#include <iostream>
#include <string>
#include <filesystem>
#include <unistd.h>
#include <cef_app.h>
#include <cef_client.h>
#include <cef_render_handler.h>
#include <cef_browser.h>
#include <cef_life_span_handler.h>
#include <cef_load_handler.h>
#include <cef_display_handler.h>

// Global variables
GstElement *pipeline = nullptr;
GtkWidget *videoWindow = nullptr;
GtkWidget *overlayWindow = nullptr;
CefRefPtr<CefBrowser> browser = nullptr;

// Forward declarations
static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer data);
static void on_message(GstBus *bus, GstMessage *message, gpointer data);
static void cleanup_and_quit();

// Debug helper function
void debug_print(const std::string& prefix, const std::string& message) {
    std::cout << "[DEBUG] " << prefix << ": " << message << std::endl;
}

// CEF implementation classes
class RenderHandler : public CefRenderHandler {
public:
    RenderHandler(GtkWidget* window) : window_(window) {}

    // CEF wants to know the view rectangle
    void GetViewRect(CefRefPtr<CefBrowser> browser, CefRect &rect) override {
        GtkAllocation allocation;
        gtk_widget_get_allocation(window_, &allocation);
        rect.x = 0;
        rect.y = 0;
        rect.width = allocation.width;
        rect.height = allocation.height;
        
        debug_print("RenderHandler", "GetViewRect: " + std::to_string(allocation.width) + "x" + 
                   std::to_string(allocation.height));
    }

    // CEF calls this when there is a new frame to render
    void OnPaint(CefRefPtr<CefBrowser> browser, PaintElementType type, 
                 const RectList &dirtyRects, const void *buffer, 
                 int width, int height) override {
        // Handle the painting to GTK
        if (type == PET_VIEW) {
            // This is where you'd draw to your GTK window
            // For transparency, you'd use Cairo with RGBA surface
            cairo_surface_t *surface = cairo_image_surface_create_for_data(
                (unsigned char*)buffer,
                CAIRO_FORMAT_ARGB32,
                width, height,
                width * 4);
                
            // Get a Cairo context for the window
            cairo_t *cr = gdk_cairo_create(gtk_widget_get_window(window_));
            cairo_set_source_surface(cr, surface, 0, 0);
            cairo_paint(cr);
            
            // Clean up
            cairo_destroy(cr);
            cairo_surface_destroy(surface);
        }
    }

    IMPLEMENT_REFCOUNTING(RenderHandler);

private:
    GtkWidget* window_;
};

// Display handler to capture console messages
class DisplayHandler : public CefDisplayHandler {
public:
    DisplayHandler() {}

    // Handle console messages
    bool OnConsoleMessage(CefRefPtr<CefBrowser> browser,
                         cef_log_severity_t level,
                         const CefString& message,
                         const CefString& source,
                         int line) override {
        debug_print("Console", message.ToString() + " (" + source.ToString() + ":" + std::to_string(line) + ")");
        return false;  // Allow default handling
    }

    IMPLEMENT_REFCOUNTING(DisplayHandler);
};

// Load handler to handle page loading events
class LoadHandler : public CefLoadHandler {
public:
    LoadHandler() {}

    void OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                             bool isLoading,
                             bool canGoBack,
                             bool canGoForward) override {
        if (!isLoading) {
            debug_print("LoadHandler", "Page loaded completely");
            // Execute JavaScript to diagnose React and page issues
            CefRefPtr<CefFrame> frame = browser->GetMainFrame();
            if (frame) {
                frame->ExecuteJavaScript(
                    "console.log('DOCUMENT:', {"
                    "  title: document.title,"
                    "  readyState: document.readyState,"
                    "  body: document.body ? 'exists' : 'missing',"
                    "  head: document.head ? 'exists' : 'missing',"
                    "  scripts: document.getElementsByTagName('script').length,"
                    "  hasReact: typeof React !== 'undefined',"
                    "  hasReactDOM: typeof ReactDOM !== 'undefined'"
                    "});"
                    "if (document.body) {"
                    "  console.log('BODY HTML:', document.body.innerHTML);"
                    "}", 
                    frame->GetURL(), 0);
            }
        }
    }

    void OnLoadError(CefRefPtr<CefBrowser> browser,
                    CefRefPtr<CefFrame> frame,
                    ErrorCode errorCode,
                    const CefString& errorText,
                    const CefString& failedUrl) override {
        debug_print("LoadError", "Error loading " + failedUrl.ToString() + ": " + errorText.ToString());
    }

    IMPLEMENT_REFCOUNTING(LoadHandler);
};

class BrowserClient : public CefClient, public CefLifeSpanHandler {
public:
    BrowserClient(CefRefPtr<CefRenderHandler> renderHandler)
        : renderHandler_(renderHandler),
          displayHandler_(new DisplayHandler()),
          loadHandler_(new LoadHandler()) {}

    // Return the render handler
    CefRefPtr<CefRenderHandler> GetRenderHandler() override {
        return renderHandler_;
    }

    // Return the display handler
    CefRefPtr<CefDisplayHandler> GetDisplayHandler() override {
        return displayHandler_;
    }

    // Return the load handler
    CefRefPtr<CefLoadHandler> GetLoadHandler() override {
        return loadHandler_;
    }
    
    bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) override {
        debug_print("CEF", "Process message received: " + message->GetName().ToString());
        return false; // Allow default handling
    }

    // Return the life span handler (this)
    CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { 
        return this; 
    }

    // Called when browser is created
    void OnAfterCreated(CefRefPtr<CefBrowser> browser) override {
        debug_print("CEF", "Browser created");
        // Store the browser reference
        browser_ = browser;
    }

    // Called when browser is closing
    void OnBeforeClose(CefRefPtr<CefBrowser> browser) override {
        debug_print("CEF", "Browser closing");
        browser_ = nullptr;
    }

    // Method to get the browser
    CefRefPtr<CefBrowser> GetBrowser() { return browser_; }

    IMPLEMENT_REFCOUNTING(BrowserClient);

private:
    CefRefPtr<CefRenderHandler> renderHandler_;
    CefRefPtr<CefDisplayHandler> displayHandler_;
    CefRefPtr<CefLoadHandler> loadHandler_;
    CefRefPtr<CefBrowser> browser_;
};

// CEF App implementation
class BrowserApp : public CefApp, public CefBrowserProcessHandler {
public:
    BrowserApp() {}

    CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
        return this;
    }

    void OnContextInitialized() override {
        debug_print("CEF", "Context initialized");
    }

    IMPLEMENT_REFCOUNTING(BrowserApp);
};

// Main application
int main(int argc, char *argv[]) {
    debug_print("Init", "Starting application");
    
    // Initialize CEF
    CefMainArgs args(argc, argv);
    CefRefPtr<BrowserApp> app(new BrowserApp());
    
    // Execute CEF process if needed (for sub-processes)
    int exit_code = CefExecuteProcess(args, app, nullptr);
    if (exit_code >= 0) {
        return exit_code;
    }
    
    // Initialize GTK and GStreamer
    gst_init(&argc, &argv);
    gtk_init(&argc, &argv);
    
    // CEF settings
    CefSettings settings;
    settings.no_sandbox = true;
    settings.windowless_rendering_enabled = true;
    settings.background_color = 0;  // Transparent
    settings.log_severity = LOGSEVERITY_VERBOSE; // Enable verbose logging
    
    // Initialize CEF with current working directory for resources
    std::string currentPath = std::filesystem::current_path().string();
    CefString(&settings.resources_dir_path) = currentPath.c_str();
    
    // Initialize CEF
    bool cef_initialized = CefInitialize(args, settings, app, nullptr);
    if (!cef_initialized) {
        debug_print("CEF", "Failed to initialize CEF");
        return 1;
    }
    
    debug_print("CEF", "CEF initialized successfully");
    
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
    
    // Get the current directory for the HTML file
    std::string htmlPath = "file://" + currentPath + "/web-overlay/index.html";
    debug_print("CEF", "Loading HTML from: " + htmlPath);
    
    // Create the CEF render handler
    CefRefPtr<RenderHandler> renderHandler(new RenderHandler(overlayWindow));
    
    // Create the browser client
    CefRefPtr<BrowserClient> browserClient(new BrowserClient(renderHandler));
    
    // Browser settings for transparency
    CefBrowserSettings browserSettings;
    browserSettings.background_color = CefColorSetARGB(0, 0, 0, 0); // Transparent
    
    // Create the browser window
    CefWindowInfo windowInfo;
    windowInfo.SetAsWindowless(0); // No parent window
    
    // Create the browser
    browser = CefBrowserHost::CreateBrowserSync(
        windowInfo, 
        browserClient.get(), 
        htmlPath.c_str(), 
        browserSettings, 
        nullptr, 
        nullptr);
        
    debug_print("CEF", "Browser creation result: " + std::string(browser ? "success" : "failure"));
    
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
    
    // After 2 seconds, execute JavaScript to verify React loading
    g_timeout_add(2000, [](gpointer data) -> gboolean {
        if (browser) {
            CefRefPtr<CefFrame> frame = browser->GetMainFrame();
            if (frame) {
                // Execute JavaScript to check React status
                frame->ExecuteJavaScript(
                    "console.log('React status check:', "
                    "window.React ? 'React is loaded' : 'React is NOT loaded');"
                    "console.log('Document ready state:', document.readyState);",
                    frame->GetURL(), 0);
            }
        }
        return FALSE;  // Don't repeat
    }, nullptr);
    
    // Create a timer to handle CEF message loop
    g_timeout_add(10, [](gpointer data) -> gboolean {
        CefDoMessageLoopWork();
        return TRUE;  // Continue the timer
    }, nullptr);
    
    // Run the GTK main loop
    gtk_main();
    
    // Shutdown CEF
    CefShutdown();
    
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
    
    // Close the browser
    if (browser) {
        browser->GetHost()->CloseBrowser(true);
        browser = nullptr;
    }
    
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
