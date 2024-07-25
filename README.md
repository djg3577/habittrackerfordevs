# Habit Tracker for Devs

Habit Tracker for Devs is a VS Code extension that helps developers track their coding time and activities, promoting better time management and productivity.

## Features

- **Automatic Time Tracking**: The extension automatically tracks your active coding time in VS Code.
- **Activity Naming**: Easily name or change your current coding activity directly from the status bar.
- **Inactivity Detection**: Automatically pauses tracking after 1 minute of inactivity.
- **Status Bar Integration**: View your current activity and coding time directly in the VS Code status bar.
- **GitHub Authentication**: Securely authenticate using your GitHub account.
- **API Integration**: Automatically sends your activity data to a specified API endpoint.

## How It Works

1. The extension starts tracking your coding time as soon as you begin working in VS Code.
2. Your current activity and coding time are displayed in the status bar.
3. Click on the status bar item to change your current activity name.
4. If you're inactive for 1 minute, the tracker pauses automatically.
5. Resume coding, and the tracker starts again.
6. When you stop coding or VS Code is closed, your activity data is sent to the specified API.

## Requirements

- Visual Studio Code version 1.60.0 or higher
- A GitHub account for authentication
- Internet connection for API data submission

## Extension Settings

This extension doesn't currently add any VS Code settings.

## Known Issues

- The API endpoint is currently hardcoded. In future versions, this will be configurable.

## Release Notes

### 1.0.0

Initial release of Habit Tracker for Devs:
- Automatic time tracking
- Activity naming
- Inactivity detection
- Status bar integration
- GitHub authentication
- API integration

---

## Feedback and Contributions

If you have any feedback or would like to contribute to the development of this extension, please visit our [GitHub repository](https://github.com/yourusername/habittrackerfordevs).

**Enjoy tracking your coding habits!**