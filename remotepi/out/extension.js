"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const net_1 = require("net");
const vscode = require("vscode");
//This that should be settings somewhere
let sshSetup = false; //this is only for me <-- This should be persistent per host connection
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    console.log("VSCode extension remotepi is active");
    let termi = vscode.window.createTerminal();
    //#todo add support for multiple remote devicdees
    let username;
    let passcode;
    let ip;
    // The command has been defined in the package.json file
    let disposable = vscode.commands.registerCommand('remotepi.build3b+', () => {
        vscode.window.showErrorMessage("Not implemented");
    });
    vscode.commands.registerCommand('remotepi.build4', () => {
        vscode.window.showErrorMessage("Not implemented");
    });
    vscode.commands.registerCommand("remotepi.setupNewRemote", async () => {
        username = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Username for ssh...',
            placeHolder: 'Default : pi',
        });
        username = (username?.length === 0 ? "pi" : username);
        passcode = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Password for ssh...',
            placeHolder: 'Default : raspberry',
        });
        passcode = (passcode?.length === 0 ? "978Raspberry.132" : passcode);
        ip = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Hostname of the remote pi...',
            placeHolder: 'Example : 192.168.137.224'
        });
        ip = (ip?.length === 0 ? "192.168.137.224" : ip);
        if ((0, net_1.isIPv4)(ip) || ip?.length > 0) {
            termi.show();
            //Setup a passcodeless login
            if (sshSetup !== true) {
                termi.sendText("echo setting up SSH key...");
                termi.sendText("ssh-keygen -b 2048 -t rsa -f /tmp/sshkey -q -N \"" + passcode + "\" && ssh-copy-id -i /tmp/sshkey " + username + "@" + ip, false);
                // while(termi.state.isInteractedWith !== true){}; //wait for user interaction to finish the copy <-- This doesn't work, maybe because this command is async
            }
        }
    });
    vscode.commands.registerCommand('remotepi.connectssh', () => {
        termi.show();
        termi.sendText(" ssh " + username + "@" + ip);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map