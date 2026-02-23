# 将 Vintage Radio 打包为桌面应用

本指南介绍如何将这个 YouTube Music 复古电台应用打包成跨平台的桌面应用（支持 Windows、macOS 和 Linux）。

## 方案选择

我们推荐使用 **Electron** 来将这个 React 应用打包成桌面应用。Electron 是成熟的解决方案，被 VSCode、Discord、Slack 等应用使用。

## 步骤 1: 安装 Electron 依赖

在项目根目录运行：

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

## 步骤 2: 创建 Electron 主进程文件

在项目根目录创建 `electron/main.js` 文件：

```javascript
const { app, BrowserWindow, session } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#2C2416',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    title: 'Vintage Radio - YouTube Music',
    autoHideMenuBar: true,
    frame: true,
    resizable: true
  })

  // 在开发模式加载 Vite 开发服务器，生产模式加载打包后的文件
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`
  
  mainWindow.loadURL(startUrl)

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 设置 session 以允许加载 YouTube Music
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    callback({ requestHeaders: details.requestHeaders })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

## 步骤 3: 修改 package.json

在 `package.json` 中添加以下配置：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron": "electron .",
    "electron:dev": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:5173 && cross-env ELECTRON_START_URL=http://localhost:5173 electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  },
  "build": {
    "appId": "com.vintageradio.app",
    "productName": "Vintage Radio",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.music",
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "icon": "build/icon.png",
      "category": "Audio"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## 步骤 4: 修改 vite.config.ts

确保 Vite 构建配置适合 Electron：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // 重要：使用相对路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

## 步骤 5: 创建应用图标

创建 `build` 目录，并放置应用图标：

- **macOS**: `build/icon.icns` (1024x1024 px)
- **Windows**: `build/icon.ico` (256x256 px)
- **Linux**: `build/icon.png` (512x512 px)

你可以使用在线工具如 https://www.icoconverter.com/ 来转换图标格式。

推荐图标设计：复古收音机图标，配色使用应用的主题色（琥珀色和木纹色）。

## 步骤 6: 开发和测试

### 开发模式（带热重载）
```bash
npm run electron:dev
```

这会同时启动 Vite 开发服务器和 Electron 窗口，支持热重载。

### 测试生产构建
```bash
npm run build
npm run electron
```

## 步骤 7: 构建桌面应用

### 为所有平台构建
```bash
npm run electron:build
```

### 为特定平台构建

**Windows**:
```bash
npm run electron:build:win
```
生成文件位于 `release/` 目录：
- `Vintage Radio Setup.exe` - 安装程序
- `Vintage Radio Portable.exe` - 绿色便携版

**macOS**:
```bash
npm run electron:build:mac
```
生成文件：
- `Vintage Radio.dmg` - 磁盘映像安装包
- `Vintage Radio-mac.zip` - ZIP 压缩包

**Linux**:
```bash
npm run electron:build:linux
```
生成文件：
- `Vintage Radio.AppImage` - AppImage 格式（推荐）
- `vintage-radio_x.x.x_amd64.deb` - Debian/Ubuntu 安装包
- `vintage-radio-x.x.x.x86_64.rpm` - RedHat/Fedora 安装包

## 注意事项

### YouTube Music 加载限制

由于 YouTube Music 使用了防护措施，iframe 方式在 Electron 中可能受限。如果遇到问题，有以下解决方案：

1. **使用 WebView**: 将 iframe 改为 Electron 的 WebView
2. **使用 BrowserView**: 在主进程中创建 BrowserView
3. **YouTube Music API**: 使用官方 API（需要申请）

### 最佳替代方案（如果 iframe 不可行）

如果 YouTube Music 无法在 iframe 中加载，可以考虑：

1. 使用 Electron 的 `<webview>` 标签替代 iframe
2. 创建独立的 BrowserView 来加载 YouTube Music
3. 使用 YouTube Data API 和 YouTube IFrame Player API

示例代码（在 electron/main.js 中）：

```javascript
const { BrowserView } = require('electron')

function createWindow() {
  // ... 现有代码

  // 创建 YouTube Music 的 BrowserView
  const view = new BrowserView()
  mainWindow.setBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 }) // 隐藏但保持运行
  view.webContents.loadURL('https://music.youtube.com')
}
```

## 发布应用

构建完成后，你可以：

1. **分发安装包**: 将 `release/` 目录中的文件分发给用户
2. **GitHub Releases**: 上传到 GitHub Releases 供用户下载
3. **应用商店**: 提交到 Microsoft Store、Mac App Store 等
4. **自动更新**: 配置 electron-updater 实现自动更新功能

## 应用签名（可选但推荐）

### macOS
需要 Apple Developer 账号：
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
npm run electron:build:mac
```

### Windows
需要代码签名证书：
```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your-password
npm run electron:build:win
```

## 性能优化建议

1. **减小包体积**: 使用 `asar` 打包（electron-builder 默认启用）
2. **懒加载**: 按需加载组件
3. **缓存**: 缓存常用数据
4. **硬件加速**: 默认启用 GPU 加速

## 故障排查

### 应用无法启动
- 检查 `electron/main.js` 的路径是否正确
- 确保 `dist/` 目录已生成

### YouTube Music 无法加载
- 检查网络连接
- 清除 Electron 缓存：`app.clearCache()`
- 检查 User-Agent 设置

### 构建失败
- 确保所有依赖已安装
- 检查 Node.js 版本（推荐 v18+）
- 清除缓存：`rm -rf node_modules && npm install`

## 更多资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Electron Forge](https://www.electronforge.io/) - 另一个打包工具
