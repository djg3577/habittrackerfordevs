import * as vscode from "vscode";

let totalActiveMinutes = 0;
let lastActivityTime: Date | null = null;
let activeTimeInterval: NodeJS.Timeout | null = null;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let statusBarItem: vscode.StatusBarItem;
let isTracking = false;
let secondsCounter = 0;
let authToken: string | null = null;
let previousActivityName: string | undefined;
let currentActivityName: string = previousActivityName || "Coding";

const INACTIVITY_THRESHOLD = 1000 * 60; // 1 minute is 60*1000 milliseconds
const API_ENDPOINT = "https://habittrackerfordevs.com/activities";
export async function activate(context: vscode.ExtensionContext) {
  const session = await vscode.authentication.getSession(
    "github",
    ["user:email"],
    { createIfNone: true }
  );
  if (session) {
    authToken = session.accessToken;
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
        previousActivityName = newActivityName;
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
    if (!authToken) {
      const session = await vscode.authentication.getSession(
        "github",
        ["user:email"],
        { createIfNone: true }
      );
      if (session) {
        authToken = session.accessToken;
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

    totalActiveMinutes = 0;
    secondsCounter = 0;
  }
}

function updateStatusBar() {
  statusBarItem.text = `${currentActivityName}: ${totalActiveMinutes}m ${secondsCounter}s`;
  statusBarItem.tooltip = "Click to change activity name";
  if(currentActivityName === "Coding") {
  statusBarItem.command = "habittrackerfordevs.changeActivityName";
  }
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
