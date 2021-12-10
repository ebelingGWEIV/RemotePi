# RemotePi

Developing on a raspberry pi can be a frustrating chore that takes more time than software development on other platforms. To improve development time, an extension was developed for Visual Studio Code (VSCode) that will allow simplifying cross-compiling C/C++ projects for the ARM x32 Raspbian OS from a Linux x86 OS. The extension also automates copying the binary to the raspberry pi, as well as running that binary file. 

How to Setup for use
1.	Install VSCode on your Linux Distro of Choice. Ubuntu 21 was tested thus is recommended. Then, install the extensions: Remote-SSH extension pack, CMake, and CMake-Tools. 

2.	Clone the repository to a Linux machine.

```git clone https://github.com/ebelingGWEIV/RemotePi.git```

3.	Then run the setup script from the remotePi repository. This will download pi-tools and WiringPi. It will also set up CMake and build WiringPi for cross-compiling.
sh setup.sh

4.	Since the extension is not available for download in the VSCode extension marketplace yet, it must be debugged to be used. Follow this guide for getting an extension development setup.

```https://code.visualstudio.com/api/get-started/your-first-extension ```

5.	Run the extension by hitting F5 within the RemotePi workspace and extension.ts open. In the window that opens, select a new workspace and open the project you would like to use. 
6.	Run the Remote Pi command for setting up a project for being cross-compiled. Open this menu with CTRL + SHIFT + P

Select: ```RPi: Setup CMake to cross compile```

7.	Open the VSCode workspace for the project that you would like to use the extension within. Open the settings for CMake-Tools and add this configuration argument.

```-DCMAKE_TOOLCHAIN_FILE=Toolchain-rpi.cmake```
 

8.	Build CMake

 
9.	Setup a new remote

Select command: ```RPi: Add a new remote device```
 
10.	Run on remote

Select command: ```Run last build on remote```
 
