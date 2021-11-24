#!/bin/bash

# Download the tool chain for comppiling raspberry pi binaries
sudo mkdir /opt/pi
sudo chown $(whoami) /opt/pi
cd /opt/pi
git clone https://github.com/raspberrypi/tools

