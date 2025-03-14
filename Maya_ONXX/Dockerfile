FROM nvcr.io/nvidia/deepstream:7.1-gc-triton-devel

# Set environment variables
ENV CUDA_VER=12.6

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    git \
    wget \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Install Ultralytics with dependencies
WORKDIR /root
RUN pip install -U pip && \
    git clone https://github.com/ultralytics/ultralytics && \
    cd ultralytics && \
    pip install -e ".[export]" onnxslim

# Clone DeepStream-Yolo
RUN git clone https://github.com/marcoslucianops/DeepStream-Yolo

# Copy export script
RUN cp /root/DeepStream-Yolo/utils/export_yoloV8.py /root/ultralytics/

# Download YOLOv8 model
WORKDIR /root/ultralytics
RUN wget https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11s.pt

# Export the model to ONNX
RUN python3 export_yoloV8.py -w yolo11s.pt --simplify

# Copy exported model to DeepStream-Yolo directory
RUN cp yolo11s.pt.onnx labels.txt /root/DeepStream-Yolo/

# Build the custom Yolo implementation
WORKDIR /root/DeepStream-Yolo
RUN make -C nvdsinfer_custom_impl_Yolo clean && make -C nvdsinfer_custom_impl_Yolo

# Setup the DeepStream configuration
RUN sed -i 's/custom-network-config=.*/custom-network-config=yolo11s.pt.onnx/' config_infer_primary_yoloV8.txt && \
    sed -i 's/labelfile-path=.*/labelfile-path=labels.txt/' config_infer_primary_yoloV8.txt && \
    sed -i 's/config-file=.*/config-file=config_infer_primary_yoloV8.txt/' deepstream_app_config.txt

# Set working directory
WORKDIR /root/DeepStream-Yolo

# Command to run when container starts - continue even if fails
CMD ["bash", "-c", "deepstream-app -c deepstream_app_config.txt || bash"]

#TODO ADD CLONE THESE
# https://github.com/NVIDIA-AI-IOT/deepstream_reference_apps
