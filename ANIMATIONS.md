# Animation Details

This document outlines all the animations added to the Vintage Radio app for a polished, delightful user experience.

## CSS Keyframe Animations

### Core Animations (index.css)

1. **gentle-pulse** - Ambient pulsing glow for the amber display
   - Used on: Track display amber glow
   - Duration: 3s infinite
   - Effect: Subtle box-shadow intensity changes

2. **button-press** - Tactile button press feedback
   - Duration: Variable
   - Effect: Simulates physical button depression

3. **slide-up** - Elements entering from below
   - Duration: 0.5s
   - Effect: Opacity 0→1 + translateY(20px)→0
   - Used on: Control buttons grid, login button

4. **slide-down** - Elements entering from above
   - Duration: 0.4-0.5s
   - Effect: Opacity 0→1 + translateY(-20px)→0
   - Used on: Header badges, titles

5. **scale-in** - Elements scaling into view
   - Duration: 0.5-0.6s
   - Effect: Opacity 0→1 + scale(0.9)→1
   - Used on: Main radio container, login dialog

6. **fade-in** - Simple opacity transitions
   - Duration: 0.3-0.5s
   - Effect: Opacity 0→1
   - Used on: Text elements, overlays

7. **rotate-in** - Playful rotation entrance
   - Duration: 0.8s
   - Effect: Opacity 0→1 + rotate(-10deg)→0 + scale(0.95)→1
   - Used on: Radio emoji icon

8. **shimmer** - Animated gradient effect (utility)
   - Duration: Variable
   - Effect: Background position sweep

9. **float** - Gentle floating motion
   - Duration: 3s infinite
   - Effect: translateY oscillation (0→-20px→0)
   - Used on: No signal screen radio icon

## Component-Specific Animations

### Login Screen (App.tsx)
- **Container**: scale-in (0.6s)
- **Radio icon**: rotate-in (0.8s)
- **Title**: slide-down (0.5s, 0.2s delay)
- **Description**: fade-in (0.5s, 0.3s delay)
- **Iframe container**: slide-up (0.5s, 0.4s delay)
- **Continue button**: slide-up (0.5s, 0.5s delay) + hover scale

### Main Radio Interface (VintageRadio.tsx)
- **Container**: scale-in (0.6s)
- **Header section**: slide-down (0.4s, 0.1s delay)
- **Speaker grill**: scale-in (0.5s, 0.2s delay)
- **Controls grid**: slide-up (0.5s, 0.3s delay)
- **Power button**: hover scale (1.1) + active scale (0.9)
- **All control buttons**: hover scale + active:scale-95
- **Volume knob**: hover scale (1.05) + active scale (0.95) + smooth rotation

### Track Display (TrackDisplay.tsx)
- **Album art**: fade transition via framer-motion
  - Duration: 0.5s
  - Effect: Smooth crossfade on track change
- **Track info**: Opacity transition on track change
- **Lyrics**: Color/scale transition for current line
  - Active line: scale-105 + accent color
  - Past lines: Faded opacity
  - Future lines: Medium opacity

### No Signal Screen (App.tsx)
- **Overlay**: fade-in (0.3s)
- **Radio icon**: float animation (3s infinite)
- **Title**: slide-down (0.5s, 0.1s delay)
- **Message**: fade-in (0.5s, 0.2s delay)

## Hover & Interactive States

### Buttons
- **Standard buttons**: hover:scale-105, active:scale-95
- **Volume knob**: hover:scale-105 + shadow, active:scale-95
- **Power button**: hover:scale-110, active:scale-90

### Speaker Grill
- **Hover**: Border color transition (muted→primary)

## Timing & Easing

- **Fast interactions**: 0.1-0.2s (button presses, immediate feedback)
- **Standard transitions**: 0.3-0.5s (most UI changes)
- **Entrance animations**: 0.5-0.8s (page load, major elements)
- **Ambient effects**: 3s infinite (gentle pulse, float)

## Staggered Entry Pattern

Elements animate in sequence for a polished loading experience:
1. Container scales in (0s delay)
2. Header slides down (0.1s delay)
3. Speaker grill scales in (0.2s delay)
4. Controls slide up (0.3s delay)

## Performance Notes

- CSS animations used for best performance
- Framer Motion used sparingly (album art transitions only)
- Transform properties preferred over layout-affecting properties
- Hardware acceleration via transform/opacity
- Transitions disabled during drag operations (volume knob)
