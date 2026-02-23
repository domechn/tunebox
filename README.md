# Vintage Radio - YouTube Music Desktop App

一个复古风格的 YouTube Music 桌面应用，采用 1960-70 年代收音机的美学设计。

## 功能特性

✅ **复古电台界面** - 木纹纹理、黄铜旋钮、琥珀色显示屏
✅ **歌曲信息显示** - 实时显示歌名、艺术家
✅ **歌词同步显示** - 正在播放的歌词滚动显示
✅ **简单控制** - 上一首、下一首、音量调节、退出
✅ **自动 Dislike** - 切换下一首时自动 dislike 当前歌曲
✅ **离线检测** - 断网时显示"无信号"提示
✅ **音量持久化** - 记住上次设置的音量

## 已完成的任务

### 第 1 次迭代
- ✅ 基础 YouTube Music 集成
- ✅ 复古收音机 UI 设计
- ✅ 基本控制功能（上一首、下一首、音量）

### 第 2 次迭代
- ✅ 优化复古风格主题
- ✅ 木纹纹理背景
- ✅ 黄铜金属旋钮
- ✅ 琥珀色发光显示

### 第 3 次迭代
- ✅ 自动 dislike 功能
- ✅ 音量旋钮交互优化
- ✅ 状态持久化

### 第 4 次迭代（当前）
- ✅ **添加歌名和歌词显示组件**
- ✅ **移除底部无用的两个圆点**
- ✅ **创建桌面应用打包指南**

## 歌词功能说明

应用现在包含一个 `TrackDisplay` 组件，用于显示：
- 当前播放的歌曲名称（大写显示在琥珀色发光区域）
- 艺术家名称（歌曲名称下方）
- 实时同步的歌词（在卡片区域滚动显示，当前行高亮）

**注意**: 由于 YouTube Music 在 iframe 中的限制，歌词功能需要通过 `postMessage` API 与 YouTube Music 进行通信。在实际部署时，可能需要：
1. 使用浏览器扩展来提取歌曲信息
2. 使用 Electron 的 webview 或 BrowserView
3. 使用第三方歌词 API

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
├── electron/              # Electron 主进程文件
│   ├── main.js           # Electron 入口
│   └── preload.js        # 预加载脚本
├── src/
│   ├── components/
│   │   └── player/
│   │       ├── VintageRadio.tsx      # 主收音机组件
│   │       ├── TrackDisplay.tsx      # 歌曲信息和歌词显示
│   │       └── PlayerControls.tsx    # 播放控制
│   ├── App.tsx           # 应用入口
│   └── index.css         # 主题样式
├── DESKTOP_APP_GUIDE.md  # 详细打包指南
└── package.json          # 依赖和构建脚本
\`\`\`

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **Framer Motion** - 动画
- **Electron** - 桌面应用框架（可选）
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

## 未来改进方向

- [ ] 实现真实的 YouTube Music API 集成
- [ ] 添加播放列表功能
- [ ] 实现搜索功能
- [ ] 添加均衡器效果
- [ ] 支持自定义主题
- [ ] 添加键盘快捷键
- [ ] 实现系统托盘集成
- [ ] 媒体按键支持

## 许可证

MIT
