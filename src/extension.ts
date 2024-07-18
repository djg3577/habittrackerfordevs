import * as vscode from 'vscode';

let totalActiveMinutes = 0;
let lastActivityTime: Date | null = null;
let activeTimeInterval: NodeJS.Timeout | null = null;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let statusBarItem: vscode.StatusBarItem;
let isTracking = false;
let secondsCounter = 0;

const INACTIVITY_THRESHOLD = 5000; // 5 seconds in milliseconds
const API_ENDPOINT = 'http://localhost:8080/activities'; // Replace with your actual endpoint

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "habittrackerfordevs" is now active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(() => updateActivityTime()),
        vscode.window.onDidChangeTextEditorSelection(() => updateActivityTime()),
        vscode.window.onDidChangeWindowState((e) => {
            if (e.focused) {
                updateActivityTime();
            }
        })
    );

    startInactivityCheck();
    updateActivityTime();
}

function updateActivityTime() {
    lastActivityTime = new Date();
    if (!isTracking) {
        startTracking();
    }
}

function startTracking() {
    isTracking = true;
    vscode.window.showInformationMessage('Habit Tracker activated! Start coding!');
    
    if (!activeTimeInterval) {
        activeTimeInterval = setInterval(() => {
            secondsCounter++;
            if (secondsCounter === 60) {
                totalActiveMinutes++;
                secondsCounter = 0;
            }
            updateStatusBar();
        }, 1000);
    }
}

async function stopTracking() {
    isTracking = false;
    if (activeTimeInterval) {
        clearInterval(activeTimeInterval);
        activeTimeInterval = null;
    }
    vscode.window.showInformationMessage('Habit Tracker paused due to inactivity.');
    
    // Send API call only if there are minutes to report
    if (totalActiveMinutes > 0) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "user_id": 2,
                    "activity_name": "projectExtension",
                    "duration": totalActiveMinutes, // Send only whole minutes
                    "date": new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log('Successfully sent tracking data to API');
            totalActiveMinutes = 0; // Reset after successful send
            secondsCounter = 0;
        } catch (error) {
            console.error('Failed to send tracking data to API:', error);
            vscode.window.showErrorMessage('Failed to send tracking data to API:'+ error + JSON.stringify(error));
        }
    }
}

function updateStatusBar() {
    statusBarItem.text = `Active Time: ${totalActiveMinutes}m ${secondsCounter}s`;
    statusBarItem.show();
}

function startInactivityCheck() {
    if (!inactivityCheckInterval) {
        inactivityCheckInterval = setInterval(() => {
            if (lastActivityTime && new Date().getTime() - lastActivityTime.getTime() > INACTIVITY_THRESHOLD) {
                if (isTracking) {
                    stopTracking();
                }
            } else if (!isTracking && lastActivityTime) {
                startTracking();
            }
        }, 1000);
    }
}

export function deactivate() {
    if (activeTimeInterval) {
        clearInterval(activeTimeInterval);
    }
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
    }
    statusBarItem.hide();
    vscode.window.showInformationMessage(`Habit Tracker deactivated. Total active time: ${totalActiveMinutes}m`);
}