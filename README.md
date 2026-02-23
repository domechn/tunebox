# Vintage Radio - YouTube Music Desktop App

一个复古风格的 YouTube Music 桌面应用，采用 1960-70 年代收音机的美学设计。

## 功能特性

✅ **复古电台界面** - 木纹纹理、黄铜旋钮、琥珀色显示屏
✅ **YouTube Music 登录** - 集成 YouTube Music 登录界面
✅ **播放控制** - 播放/暂停、上一首、下一首
✅ **歌曲信息显示** - 实时显示歌名、艺术家
✅ **歌词同步显示** - 正在播放的歌词滚动显示  
✅ **音量调节** - 复古旋钮式音量控制
✅ **自动 Dislike** - 切换下一首时自动 dislike 当前歌曲
✅ **离线检测** - 断网时显示"无信号"提示
✅ **音量持久化** - 记住上次设置的音量

## YouTube Music API 集成

由于浏览器安全限制，完整的 YouTube Music 控制需要通过 **Electron 桌面应用** 实现。

### Web 版功能
- ✅ YouTube Music 登录界面
- ✅ 复古收音机 UI
- ✅ 基础控制布局
- ⚠️ 实际播放控制需要 Electron

### Electron 版功能  
- ✅ 完整 YouTube Music 控制
- ✅ 播放/暂停、上一首/下一首
- ✅ 歌曲信息提取
- ✅ 歌词同步显示
- ✅ Dislike 功能
- ✅ 音量控制

详见 [YOUTUBE_MUSIC_INTEGRATION.md](./YOUTUBE_MUSIC_INTEGRATION.md) 了解集成原理。

## 打包为桌面应用

详细的打包指南请参见 [DESKTOP_APP_GUIDE.md](./DESKTOP_APP_GUIDE.md)

### 快速开始

1. 安装 Electron 依赖：
\`\`\`bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
\`\`\`

2. 开发模式运行：
\`\`\`bash
npm run electron:dev
\`\`\`

3. 构建桌面应用：
\`\`\`bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
\`\`\`

生成的安装包将位于 `release/` 目录中。

## 项目结构

\`\`\`
├── electron/                      # Electron 集成
│   ├── main.js                   # Electron 主进程
│   ├── preload.js                # 预加载脚本
│   └── ytmusic-control.js        # YouTube Music 控制脚本
├── src/
│   ├── components/
│   │   └── player/
│   │       ├── VintageRadio.tsx      # 主收音机组件
│   │       └── TrackDisplay.tsx      # 歌曲信息和歌词显示
│   ├── hooks/
│   │   └── use-youtube-music.ts      # YouTube Music 控制 Hook
│   ├── App.tsx                   # 应用入口（含登录界面）
│   └── index.css                 # 复古主题样式
├── DESKTOP_APP_GUIDE.md          # 桌面应用打包指南
├── YOUTUBE_MUSIC_INTEGRATION.md  # API 集成说明
└── package.json                  # 依赖和构建脚本
\`\`\`

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **Phosphor Icons** - 图标库
- **Electron** - 桌面应用框架
- **Vite** - 构建工具

## 设计特色

### 色彩方案
- **背景**: 深胡桃木色 `oklch(0.35 0.04 55)`
- **主色**: 黄铜金色 `oklch(0.65 0.12 75)`
- **强调色**: 温暖琥珀色 `oklch(0.70 0.15 65)`

### 字体
- **主字体**: Orbitron - 几何无衬线字体，模拟 LED 显示效果
- **辅助字体**: Space Mono - 等宽字体，技术复古感

### 特效
- **木纹纹理**: 使用 CSS 渐变模拟真实木纹
- **黄铜旋钮**: 径向渐变 + 阴影营造 3D 金属质感
- **琥珀发光**: 柔和脉冲动画模拟电子管发光
- **扬声器网格**: 点状重复图案

## 控制说明

- **PREV 按钮**: 上一首歌曲
- **PLAY/PAUSE 按钮**: 播放/暂停（居中）
- **NEXT 按钮**: 下一首（自动 dislike 当前歌曲）
- **VOL 旋钮**: 拖动旋转调节音量
- **POWER 按钮**: 退出应用

## 开发日志

### 第 5 次迭代（当前）
- ✅ **实现真实 YouTube Music API 集成**
  - 创建 `use-youtube-music` Hook 用于播放控制
  - Electron 脚本注入 YouTube Music 页面
  - 通过 postMessage 实现双向通信
- ✅ **添加登录功能**
  - 首次启动显示 YouTube Music 登录界面
  - 登录后进入复古收音机界面
- ✅ **添加播放/暂停按钮**
  - 新增居中播放/暂停控制
  - 实时显示播放状态
- ✅ **实现歌词功能**
  - TrackDisplay 组件显示同步歌词
  - 根据播放进度高亮当前歌词行
- ✅ **实现 Dislike 功能**
  - 点击 NEXT 自动 dislike 当前歌曲
- ✅ **删除未使用代码**
  - 移除 MiniPlayer 组件
  - 移除 PlayerControls 组件  
  - 移除 SearchBar 和 SettingsDialog

### 之前的迭代
- ✅ 基础 UI 和控制功能
- ✅ 复古风格主题优化
- ✅ 状态持久化

## 许可证

MIT
