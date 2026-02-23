# Vintage Radio YouTube Music Player

A retro-styled desktop radio application that streams YouTube Music recommendations with nostalgic, analog-inspired controls.

**Experience Qualities**:
1. **Nostalgic** - Evokes the warm, tactile feeling of vintage radio equipment from the 1960s-70s
2. **Simple** - Stripped-down controls focusing on the essential radio experience: play/pause, skip tracks, adjust volume, exit
3. **Warm** - Color palette and design elements that feel comforting and timeless like classic audio equipment

**Complexity Level**: Light Application (single-view radio interface with YouTube Music integration)
This is a simplified radio-style player that integrates with YouTube Music. Users can control playback (play/pause, next/previous), view track information and lyrics, adjust volume, and auto-dislike when skipping - mimicking the simplicity of a physical radio with modern streaming features.

## Essential Features

### 1. YouTube Music Login and Integration
- **Functionality**: Embedded YouTube Music login interface and player integration  
- **Purpose**: Authenticate with YouTube Music and enable playback control
- **Trigger**: App launch shows login screen if not authenticated
- **Progression**: App starts → Show YouTube Music login iframe → User logs in → Click "Continue to Radio" → Main radio interface loads
- **Success criteria**: User can log into YouTube Music and access their account

### 2. Radio Station Display with Track Info and Lyrics
- **Functionality**: Shows current song title, artist, and live synchronized lyrics in the vintage radio display with fixed height layout
- **Purpose**: Provides real-time feedback on what's playing while maintaining the nostalgic aesthetic, prevents page jumping during track changes
- **Trigger**: Automatically updates when track changes in YouTube Music
- **Progression**: Track changes → Extract metadata from YouTube Music → Display song title and artist → Fetch and show synchronized lyrics
- **Success criteria**: Song information displays accurately with lyrics synchronized to playback progress, layout remains stable during transitions

### 3. Play/Pause Control
- **Functionality**: Central button to toggle playback state
- **Purpose**: Essential playback control like vintage radios had on/off switches
- **Trigger**: User clicks play/pause button
- **Progression**: User clicks button → Toggle YouTube Music playback → Update button icon
- **Success criteria**: Playback starts/stops immediately, button reflects current state

### 4. Track Navigation Controls
- **Functionality**: Separate buttons for Previous, Next, and Dislike/Skip
- **Purpose**: Clear, distinct controls for track navigation - Previous goes back, Next advances, Dislike rates negatively and skips
- **Trigger**: User clicks previous, next, or dislike button
- **Progression**: 
  - Previous: User clicks previous → Skip to previous YouTube Music track
  - Next: User clicks next → Skip to next YouTube Music recommendation  
  - Dislike: User clicks dislike → Current track is disliked → Skip to next track
- **Success criteria**: Tracks change smoothly, dislike button provides clear feedback when rating negatively

### 5. Volume Knob Control
- **Functionality**: Rotary knob-style volume slider with vintage aesthetic
- **Purpose**: Authentic radio experience with tactile-feeling volume adjustment
- **Trigger**: User drags or clicks the volume control
- **Progression**: User adjusts knob → Volume changes in real-time → Position persists → YouTube Music volume updates
- **Success criteria**: Volume adjusts smoothly with visual feedback and syncs with YouTube Music

### 6. Power/Exit Button
- **Functionality**: Prominent power button to close the application
- **Purpose**: Complete the vintage radio metaphor with an authentic power control
- **Trigger**: User clicks power button
- **Progression**: User clicks power → Confirmation toast → App closes gracefully
- **Success criteria**: Application exits cleanly without errors

## Edge Case Handling

- **Network Disconnection**: Display vintage "No Signal" static/noise overlay when offline
- **YouTube Music Loading**: Show animated "Tuning..." indicator during track changes
- **Failed Track Skip**: If skip fails, show brief toast message
- **Volume Persistence**: Remember last volume setting between sessions using useKV
- **Unauthenticated State**: Show login screen if YouTube Music session expires

## Design Direction

The design should transport users to the golden age of analog audio equipment - warm wood grain textures, brushed metal controls, soft ambient lighting behind speaker grills. Think vintage 1960s-70s transistor radios and hi-fi equipment: tactile knobs, satisfying button clicks, warm glowing displays. Colors should be earthy and inviting - walnut wood browns, brass metal accents, warm amber display lights, and soft fabric speaker covers.

## Color Selection

Warm, nostalgic color palette inspired by vintage audio equipment and mid-century design.

- **Primary Color**: Rich Walnut `oklch(0.35 0.04 55)` - Deep wood brown for the radio body/background, warm and grounding
- **Secondary Colors**: 
  - Wood Grain: `oklch(0.45 0.05 50)` - Lighter wood tones for texture and depth
  - Brass Accent: `oklch(0.65 0.12 75)` - Metallic gold for knobs and trim
  - Speaker Fabric: `oklch(0.40 0.03 60)` - Woven texture color for speaker grill areas
- **Accent Color**: Warm Amber `oklch(0.70 0.15 65)` - Glowing display light, warm and inviting like tube amplifier lights
- **Foreground/Background Pairings**:
  - Background (Walnut `oklch(0.35 0.04 55)`): Cream text `oklch(0.92 0.03 75)` - Ratio 7.2:1 ✓
  - Wood Surface `oklch(0.45 0.05 50)`: Cream text `oklch(0.92 0.03 75)` - Ratio 5.1:1 ✓
  - Brass Accent `oklch(0.65 0.12 75)`: Dark brown text `oklch(0.25 0.04 55)` - Ratio 6.8:1 ✓
  - Amber Display `oklch(0.70 0.15 65)`: Dark brown text `oklch(0.25 0.04 55)` - Ratio 8.3:1 ✓

## Font Selection

Typography should evoke vintage analog displays and retro signage while maintaining readability.

**Primary**: Orbitron (geometric sans-serif) - Digital/LED display aesthetic for station info and track titles
**Secondary**: Space Mono (monospace) - Technical, retro-computing feel for labels and metadata
**Fallback**: Courier New (monospace) - Classic typewriter aesthetic if custom fonts unavailable

- **Typographic Hierarchy**:
  - H1 (Station/Track Display): Orbitron Bold / 28px / 0.05em letter-spacing / 1.2 line-height / uppercase
  - Display Text (Artist Info): Orbitron Medium / 16px / 0.03em letter-spacing / 1.3 line-height
  - Labels (Control Labels): Space Mono Regular / 11px / 0.1em letter-spacing / 1.4 line-height / uppercase
  - Indicators (Volume Level): Space Mono Bold / 14px / 0.08em letter-spacing
  - Lyrics: Space Mono Regular / 14px / 0.05em letter-spacing / 1.5 line-height

## Animations

Animations should mimic the mechanical and analog nature of vintage equipment. Button presses should have satisfying "click" feedback with slight depth changes. The volume knob should rotate with realistic physics. Display text should have a subtle warm glow/flicker like old LED displays. When switching tracks, create a brief "tuning" effect similar to changing radio stations. Lyrics scroll smoothly with highlighted current line. All animations should feel tactile and mechanical rather than digital and instant.

## Component Selection

- **Components**:
  - Button: Large mechanical-style buttons for Previous/Play/Next/Dislike with pressed depth effect
  - Circular rotary knob for volume with rotation animation
  - Card: Main radio body container with wood grain texture background
  - Badge: Small labels for button functions ("PREV", "PLAY"/"PAUSE", "NEXT", "SKIP", "VOL")
  - ScrollArea: For lyrics display with smooth scrolling and fixed height
  - Toast (Sonner): For feedback messages
  
- **Customizations**:
  - Wood grain background using CSS gradients (.wood-grain class)
  - Metallic button bezels with brass/chrome gradient effects (.brass-knob class)
  - Glowing amber display area with inner shadow for depth (.amber-glow class)
  - Speaker grill pattern using CSS repeating gradients (.speaker-grill class)
  - Rotary volume knob with radial gradient and shadow for 3D depth
  
- **States**:
  - Buttons: Rest (raised, slight shadow) → Hover (brighter highlight) → Active (pressed inward, reduced shadow) → Disabled (dimmed)
  - Volume Knob: Rest → Hover (cursor changes) → Dragging (active rotation indicator) → Release (slight bounce)
  - Display: Idle (steady glow) → Active playback (subtle pulse) → Tuning (flicker animation)
  - Power Button: Off state (dim red LED) → Hover (brighter red) → Click (immediate close)
  - Lyrics: Previous lines (dimmed) → Current line (highlighted, scaled) → Future lines (normal)
  
- **Icon Selection** (Phosphor Icons):
  - Previous: CaretLeft (thick, bold)
  - Next: CaretRight (thick, bold)  
  - Play: Play (bold)
  - Pause: Pause (bold)
  - Dislike/Skip: ThumbsDown (bold)
  - Power: Power (circle with line) in LED button style
  
- **Spacing**:
  - Radio body: max-width 600px, centered on screen with generous padding
  - Control buttons: gap-4 (16px) for 5-button control panel
  - Display area: Fixed min-height to prevent layout shift during track changes
  - Display to controls: mt-8 (32px) to separate display from interaction area
  - Button size: h-14 w-14 (56px) for balanced 5-button layout
  
- **Mobile**: 
  Fixed single-size radio interface that scales proportionally:
  - Entire radio scales down to fit viewport while maintaining aspect ratio
  - Minimum comfortable size prevents unusable tiny controls
  - On very small screens, consider full-screen simplified view
