// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { isIPv4 } from 'net';
import * as vscode from 'vscode';
import * as ssh2 from 'ssh2';




// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	console.log("VSCode extension remotepi is active");

	const conn = new ssh2.Client(); 

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('remotepi.build3b+', () => {
		vscode.window.showErrorMessage("Not implemented");
	});

	vscode.commands.registerCommand('remotepi.build4', () => {
		vscode.window.showErrorMessage("Not implemented");
	});

	vscode.commands.registerCommand('remotepi.connectssh', async () => {
	//https://www.npmjs.com/package/node-ssh


		let username = await vscode.window.showInputBox({
			ignoreFocusOut : true,
			prompt : 'Username for ssh...',
			placeHolder : 'Default : pi',
		});

		let passcode = await vscode.window.showInputBox({
			ignoreFocusOut: true,
			prompt: 'Password for ssh...',
			placeHolder : 'Default : raspberry',
		});

		let ip = await vscode.window.showInputBox({
			ignoreFocusOut : true,
			prompt : 'IPv4 Address of the remote pi...',
		});

		if(isIPv4(ip as string)){
			conn.on('ready', () => {
				console.log('Client :: ready');
				conn.shell((err, stream) => {
				  if (err) {throw err;}
				  stream.on('close', () => {
					console.log('Stream :: close');
					conn.end();
				  }).on('data', (data) => {
					console.log('OUTPUT: ' + data);
				  });
				  stream.end('ls -l\nexit\n');
				});
			  }).connect({
				host: ip as string,
				username: username as string,
				port: 22,
				password: passcode as string,
				tryKeyboard: true,
			  });
			
		}
			

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
