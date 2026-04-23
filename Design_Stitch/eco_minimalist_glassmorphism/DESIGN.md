---
name: Eco-Minimalist Glassmorphism
colors:
  surface: '#f7faf5'
  surface-dim: '#d8dbd6'
  surface-bright: '#f7faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4ef'
  surface-container: '#ecefea'
  surface-container-high: '#e6e9e4'
  surface-container-highest: '#e0e3df'
  on-surface: '#191c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#2d312e'
  inverse-on-surface: '#eff2ed'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#4d644d'
  on-secondary: '#ffffff'
  secondary-container: '#cfeacc'
  on-secondary-container: '#536a53'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#102000'
  on-tertiary-container: '#5d9206'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#cfeacc'
  secondary-fixed-dim: '#b3cdb1'
  on-secondary-fixed: '#0a200e'
  on-secondary-fixed-variant: '#364c37'
  tertiary-fixed: '#b7f569'
  tertiary-fixed-dim: '#9dd850'
  on-tertiary-fixed: '#102000'
  on-tertiary-fixed-variant: '#304f00'
  background: '#f7faf5'
  on-background: '#191c1a'
  surface-variant: '#e0e3df'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  margin-mobile: 20px
  margin-desktop: 48px
  gutter: 16px
---

## Brand & Style

The visual identity of this design system centers on "Digital Botany"—a fusion of high-tech precision and organic softness. It is designed for users who value environmental stewardship and modern efficiency. The brand personality is serene, clinical yet inviting, and deeply organized. 

The design style utilizes **Glassmorphism** to create a sense of depth and transparency, suggesting an open and honest relationship with ecological data. This is paired with **Minimalism** through the use of heavy whitespace and a restricted, nature-inspired palette. The interface should feel like a premium handheld lens peering into the natural world, evoking a sense of calm, clarity, and urgent environmental purpose.

## Colors

The palette is anchored by a soft, non-white canvas (#F4F7F2) to reduce eye strain and provide a natural, parchment-like foundation. 

- **Primary:** Black or very dark green (#1A1A1A) is reserved for high-impact actions and primary typography, providing a stark, authoritative contrast against the soft background.
- **Secondary:** Sage Green (#ACC6AA) acts as the bridge between tech and nature, used for secondary surfaces and supporting UI elements.
- **Accent:** Neon Green (#C1FF72) is used sparingly for progress indicators, success states, and data visualizations to provide a "digital pulse" to the interface.
- **Surface:** Translucent whites with heavy saturation and blur are used for all elevated layers to maintain the glass effect.

## Typography

This design system utilizes **Plus Jakarta Sans** for its clean, geometric construction and modern humanist touches that feel both technical and approachable. 

The typographic hierarchy is structured to lead with bold, slightly tracked-in headlines for a confident editorial feel. Body text remains spacious to ensure readability during field data entry. Labels and data points utilize semi-bold weights and slightly increased letter spacing to ensure clarity when placed over translucent glass backgrounds or high-contrast pill buttons.

## Layout & Spacing

The layout philosophy follows a **fluid grid** with generous safe areas to allow the floating imagery and glass panels room to breathe. 

A 12-column grid is used for desktop, while a 4-column grid governs mobile views. To reinforce the "floating" aesthetic, the layout avoids edge-to-edge containers. All cards and glass panels should be inset from the screen margins by at least 20px. Vertical spacing is rhythmic, relying on an 8px base unit, but with deliberate "interruptions" where plant cut-outs break the grid lines to create a dynamic, 3D overlapping effect.

## Elevation & Depth

Depth is the defining characteristic of this design system. It does not use traditional drop shadows for depth; instead, it uses **Backdrop Blur** and **Translucent Layering**.

1.  **Level 0 (Canvas):** The #F4F7F2 background.
2.  **Level 1 (Floating Imagery):** Cut-out plant assets. These use a very soft, high-offset ambient occlusion shadow (low opacity, tinted with #2D3A2D) to appear as if they are hovering 20px above the canvas.
3.  **Level 2 (Glass Panels):** Bottom sheets and floating widgets. These feature a 30px-40px background blur and a 1px semi-transparent white inner border to simulate the edge of a glass pane.
4.  **Level 3 (Interactive Elements):** Pill buttons and circular icon buttons. These sit atop glass panels with crisp edges, creating a high-contrast focal point.

## Shapes

The shape language is strictly **Pill-shaped (Level 3)**. There are no sharp corners in the interface. 

- **Interactive Elements:** All buttons and input fields use a fully rounded radius (stadium shape). 
- **Panels & Sheets:** Floating glass widgets and bottom sheets use a `rounded-xl` (3rem/48px) corner radius to maintain a soft, organic feel.
- **Icons:** Icons are housed within perfect circles. 
- **Progress:** Circular metaphors are used for all tracking metrics to mirror the cycles of nature.

## Components

### Buttons
Primary buttons are pill-shaped, colored in #1A1A1A with white text. Secondary buttons are glass-based with a thin Dark Green outline. Interaction states should involve a subtle scale-down (98%) rather than a color change to maintain the tactile feel.

### Floating Badges
Vertical glass widgets that serve as status indicators. These contain a circular progress bar at the top (using Neon Green), followed by a thin line icon and a small label. They should appear to float on the right or left edge of the screen.

### Glass Panels
Bottom sheets do not touch the bottom of the screen; they are "floating sheets" with a consistent margin from all edges. They must utilize `backdrop-filter: blur(30px)` and a background color of `rgba(255, 255, 255, 0.4)`.

### Icons & Imagery
Icons are ultra-thin (1pt to 1.5pt stroke) line icons. Imagery consists of high-resolution, background-removed photos of flora. These assets should be placed so they overlap glass panels and the background canvas simultaneously to tie the layers together.

### Input Fields
Inputs are fully rounded pills with a light sage stroke. When focused, the stroke thickens and shifts to Neon Green. Labels are placed outside the field, aligned to the left margin.