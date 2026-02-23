# Vintage Radio - Build & Release Guide

This guide explains how to build and release the Vintage Radio desktop application.

## Version Management

The application version is managed in the root `package.json` file. Update the version number before creating a release:

```json
{
  "version": "1.0.0"
}
```

## Building Locally

### Prerequisites
- Node.js 20+
- npm

### Development Build

1. Build the web app:
```bash
npm install
npm run build
```

2. Install Electron dependencies:
```bash
cd electron
npm install
```

3. Package for your platform:

**macOS:**
```bash
npm run package:mac
```

**Windows:**
```bash
npm run package:win
```

**Linux:**
```bash
npm run package:linux
```

**All platforms:**
```bash
npm run package:all
```

Built files will be in `electron/dist/`.

## GitHub Actions Release

The project includes a GitHub Actions workflow that automatically builds and releases the desktop app for all platforms (Windows, macOS, Linux).

### Automated Release (Tag-based)

1. Update the version in `package.json`:
```bash
# Edit package.json, change "version": "1.0.0" to your new version
```

2. Commit and push your changes:
```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git push
```

3. Create and push a version tag:
```bash
git tag v1.0.1
git push origin v1.0.1
```

4. The GitHub Action will automatically:
   - Build the app for Windows, macOS, and Linux
   - Create a GitHub Release with all binaries
   - Attach the built files to the release

### Manual Trigger

You can also manually trigger a build without creating a release:

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Select "Build and Release Desktop App" workflow
4. Click "Run workflow" button
5. Choose the branch and click "Run workflow"

This will build the app and upload the artifacts (without creating a release).

## Release Files

After a successful build, the following files will be available:

### macOS
- `Vintage Radio-{version}-x64.dmg` - Intel Mac installer
- `Vintage Radio-{version}-arm64.dmg` - Apple Silicon installer
- `Vintage Radio-{version}-x64.zip` - Intel Mac portable
- `Vintage Radio-{version}-arm64.zip` - Apple Silicon portable

### Windows
- `Vintage Radio-Setup-{version}.exe` - Windows installer (64-bit)
- `Vintage Radio-Setup-{version}.exe` - Windows installer (32-bit)
- `Vintage Radio-{version}.exe` - Portable version

### Linux
- `Vintage Radio-{version}.AppImage` - Universal Linux binary
- `vintage-radio_{version}_amd64.deb` - Debian/Ubuntu package
- `vintage-radio-{version}.x86_64.rpm` - Red Hat/Fedora package

## Quick Release Script

Here's a bash script to automate the release process:

```bash
#!/bin/bash
# release.sh - Quick release script

if [ -z "$1" ]; then
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh 1.0.1"
  exit 1
fi

VERSION=$1

echo "Updating version to $VERSION..."
npm version $VERSION --no-git-tag-version

echo "Committing changes..."
git add package.json
git commit -m "Release version $VERSION"

echo "Creating tag..."
git tag v$VERSION

echo "Pushing to GitHub..."
git push
git push origin v$VERSION

echo "✅ Release $VERSION triggered!"
echo "Check GitHub Actions for build progress: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
```

Make it executable:
```bash
chmod +x release.sh
```

Use it:
```bash
./release.sh 1.0.1
```

## Workflow Configuration

The workflow is configured in `.github/workflows/build-release.yml`.

### Triggers
- **Tag push**: Automatically triggers when you push a tag starting with `v` (e.g., `v1.0.0`)
- **Manual**: Can be triggered manually from the GitHub Actions UI

### Build Matrix
The workflow builds on:
- `macos-latest` - for macOS builds
- `ubuntu-latest` - for Linux builds
- `windows-latest` - for Windows builds

## Troubleshooting

### Build fails on a specific platform
- Check the GitHub Actions logs for that specific platform
- Ensure `electron/package.json` has the correct dependencies

### Version not updating
- Make sure you updated `package.json` in the root directory
- The workflow reads version from `package.json` using Node.js

### Release not created
- Ensure you pushed a tag starting with `v` (e.g., `v1.0.0`)
- Check that `GITHUB_TOKEN` has proper permissions (should be automatic)

## Notes

- The workflow automatically reads the version from `package.json`
- Each platform builds independently, so one platform failing won't affect others
- Artifacts are uploaded even if the release creation fails (for debugging)
- The web app is built once and then packaged for all platforms
