import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

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
const API_ENDPOINT = "https://habittrackerfordevs.com/api/activities";

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

  let disposable = vscode.commands.registerCommand('extension.commitAndPush', async () => {
    try {
        await commitAndPush();
        vscode.window.showInformationMessage('Successfully committed and pushed changes.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to commit and push: ${error instanceof Error ? error.message : String(error)}`);
    }
});

context.subscriptions.push(disposable);

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
    
    try {
      await commitAndPush();
      vscode.window.showInformationMessage('Successfully committed and pushed changes.');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to commit and push: ${error instanceof Error ? error.message : String(error)}`);
    }

    totalActiveMinutes = 0;
    secondsCounter = 0;
  }
}

function updateStatusBar() {
  statusBarItem.text = `${currentActivityName}: ${totalActiveMinutes}m ${secondsCounter}s`;
  statusBarItem.tooltip = "Click to change activity name";
  if (currentActivityName === "Coding") {
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

async function commitAndPush() {
  console.log('Starting commitAndPush function');

  try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
          throw new Error('Git extension not found');
      }
      console.log('Git extension found');

      const git = gitExtension.exports.getAPI(1);
      console.log('Git API version:', git.version);

      const repos = git.repositories;
      console.log('Number of repositories found:', repos.length);

      if (repos.length === 0) {
          throw new Error('No Git repository found in the current workspace');
      }

      const repo = repos[0];
      console.log('Using repository:', repo.rootUri.fsPath);

      // Ensure we're in a valid Git repository
      if (!repo.rootUri) {
          throw new Error('Invalid repository: rootUri is undefined');
      }

      // Stage all changes
      console.log('Staging changes');
      await repo.add([repo.rootUri.fsPath]);

      // Check if there are changes to commit
      if (repo.state.workingTreeChanges.length === 0 && repo.state.indexChanges.length === 0) {
          throw new Error('No changes to commit');
      }

      // Create commit message
      const commitMessage = `Update activity log: ${currentActivityName} for ${totalActiveMinutes} minutes`;
      console.log(`Using commit message: ${commitMessage}`);

      // Commit
      console.log('Committing changes');
      const commitResult = await repo.commit(commitMessage);
      console.log('Commit result:', commitResult);

      // Push
      console.log('Pushing changes');
      const pushResult = await repo.push();
      console.log('Push result:', pushResult);

  } catch (error) {
      console.error('Error in commitAndPush:', error);
      throw error; // Re-throw the error to be caught by the command handler
  }
}