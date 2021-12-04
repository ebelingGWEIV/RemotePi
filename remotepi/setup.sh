# Create the directory for storing the compilation tools
CURRENT_DIR=$(pwd)

echo "This script can be rerun, to complete any failed tasks. Completed tasks will be skipped."


BASE_DIR=/opt/pi
if [ -d "$BASE_DIR" ]
then
    echo "$BASE_DIR already exists"
else
    echo "creating $BASE_DIR"
    sudo mkdir $BASE_DIR
fi

echo "updating permissions for $BASE_DIR"
sudo chown $(whoami) $BASE_DIR
cd $BASE_DIR

# Get the pi tools
PI_TOOLS=$BASE_DIR/tools
if [ -d "$PI_TOOLS" ]
then
    echo "$PI_TOOLS already exist"
else
    echo "getting pi tools"
    git clone https://github.com/raspberrypi/tools
fi

# Get wiring pi
WIRING_PI=$BASE_DIR/WiringPi
if [ -d "$WIRING_PI" ]
then
    echo "$WIRING_PI already exists"
else
    echo "getting wiring pi"
    git clone https://github.com/WiringPi/WiringPi.git
fi

# Add the cmake file for wiring pi
WIRING_CMAKE=$WIRING_PI/wiringPi/CMakeLists.txt
WIRING_TOOLCHAIN=$WIRING_PI/wiringPi/Toolchain-rpi.cmake
if [ -f "$WIRING_CMAKE" ]
then
    echo "CMakeLists.txt for cross compiling wiring pi already exists"
    echo "Note: If you wish to rebuild, delete all CMake files and directories within $WIRING_PI/wiringPi before running this again"
else
    echo "Creating CMakeLists.txt for cross compiling wiring pi"

    # Create the file
    touch $WIRING_CMAKE

    # Add contents to the file
echo "
cmake_minimum_required(VERSION 3.0)
# Have CMake find our pthreads library within our toolchain (required for this library)
set(CMAKE_THREAD_PREFER_PTHREAD TRUE)
find_package(Threads REQUIRED)
# add all the *.c files as sources
FILE(GLOB SRC_FILES *.c)
# make this output a shared library (with .so output)
add_library (wiringPi SHARED \${SRC_FILES})
# be sure to include the current source directory for header files
target_include_directories (wiringPi PUBLIC \${CMAKE_CURRENT_SOURCE_DIR})
# add the following required libraries:
# Threads, Math, Crypt, and RealTime
target_link_libraries(wiringPi \${CMAKE_THREAD_LIBS_INIT} crypt m rt)" > $WIRING_CMAKE

echo "
# message(\"starting tool chain\")
# Define our host system
SET(CMAKE_SYSTEM_NAME Linux)
SET(CMAKE_SYSTEM_VERSION 1)

# Define the cross compiler locations
SET(CMAKE_C_COMPILER   /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-gcc)
SET(CMAKE_CXX_COMPILER /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-gcc) #was gcc
# Define the sysroot path for the RaspberryPi distribution in our tools folder 

SET(CMAKE_FIND_ROOT_PATH /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/arm-linux-gnueabihf/sysroot/)
# Use our definitions for compiler tools

SET(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)

# Search for libraries and headers in the target directories only
SET(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
SET(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

add_definitions(-Wall)
# message(\"finished tool chain\")" > $WIRING_TOOLCHAIN 

    echo "Building the Wiring Pi library"
    # Move directories to make these commands a bit simpler
    cd $WIRING_PI/wiringPi
    cmake . -DCMAKE_TOOLCHAIN_FILE=Toolchain-rpi.cmake
    make

    echo "Please manually verify that there are no warnings other than pointer size warnings"
fi
# Return to the base directory
cd $BASE_DIR


# Get pigpio
# This one has less clear cross compile support
