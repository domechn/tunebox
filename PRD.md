# YouTube Music Desktop App

A cross-platform (Windows, Mac, Linux) desktop application for YouTube Music that provides a native-like music streaming experience with enhanced controls and features.

**Experience Qualities**:
1. **Immersive** - Full-screen music experience that puts content first, minimizing distractions
2. **Responsive** - Instant feedback to user actions with smooth transitions and animations
3. **Polished** - Professional UI that feels like a premium native application

**Complexity Level**: Complex Application (advanced functionality with multiple views, playback controls, search, playlists, and persistent state management)
This requires a sophisticated player interface, search functionality, playlist management, and seamless integration with YouTube Music's web player through an embedded iframe approach.

## Essential Features

### 1. YouTube Music Web Player Integration
- **Functionality**: Embeds YouTube Music web player in a full-screen iframe
- **Purpose**: Provides access to full YouTube Music functionality without reimplementing streaming
- **Trigger**: Automatically loads on app launch
- **Progression**: App launch → Load YouTube Music URL → Display in iframe → User interacts normally
- **Success criteria**: YouTube Music loads successfully and is fully interactive

### 2. Custom Player Controls Overlay
- **Functionality**: Native controls overlaying the web player for play/pause, next/previous, volume
- **Purpose**: Provides quick access to playback controls without navigating YouTube Music UI
- **Trigger**: Controls appear on hover or always visible based on user preference
- **Progression**: User hovers over player → Controls fade in → User clicks control → Action executes → Controls fade out
- **Success criteria**: Controls respond instantly and sync with YouTube Music playback state

### 3. Search Integration
- **Functionality**: Quick search bar that redirects to YouTube Music search results
- **Purpose**: Fast access to search without navigating through YouTube Music interface
- **Trigger**: User clicks search icon or presses keyboard shortcut (Ctrl/Cmd+F)
- **Progression**: User opens search → Types query → Presses enter → YouTube Music navigates to search results
- **Success criteria**: Search executes correctly and displays results in player

### 4. Mini Player Mode
- **Functionality**: Compact always-on-top window showing current track and basic controls
- **Purpose**: Allows users to control music while working in other applications
- **Trigger**: User clicks mini player button
- **Progression**: Full player → Click mini mode → Window resizes to compact view → Shows album art + controls → User can return to full mode
- **Success criteria**: Window stays on top, shows current track info, controls work

### 5. Keyboard Shortcuts
- **Functionality**: Global keyboard shortcuts for play/pause, skip, volume control
- **Purpose**: Control music without switching to the app window
- **Trigger**: User presses registered keyboard combination
- **Progression**: User presses shortcut → App detects keypress → Executes corresponding action → Provides visual feedback
- **Success criteria**: All shortcuts work reliably even when app is in background

### 6. Settings & Preferences
- **Functionality**: Persistent user settings for theme, controls visibility, startup behavior
- **Purpose**: Customization to match user preferences and workflow
- **Trigger**: User opens settings menu
- **Progression**: User clicks settings → Opens settings panel → Adjusts preferences → Settings auto-save → Take effect immediately
- **Success criteria**: All settings persist across app restarts

## Edge Case Handling

- **Network Disconnection**: Display overlay message when offline, attempt reconnection automatically
- **YouTube Music Changes**: If YouTube Music UI changes, iframe continues to work as it's the official web interface
- **Invalid URLs**: Validate and reset to home page if navigation fails
- **Missing User Session**: Show login prompt if user needs to authenticate with YouTube Music
- **Window Resize Limits**: Set minimum window dimensions to prevent unusable layouts
- **Audio Focus**: Handle audio playback properly when system has multiple audio sources

## Design Direction

The design should evoke a sense of modern sophistication and focus. Think dark, immersive theaters with subtle ambient lighting that puts the content center stage. The interface should feel like a premium audio application - refined, uncluttered, and purpose-built for music enjoyment. Visual elements should be minimal but impactful, using depth and layering to create hierarchy.

## Color Selection

A dark, music-focused theme with vibrant accent colors that pop against the dark backdrop.

- **Primary Color**: Deep Purple `oklch(0.45 0.15 290)` - Represents creativity and music, energetic yet sophisticated
- **Secondary Colors**: 
  - Dark Background: `oklch(0.12 0.01 270)` - Almost black with subtle purple tint for depth
  - Surface: `oklch(0.18 0.02 270)` - Elevated surfaces slightly lighter than background
- **Accent Color**: Electric Cyan `oklch(0.7 0.15 195)` - Bright, energetic color for playback controls and active states
- **Foreground/Background Pairings**:
  - Background (Dark `oklch(0.12 0.01 270)`): White text `oklch(0.98 0 0)` - Ratio 18.5:1 ✓
  - Surface (Medium `oklch(0.18 0.02 270)`): White text `oklch(0.98 0 0)` - Ratio 15.2:1 ✓
  - Primary (Purple `oklch(0.45 0.15 290)`): White text `oklch(0.98 0 0)` - Ratio 6.8:1 ✓
  - Accent (Cyan `oklch(0.7 0.15 195)`): Dark text `oklch(0.12 0.01 270)` - Ratio 13.1:1 ✓

## Font Selection

The typography should convey modernity and clarity, with excellent readability for song titles and artist names in a music player context.

**Primary**: Inter (sans-serif) - Clean, highly legible, excellent for UI elements and text at various sizes
**Secondary**: DM Sans (sans-serif) - Geometric and modern for headings and emphasis

- **Typographic Hierarchy**:
  - H1 (App Title/Current Track): DM Sans Bold / 32px / -0.02em letter-spacing / 1.1 line-height
  - H2 (Section Headers): DM Sans SemiBold / 20px / -0.01em letter-spacing / 1.2 line-height
  - Body (Artist Names, Labels): Inter Regular / 14px / 0em letter-spacing / 1.5 line-height
  - Small (Timestamps, Metadata): Inter Medium / 12px / 0.01em letter-spacing / 1.4 line-height
  - Button Text: Inter SemiBold / 14px / 0em letter-spacing

## Animations

Animations should enhance the music listening experience with smooth, flowing transitions that feel rhythmic and alive. Use subtle pulsing effects on active playback indicators, smooth fades for control overlays, and elastic transitions for mode changes. Scale and opacity transitions should feel synchronized, like they're moving to a beat. All animations should be performant and respectful of reduced-motion preferences.

## Component Selection

- **Components**:
  - Button: Primary actions (play/pause, skip) with hover states and icon support
  - Slider: Volume control and progress bar with custom styling
  - Dialog: Settings panel with smooth entry/exit animations
  - Popover: Quick menus for additional options
  - Card: Container for control panels and overlays with glassmorphic effects
  - Separator: Visual dividers in settings and control areas
  - Switch: Toggle settings in preferences panel
  - Tooltip: Helpful hints on hover for icon-only buttons
  
- **Customizations**:
  - Glassmorphic control panels using backdrop-filter blur with semi-transparent backgrounds
  - Custom progress slider with accent color fill and hover preview
  - Circular buttons for playback controls with scale-on-press animation
  - Custom volume slider with icon indicators
  
- **States**:
  - Buttons: Rest (subtle glow) → Hover (scale 1.05, brighter glow) → Active (scale 0.95) → Disabled (50% opacity)
  - Controls Overlay: Hidden → Hover-triggered fade-in (200ms) → Active → Fade-out after 3s idle
  - Mini Player Toggle: Full mode indicator vs compact mode indicator with smooth icon morph
  
- **Icon Selection**:
  - Play/Pause: Play/Pause phosphor icons with circle backgrounds
  - Skip: SkipForward/SkipBack with directional clarity
  - Volume: SpeakerHigh/SpeakerX with animated states
  - Search: MagnifyingGlass for search activation
  - Settings: Gear for preferences panel
  - MiniPlayer: PictureInPicture for mode toggle
  - Close/Minimize: X/Minus for window controls
  
- **Spacing**:
  - Control buttons: gap-4 (16px) between buttons in a row
  - Overlay padding: p-6 (24px) for control panel containers
  - Settings sections: space-y-6 (24px) between setting groups
  - Margins: mt-8 (32px) for major section separation
  
- **Mobile**: 
  While this is a desktop app, responsive design ensures usability on smaller windows:
  - Controls scale down but remain touch-friendly (min 44px tap targets)
  - Mini player becomes even more compact on narrow displays
  - Settings dialog uses full viewport on very small windows
  - Text truncates with ellipsis to prevent overflow
