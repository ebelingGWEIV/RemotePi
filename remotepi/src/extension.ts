// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { isIPv4 } from 'net';
import { stringify } from 'querystring';
import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { Client }  from 'ssh2';
import { ConnectConfig } from 'ssh2';
import { getVSCodeDownloadUrl } from '@vscode/test-electron/out/util';
import { fstat } from 'fs';

const homedir = require('os').homedir(); //This would be /home/user/ on linux
const remoteRunDir = "/home/pi/remotePi/"; //Where build files are sent to on the pi
let termi : Terminal = vscode.window.createTerminal();


interface RemoteInfo {
	host: string;
	hostName?: string;
	user?: string;
	port?: string;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log("VSCode extension remotepi is active");

	let cmake  = vscode.extensions.getExtension('ms-vscode.cmake-tools');
	let vscssh = vscode.extensions.getExtension('ms-vscode-remote.remote-ssh');


	// Activiate the Remote-SSH extension
	if ( vscssh?.isActive === false) {
		vscssh.activate().then(
			function() {
				console.log( "remote ssh extension has been activated ");
				
			},
			function() {
				console.log("remote-ssh activation failed");
			}
		);
	} 
	// Activiate the CMake-Tools extension
	if ( cmake?.isActive === false) {
		cmake.activate().then(
			function() {
				console.log( "cmake-tools has been activated ");
				
			},
			function() {
				console.log("cmake-tools activation failed");
			}
		);
	} 

	//Forward this command along to Remote-SSH
	let disposable = vscode.commands.registerCommand("remotepi.setupNewRemote", () => {
		vscode.commands.executeCommand('opensshremotesexplorer.add'); //opens the add a remote menu from Remote-SSH
	});

	//This is for opening a ssh connection for the user to use. Should not be used for scp
	vscode.commands.registerCommand('remotepi.runOnRemote', async () => {
		let remoteList : RemoteInfo[] = getRemoteList();
		console.log("first remote host: " + remoteList[0].host);
		
		const remoteHost = await remoteToUse(remoteList);

		let binaryPath = buildExists();
		if(binaryPath.length === 0)
		{
			vscode.window.showErrorMessage("No build available to be run on the remote device");
		}

		runOnRemote(remoteHost, binaryPath);	
	});
	
	/**
	 * All of the contents of this function are temporary and will only exist until a CMake kit is created to do this properly.
	 */
	vscode.commands.registerCommand('remotepi.setupCMake', () =>{
		//This could maybe happen within a init project command
		const fs = require('fs');
		const path = vscode.workspace.rootPath + "/CMakeLists.txt";
		const pathTool = vscode.workspace.rootPath + "/Toolchain-rpi.cmake";

		let found = false;
		let foundtool = false;
		// Determine if 
		try{
			const data = fs.readFileSync(path);
			if(data.length > 0){
				found = true;		
			}
			else{
				vscode.window.showInformationMessage("Did not create new CMakeLists.txt, one already exists.");
			}
		}
		catch{
		}
		try{
			const moreData = fs.readFileSync(pathTool);
			if(moreData.length > 0){
				foundtool = true;
			}	
			else
			{
				vscode.window.showInformationMessage("Did not create new Toolchain-rpi.cmake, one already exists.");

			}	
		}
		catch{}

		if(found === false)
		{
			runCommand(`
			echo "
			cmake_minimum_required (VERSION 3.0)

			# Name our project
			project (blink_example)

			# Create a variable that holds the path to our libwiringPi.so file
			set (WPI_PATH /opt/pi/WiringPi/wiringPi)

			# Add the local ‘include’ directory and the wiringPi directory to grab headers
			include_directories (include \\\${WPI_PATH})

			message("searching for wiringPi: \\\${WPI_PATH}")

			# Actually find the wiringPi library object
			find_library(WPI_LIB wiringPi HINTS \\\${WPI_PATH} NO_CMAKE_FIND_ROOT_PATH)

			# Alert the user if we do not find it
			if(NOT WPI_LIB)
			message(FATAL_ERROR "wiringPi library not found")
			endif()

			# Add all the *.c files in our source directory to our executable output
			FILE(GLOB SRC_FILES src/*.cpp)
			add_executable(blink_example \\\${SRC_FILES})

			# Link the pre-compiled wiringPi library to the executable we just declared 
			target_link_libraries(blink_example \\\${WPI_LIB})
			" > ` + path, false);
		}
		if(foundtool === false){
			runCommand(`
			echo "
			# message("starting tool chain")
			# Define our host system
			SET(CMAKE_SYSTEM_NAME Linux)
			SET(CMAKE_SYSTEM_VERSION 1)

			# Define the cross compiler locations
			SET(CMAKE_C_COMPILER   /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-gcc)
			SET(CMAKE_CXX_COMPILER /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++) #was gcc
			# Define the sysroot path for the RaspberryPi distribution in our tools folder 

			SET(CMAKE_FIND_ROOT_PATH /opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/arm-linux-gnueabihf/sysroot/)
			# Use our definitions for compiler tools

			SET(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)

			# Search for libraries and headers in the target directories only
			SET(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
			SET(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

			add_definitions(-Wall)
			# message("finished tool chain")
			" > ` + pathTool, false);
		}
		
	});

	context.subscriptions.push(disposable);
}


// dev helper function to dump all the command identifiers to the console
// helps if you cannot find the command id on github.
var findCommand = function(){
    vscode.commands.getCommands(true).then( 
        function(cmds){
            console.log("List of all available vs-code commands:");
        	console.log(cmds);
        },
        function() {
            console.log("failed to get vs-code commands");
            console.log(arguments);
        }
    );
};

// Read the information about remote devices added to the ssh config file
function getRemoteList(): RemoteInfo[] {
	
	const fs = require('fs');
	const path = require('path');
	let remoteList : RemoteInfo[] = [];

	let configPath = path.join(homedir, '.ssh', 'config');
	console.log('path to config: ' + configPath);

	try {
		const data = fs.readFileSync(configPath, 'utf8');
		
		var splitRemotes : string[] = data.split(/[\s\n]+/); //regular expression to split on space (\s) and newline (\n)

		let remoteNum =  -1;
		for(let i = 0; i < splitRemotes.length; i++)
		{
			let element = splitRemotes[i];
			let remote : RemoteInfo;
	
			switch(element){
				case 'Host':
					remoteNum++;
					// Create a new remote
					remote = { host: ''};
					remote.host = splitRemotes[i+1];
					// Add it to the list
					remoteList.push(remote);
					break;
				case 'HostName':
					remote = remoteList[remoteNum]; // Get the last remote
					remote.hostName = splitRemotes[i+1]; // Update HostName
					console.log("Current remote: " + remote);
					break;
				case 'User':
					remote = remoteList[remoteNum];
					remote.user = splitRemotes[i+1]; // Update User
					console.log("Current remote: " + remote);
					break;
				case 'Port':
					remote = remoteList[remoteNum];
					remote.port = splitRemotes[i+1]; // Update Port
					console.log("Current remote: " + remote);
					vscode.window.showWarningMessage("Port declared for host " + remote.host + "but ports are not supported by remotePi");
					break;
				default:
					console.log("invalid read from ssh/config: " + element);
					break;
			}
			// console.log("Remote list: \n" + remoteList);
		}
		// console.log(data);
	} catch (err) {
		vscode.window.showErrorMessage("Error reading ssh config file at " + configPath + "\n" + err);
	}

	return remoteList;
};

async function remoteToUse(remoteList: RemoteInfo[]) : Promise<RemoteInfo> {

	let host = await (vscode.window.showInputBox({
		ignoreFocusOut : true,
		prompt : 'Select SSH Remote',
		placeHolder: 'Example : ssh pi@192.168.1.39',
		value: remoteList[0].host,
		valueSelection: [0, remoteList[0].host.length] 
	})) as unknown as string;

	console.log("host value: " + host);

	let retr : RemoteInfo = {host: ""}; //create a returable with empty host

	remoteList.forEach(element => {
		if(element.hostName === host){
			retr = element;
		}
	});
	return retr;
}

//#todo Verify that a build has occured
function buildExists(): string {
	const fs = require('fs');
	const buildFile = "build/blink_example";
	return buildFile;
};

function runOnRemote(remote: RemoteInfo, filePath: string): boolean {
	const path = require('path');

	let remotePath = path.join(remoteRunDir, path.basename(filePath));

	let command = createSSHCommand(remote, "sudo mkdir -p " + remoteRunDir); //make directory if needed 
	command = command + "; " + createSSHCommand(remote, "sudo rm " + remotePath); //delete the old file to stop any current execution
	command = command + "; " + createSSHCommand(remote, "sudo chown " + remote.user + " " + remoteRunDir);
	command = command + "; " + createSCPCommand( remote, filePath); //copy in new file
	command = command + " && " + createSSHCommand(remote, "echo \"scp complete\"");
	command = command + " && " + createSSHCommand(remote, remotePath); //run new file

	runCommand(command, true);

	return true;
};

function createSSHCommand(remote: RemoteInfo, command: string) : string {
	return ("ssh " + remote.user + "@" + remote.hostName + " " + "\"" + command + "\"");
};

function createSCPCommand(remote: RemoteInfo, filePath: string) : string {
	return ("scp -l 8192 " + filePath + " " + remote.user + "@" + remote.hostName + ":" + remoteRunDir);
};

function runCommand (command : string, show?: boolean) : void {
	if(show === true) {
		termi.show();
	}
	else{
		termi.hide();
	}
	termi.sendText(command);
};


// this method is called when your extension is deactivated
export function deactivate() {
	
};