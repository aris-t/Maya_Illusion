CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -g
LDFLAGS = $(shell pkg-config --libs gtk+-3.0 gstreamer-1.0 gstreamer-video-1.0 webkit2gtk-4.0)
CPPFLAGS = $(shell pkg-config --cflags gtk+-3.0 gstreamer-1.0 gstreamer-video-1.0 webkit2gtk-4.0)

SRC_DIR = src/cpp
BUILD_DIR = build
TARGET = $(BUILD_DIR)/video_app
SRCS = $(SRC_DIR)/video_app.cpp

.PHONY: all clean run install-deps build-react

all: $(TARGET)

$(TARGET): $(SRCS) | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -o $@ $^ $(LDFLAGS)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

clean:
	rm -rf $(BUILD_DIR)
	rm -rf src/web-overlay/build
	rm -rf src/web-overlay/node_modules

build-react:
	cd src/web-overlay && npm install && npm run build
	mkdir -p $(BUILD_DIR)/web-overlay
	cp -r src/web-overlay/build/* $(BUILD_DIR)/web-overlay/

build-all: build-react $(TARGET)

run: $(TARGET)
	cd $(BUILD_DIR) && ./video_app

install-deps:
	apt-get update && apt-get install -y \
		build-essential \
		libgtk-3-dev \
		libgstreamer1.0-dev \
		libgstreamer-plugins-base1.0-dev \
		gstreamer1.0-plugins-good \
		gstreamer1.0-plugins-bad \
		gstreamer1.0-plugins-ugly \
		libwebkit2gtk-4.0-dev \
		pkg-config \
		nodejs \
		npm
