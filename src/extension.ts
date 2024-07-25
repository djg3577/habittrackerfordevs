import * as vscode from "vscode";

let totalActiveMinutes = 0;
let lastActivityTime: Date | null = null;
let activeTimeInterval: NodeJS.Timeout | null = null;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let statusBarItem: vscode.StatusBarItem;
let isTracking = false;
let secondsCounter = 0;
let authToken: string | null = null;
let currentActivityName: string = "Coding";

const INACTIVITY_THRESHOLD = 60 * 1000; // 1 minute
const API_ENDPOINT = "http://localhost:8080/activities"; // Replace with your actual endpoint

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "habittrackerfordevs" is now active!');

  // Attempt to get GitHub authentication
  try {
    const session = await vscode.authentication.getSession(
      "github",
      ["user:email"],
      { createIfNone: true }
    );
    if (session) {
      authToken = session.accessToken;
      console.log("Successfully authenticated with GitHub");
    } else {
      console.log("No existing GitHub session found");
    }
  } catch (err) {
    console.error("Failed to get GitHub session:", err);
  }

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "habittrackerfordevs.changeActivityName",
      async () => {
        const newActivityName = await vscode.window.showInputBox({
          prompt: "What are you working on?",
          placeHolder: "Enter activity name",
          value: currentActivityName,
        });

        if (newActivityName) {
          currentActivityName = newActivityName;
          updateStatusBar();
          vscode.window.showInformationMessage(
            `Activity changed to: ${currentActivityName}`
          );
        }
      }
    )
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
  vscode.window.showInformationMessage(
    `Habit Tracker activated! Start coding on: ${currentActivityName}`
  );

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
  vscode.window.showInformationMessage(
    "Habit Tracker paused due to inactivity."
  );

  if (totalActiveMinutes > 0) {
    try {
      if (!authToken) {
        // If no auth token, try to get one
        const session = await vscode.authentication.getSession(
          "github",
          ["user:email"],
          { createIfNone: true }
        );
        if (session) {
          authToken = session.accessToken;
        } else {
          throw new Error("Unable to authenticate with GitHub");
        }
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activity_name: currentActivityName,
          duration: totalActiveMinutes,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Successfully sent tracking data to API");
      totalActiveMinutes = 0;
      secondsCounter = 0;
    } catch (error) {
      console.error("Failed to send tracking data to API:", error);
      vscode.window.showErrorMessage(
        "Failed to send tracking data to API: " + error
      );
    }
  }
}

function updateStatusBar() {
  statusBarItem.text = `${currentActivityName}: ${totalActiveMinutes}m ${secondsCounter}s`;
  statusBarItem.tooltip = "Click to change activity name";
  statusBarItem.command = "habittrackerfordevs.changeActivityName";
  statusBarItem.show();
}

function startInactivityCheck() {
  if (!inactivityCheckInterval) {
    inactivityCheckInterval = setInterval(() => {
      if (
        lastActivityTime &&
        new Date().getTime() - lastActivityTime.getTime() > INACTIVITY_THRESHOLD
      ) {
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
  vscode.window.showInformationMessage(
    `Habit Tracker deactivated. Total active time: ${totalActiveMinutes}m`
  );
}
