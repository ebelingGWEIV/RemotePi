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

//This that should be settings somewhere
let termi : Terminal;
//#todo add support for multiple remote devicdees
const homedir = require('os').homedir();
const remoteRunDir = "~/remotePi/";

interface remoteInfo {
	Host: string;
	HostName?: string;
	User?: string;
	Port?: string;
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
				console.log("Extension activation failed");
			}
		);
	} 

	//Forward this command along to Remote-SSH
	let disposable = vscode.commands.registerCommand("remotepi.setupNewRemote", () => {
		vscode.commands.executeCommand('opensshremotesexplorer.add'); //opens the add a remote menu from Remote-SSH
	});

	//This is for opening a ssh connection for the user to use. Should not be used for scp
	vscode.commands.registerCommand('remotepi.runOnRemote', () => {
		// vscode.commands.executeCommand('opensshremotes.addNewSshHost'); //Has he user add a new host to the config file
		// vscode.commands.executeCommand('opensshremotes.settings'); //opens the settings page
		// vscode.commands.executeCommand('opensshremotesexplorer.add'); //opens the add a remote menu from Remote-SSH
		let remoteList : remoteInfo[] = getRemoteList();
		console.log("first remote host: " + remoteList[0].Host);
		let hostname = (vscode.window.showInputBox({
			ignoreFocusOut : true,
			prompt : 'Select SSH Remote',
			placeHolder: 'Example : ssh pi@192.168.1.39',
			value: remoteList[0].Host,
			valueSelection: [0, remoteList[0].Host.length] 
		})) as unknown as string;

		let remoteHost = remoteToUse(remoteList, hostname);

		let binaryPath = buildExists();
		if(binaryPath.length === 0)
		{
			vscode.window.showErrorMessage("No build available to be run on the remote device");
		}

		runOnRemote(remoteHost, binaryPath);

		
	});
	
	vscode.commands.registerCommand('remotepi.configureCMake', () =>{
		//This could maybe happen within a init project command
		if(cmake)
		{
			vscode.window.showInformationMessage("conifguring cmake");
			
			//This might be the wrong command, configureArgs could be better
			vscode.commands.executeCommand("cmake.configureSettings", "-DCMAKE_TOOLCHAIN_FILE=Toolchain-rpi.cmake");
			vscode.window.showInformationMessage("conifguring complete");

		}
		else{
			vscode.window.showInformationMessage("no cmake found");
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
let getRemoteList = function(): remoteInfo[] {
	
	const fs = require('fs');
	const path = require('path');
	let remoteList : remoteInfo[] = [];

	let configPath = path.join(homedir, '.ssh', 'config');
	console.log('path to config: ' + configPath);

	try {
		const data = fs.readFileSync(configPath, 'utf8');
		
		var splitRemotes : string[] = data.split(/[\s\n]+/); //regular expression to split on space (\s) and newline (\n)

		let remoteNum =  -1;
		for(let i = 0; i < splitRemotes.length; i++)
		{
			let element = splitRemotes[i];
			let remote : remoteInfo;
	
			switch(element){
				case 'Host':
					remoteNum++;
					// Create a new remote
					remote = { Host: ''};
					remote.Host = splitRemotes[i+1];
					// Add it to the list
					remoteList.push(remote);
					break;
				case 'HostName':
					remote = remoteList[remoteNum]; // Get the last remote
					remote.HostName = splitRemotes[i+1]; // Update HostName
					console.log("Current remote: " + remote);
					break;
				case 'User':
					remote = remoteList[remoteNum];
					remote.User = splitRemotes[i+1]; // Update User
					console.log("Current remote: " + remote);
					break;
				case 'Port':
					remote = remoteList[remoteNum];
					remote.Port = splitRemotes[i+1]; // Update Port
					console.log("Current remote: " + remote);
					vscode.window.showWarningMessage("Port declared for host " + remote.Host + "but ports are not supported by remotePi");
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

let remoteToUse = function(remoteList: remoteInfo[], hostname: string) : remoteInfo {
	let retr : remoteInfo = {Host: ""}; //create a returable with empty host

	remoteList.forEach(element => {
		if(element.HostName === hostname){
			retr = element;
		}
	});
	return retr;
}

//#todo Verify that a build has occured
let buildExists = function(): string {
	const fs = require('fs');

	return "";
};

let runOnRemote = function(remote: remoteInfo, filePath: string): boolean {
	const path = require('path');
	let remotePath = path.join(remoteRunDir, "/", path.basename(filePath));

	let command = createSSHCommand(remote, "sudo mkdir " + remoteRunDir); //make directory if needed 
	command = command + " && " + createSSHCommand(remote, "sudo rm " + remotePath); //delete old file
	command = command + " && " + createSCPCommand( remote, filePath); //copy in new file
	command = command + " && " + createSSHCommand(remote, "sudo " + remotePath); //run new file

	return true;
};

let createSSHCommand = function(remote: remoteInfo, command: string) : string {
	return ("ssh " + remote.User + "@" + remote.HostName + " " + command);
};

let createSCPCommand = function(remote: remoteInfo, filePath: string) : string {
	return ("scp " + filePath + " " + remote.User + "@" + remote.HostName + ":" + remoteRunDir);
};

// this method is called when your extension is deactivated
export function deactivate() {
	
};