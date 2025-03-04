CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -g
LDFLAGS = $(shell pkg-config --libs gtk+-3.0 gstreamer-1.0 gstreamer-video-1.0 webkit2gtk-4.0)
CPPFLAGS = $(shell pkg-config --cflags gtk+-3.0 gstreamer-1.0 gstreamer-video-1.0 webkit2gtk-4.0)

TARGET = video_app
SRCS = video_app.cpp

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)

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
		pkg-config

.PHONY: all clean run install-deps
