cmake_minimum_required(VERSION 3.10)
project(video_overlay_app)

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK REQUIRED gtk+-3.0)
pkg_check_modules(GST REQUIRED gstreamer-1.0 gstreamer-video-1.0)

# Set CEF paths directly
set(CEF_ROOT "/home/aris/Desktop/Maya_CEF/cef_libs/cef_binary_133.4.5+gdb28106+chromium-133.0.6943.142_linux64")
set(CEF_WRAPPER_PATH "/home/aris/Desktop/Maya_CEF/cef_libs/build/libcef_dll_wrapper/libcef_dll_wrapper.a")
set(CEF_LIB_PATH "${CEF_ROOT}/Release/libcef.so")

# Include CEF CMake modules
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CEF_ROOT}/cmake")
include("${CEF_ROOT}/cmake/FindCEF.cmake")
include("${CEF_ROOT}/cmake/cef_variables.cmake")

# Add the source files
set(SOURCE_FILES
    video_app_cef.cpp
)

# Create the executable
add_executable(video_overlay_app ${SOURCE_FILES})

# Add compiler flags
target_compile_features(video_overlay_app PRIVATE cxx_std_17)

# Include directories
target_include_directories(video_overlay_app PRIVATE 
    ${GTK_INCLUDE_DIRS}
    ${GST_INCLUDE_DIRS}
    ${CEF_ROOT}
    ${CEF_ROOT}/include
)

# Link libraries
target_link_libraries(video_overlay_app
    ${GTK_LIBRARIES}
    ${GST_LIBRARIES}
    ${CEF_LIB_PATH}
    ${CEF_WRAPPER_PATH}
)

# Copy CEF resources
add_custom_command(
    TARGET video_overlay_app
    POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CEF_ROOT}/Resources"
            "$<TARGET_FILE_DIR:video_overlay_app>"
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CEF_ROOT}/Release"
            "$<TARGET_FILE_DIR:video_overlay_app>"
)
