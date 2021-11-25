// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { isIPv4 } from 'net';
import * as vscode from 'vscode';
import { Terminal } from 'vscode';


//This that should be settings somewhere
let sshSetup : boolean = false; //this is only for me <-- This should be persistent per host connection
let termi : Terminal;
//#todo add support for multiple remote devicdees
let username : string;
let passcode : string;
let ip       : string;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log("VSCode extension remotepi is active");

	termi = vscode.window.createTerminal();



	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('remotepi.build3b+', () => {
		// termi.sendText("/opt/pi/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/ \\ bin/arm-linux-gnueabihf-gcc -static -x c - <<EOF #include <stdio.h> int main(void) { printf(\"Hello Cross Compiler!\n\"); return 0;	} EOF");
	});
	vscode.commands.registerCommand('remotepi.build4', () => {
		vscode.window.showErrorMessage("Not implemented");
	});

	vscode.commands.registerCommand("remotepi.setupNewRemote", async () => {
		
		//Check if a remote has been defined
		//#todo Support more than one remote
		//#todo Have persistent information
		if(username.length <= 0 && passcode.length <= 0 && ip.length <= 0) {
			getRemoteInfo();
		}
		
		if(isIPv4(ip as string) || (ip as string)?.length > 0){ 
			termi.show();
			
			//Setup a passcodeless login
			if(sshSetup !== true){
				vscode.window.showInformationMessage("Currently, the secure ssh connection requires user interaction with the terminal");
				// termi.sendText("echo setting up SSH key...");
				// termi.sendText("ssh-keygen -b 2048 -t rsa -f /tmp/sshkey -q -N \"" + passcode + "\" && ssh-copy-id -i /tmp/sshkey " + username + "@" + ip );
				// while(termi.state.isInteractedWith !== true){}; //wait for user interaction to finish the copy <-- This doesn't work, maybe because this command is async
			}
		}

	});

	//This is for opening a ssh connection for the user to use. Should not be used for scp
	vscode.commands.registerCommand('remotepi.connectssh', () => {
		
		//#todo Support more than one remote
		//#todo Have persistent information
		if(username.length <= 0 && passcode.length <= 0 && ip.length <= 0) {
			getRemoteInfo();
		}
		
		termi.show();
		termi.sendText(" ssh " + username + "@" + ip);
	});



	context.subscriptions.push(disposable);
}


export function getRemoteInfo()
{
	username = (vscode.window.showInputBox({
		ignoreFocusOut : true,
		prompt : 'Username for ssh...',
		placeHolder : 'Default : pi',
	}) as unknown) as string;
	username = (username?.length === 0 ? "pi" : username);

	passcode = (vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: 'Password for ssh...',
		placeHolder : 'Default : raspberry',
	}) as unknown) as string;
	passcode = (passcode?.length === 0 ? "978Raspberry.132" : passcode);

	ip = (vscode.window.showInputBox({
		ignoreFocusOut : true,
		prompt : 'Hostname of the remote pi...',
		placeHolder: 'Example : 192.168.137.112'
	})as unknown) as string;
	ip = (ip?.length === 0 ? "192.168.137.112" : ip);
}

// this method is called when your extension is deactivated
export function deactivate() {
	
}