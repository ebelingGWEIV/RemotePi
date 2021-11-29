# Create the directory for storing the compilation tools
if [ -d "/opt/pi" ]
then
    echo "/opt/pi already exists"
else
    echo "creating /opt/pi"
    sudo mkdir /opt/pi
fi

echo "updating permissions for /top/pi"
sudo chown $(whoami) /opt/pi
cd /opt/pi

# Get the pi tools
if [ -d "./tools" ]
then
    echo "pi tools already exist"
else
    echo "getting pi tools"
    git clone https://github.com/raspberrypi/tools
fi

# Get wiring pi
if [ -d "./wiringpi" ]
then
    echo "wiring pi already exists"
else
    echo "getting wiring pi"
    git clone https://github.com/WiringPi/WiringPi.git
fi

# Get pigpio
# This one has less clear cross compile support