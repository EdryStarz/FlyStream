---
name: "FlyStream Lab"
description: "A graphite scientific workbench and broadcast instrument for the fictional M0XA fly channel."
colors:
  bg: "#111719"
  panel: "#182024"
  image: "#090e10"
  control: "#242f34"
  text: "#e9eeed"
  muted: "#a9b8bd"
  line: "#35434a"
  source: "#c8d4d7"
  model: "#79d6bc"
  inferred: "#f2ba72"
  measured: "#91bdec"
  primary-ink: "#102923"
  primary-hover: "#99e6d0"
  hover-line: "#6b7f86"
  selected-bg: "#293b3e"
  selected-line: "#839a9f"
  active-bg: "#233532"
  trace-bg: "#121b1e"
  trace-grid: "#2d3b40"
  frame-change: "#b9c5c8"
  anatomy-off: "#efa88e"
  activity-highlight: "#ffe4a4"
  evidence-bg: "#e8eeeb"
  evidence-ink: "#192427"
  evidence-input: "#f3f6f4"
  evidence-link: "#1b6053"
  evidence-focus: "#17624e"
  safe-text: "#efb4a5"
  safe-line: "#956359"
  safe-hover: "#382825"
typography:
  brand:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "23px"
    fontWeight: 600
    letterSpacing: "-0.7px"
  title:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "17px"
    fontWeight: 500
  monitor-label:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "1.1px"
  body:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 400
  explanation:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  metadata:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "12px"
    fontWeight: 400
  classification:
    fontFamily: "PlexMono, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.4px"
  timecode:
    fontFamily: "PlexMono, monospace"
    fontSize: "14px"
    fontWeight: 400
  readout:
    fontFamily: "PlexMono, monospace"
    fontSize: "17px"
    fontWeight: 400
  neuron-title:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "26px"
    fontWeight: 500
  activity-readout:
    fontFamily: "PlexMono, monospace"
    fontSize: "23px"
    fontWeight: 400
  evidence-title:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.25
  evidence-body:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  operator-heading:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "28px"
    letterSpacing: "-0.7px"
  character-line:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "17px"
    lineHeight: 1.6
  broadcast-brand:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "clamp(14px, 2.15cqw, 40px)"
    fontWeight: 600
    letterSpacing: "-0.025em"
  broadcast-context:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "clamp(10px, 1.15cqw, 23px)"
    fontWeight: 500
  broadcast-caption:
    fontFamily: "Plex, 'IBM Plex Sans', sans-serif"
    fontSize: "clamp(14px, 1.8cqw, 36px)"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  square: "0px"
  control: "3px"
spacing:
  compact: "4px"
  small: "8px"
  label: "12px"
  regular: "16px"
  section: "20px"
  panel: "24px"
  gutter: "28px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.model}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    typography: "{typography.body}"
  button-selected:
    backgroundColor: "{colors.selected-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  select:
    backgroundColor: "{colors.control}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7px 28px 7px 10px"
  stage-active:
    backgroundColor: "{colors.active-bg}"
    textColor: "{colors.model}"
    rounded: "{rounded.square}"
    padding: "9px 5px"
  classification:
    typography: "{typography.classification}"
  monitor:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.square}"
  operator-field:
    backgroundColor: "{colors.control}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  emergency-safe:
    backgroundColor: "transparent"
    textColor: "{colors.safe-text}"
    rounded: "{rounded.control}"
    height: "44px"
  emergency-safe-hover:
    backgroundColor: "{colors.safe-hover}"
  evidence-panel:
    backgroundColor: "{colors.evidence-bg}"
    textColor: "{colors.evidence-ink}"
    padding: "24px"
    width: "390px"
---
# Design System: FlyStream Lab

## Overview

**Creative North Star: "The Video-Analysis Bench"**

FlyStream Lab is a continuous graphite scientific instrument. Dense, useful information sits beside the images it explains; quiet separators and restrained color support comparison, inspection and repeatable manipulation. The scientific workbench remains available at `/science`. The M0XA control room extends this instrument into broadcast operations, while `/stream` presents the fictional creature and selected pixels as a clean output composition.

Self-hosted IBM Plex typography, small control corners and precise numeric readouts establish its character. Light paper distinguishes the evidence inspector from the dark workbench. Scientific imagery is source data, model output or verified anatomy. The broadcast adds a rendered laboratory and fictional fly, explicitly separated from biological evidence; the visual system does not use a marketing hero, gradients, cyberpunk styling or decorative brain imagery.

**Key Characteristics:**

- Continuous surfaces with one-pixel separators.
- Visible scientific classifications alongside source and model views.
- Monospaced values and restrained active-state color.
- A light evidence drawer with a clearly managed modal focus state.
- A shared-edge program preview, compact operator controls and a fictional character broadcast.

## Colors

The palette pairs cool graphite surfaces with mint model accents, amber inference and pale evidence paper. Frontmatter tokens are normative; names below explain their use.

### Primary

- **Model mint** (`model`): primary action, current processing stage, keyboard focus, model classification and ON trace. The brighter `primary-hover` is the primary button hover state.
- **Inference amber** (`inferred`): inferred activity text and OFF response trace. It communicates the type of result, not urgency.

### Secondary

- **Measurement blue** (`measured`): the classification for experimental measurements; the current product explicitly states that neural recording is unavailable.
- **Anatomy coral** (`anatomy-off`): T5 skeletons. Other displayed skeletons use model mint. Selected simulated activity blends toward `activity-highlight`; this is a feature overlay rather than a biological color scale.

- **Safe-mode coral** (`safe-text`, `safe-line`, `safe-hover`): the emergency action uses a restrained coral label and border, with a dark coral hover fill. Runtime safe status and warnings retain inference amber.

### Neutral

- **Graphite bench** (`bg`), **panel graphite** (`panel`) and **image black** (`image`) separate the shell, monitor frames and image fields.
- **Control graphite** (`control`) supports input fills and button hover. `selected-bg` and `selected-line` mark the chosen source; `active-bg` supports current mode, neuron and processing controls.
- **Pale ink** (`text`) and **secondary ink** (`muted`) distinguish primary content from metadata. `line` is the recurring divider; `hover-line` clarifies hover.
- **Source silver** (`source`) identifies source material. `frame-change` identifies the neutral trace against `trace-bg` and `trace-grid`.
- **Evidence paper** (`evidence-bg`), **evidence ink** (`evidence-ink`), **evidence field** (`evidence-input`) and dark green links/focus form the light inspector context.

**The The Evidence Label Rule.** Color accompanies explicit SOURCE, MODELLED, INFERRED or MEASURED text. Structural anatomy remains SOURCE; a visible simulated overlay changes its heading to SOURCE + INFERRED.

## Typography

**Body Font:** self-hosted IBM Plex Sans, registered as `Plex`, with the IBM Plex Sans name and generic sans-serif fallback. The bundled face declares weights 100–700; the interface actually uses 400, 500 and 600. Font synthesis is disabled.

**Label/Mono Font:** self-hosted IBM Plex Mono, registered as `PlexMono`, with a monospace fallback. Monospaced readouts use normal weight, including values inside strong elements where the `font` shorthand resets the weight.

There is no marketing display or hero type role. Broadcast overlays scale to the composition width, independently of operator headings. The brand is compact, headings are medium weight, and numbers have stable character widths. Body line-height is browser-normal unless a specific prose rule sets it; do not invent a global 1.45–1.6 value.

- **Brand:** the `brand` role; the word Lab drops to normal weight and muted color.
- **Sections:** `title` for work-area headings. Monitor labels use `monitor-label`, uppercase; they reduce to 12px between the narrow and intermediate breakpoints and return to 13px on mobile.
- **Body and explanation:** `body` is the desktop root/control baseline. `explanation` is stage prose; it grows to 14px on mobile. Longer experiment descriptions use a 1.6 line-height and a 70ch maximum; stage explanation has an 82ch maximum.
- **Metadata and classifications:** `metadata` and `classification` are the common annotation roles. Some compact footer and legend details remain 11px. The final classification override is 12px at every viewport width.
- **Numbers:** `timecode`, `readout` and `activity-readout` distinguish timing, aggregate metrics and the selected cell's inferred response.
- **Evidence:** the drawer heading is 19px, individual source titles use `evidence-title`, and explanatory paragraphs use `evidence-body`.

At 760px and below the root font becomes 16px; explicit component sizes remain as specified in CSS. This is a set of observed roles, not a mathematical type scale.

Operator headings use `operator-heading` (25px on mobile). The character cue uses a 24px name (23px on mobile), a 12px monospaced mood and `character-line` (16px on mobile). Operator explanatory prose uses 14px/1.65 up to 75ch; supporting microcopy uses 12px/1.65 up to 85ch. Logs pair 11px monospaced times with 12px event descriptions; chat messages use 14px/1.5.

Broadcast brand, content context and subtitles use `broadcast-brand`, `broadcast-context` and `broadcast-caption`. Container-width units keep them proportional in the program preview and OBS output. Metadata remains monospaced; the regular full-size output uses 8–15px status and 7–14px footer clamps. At mobile widths the small operator preview uses local miniature overlay sizes (5–10px); these are preview compression, not reading sizes for operator controls. Vertical composition uses a larger brand clamp (24px, 5cqw, 50px) and caption clamp (16px, 4cqw, 40px).

## Layout

The shell fills the viewport above a 320px minimum body width. Desktop main content has 28px horizontal gutters. The monitor strip uses three equal columns, shared outer borders and internal separators. Each viewport is `clamp(220px, 25vw, 390px)` high, with contained 16:9 image canvases. The analysis area below uses `minmax(0, 2fr) minmax(320px, 1fr)` for processing and the neuron inspector. Shared transport sits directly below the monitor strip.

The rhythm uses the spacing tokens for recurring gaps, padding and gutters, with local 5–7px and 10–15px values where compact controls need them. These are extracted working values, not a mandate to snap every dimension to an eight-pixel grid.

- **At 1700px and above:** main content is capped at 1920px and centered; viewport height is 390px, trace height 150px. Header gutters follow the same centered composition.
- **At 1150px and below:** horizontal main/header gutters become 18px, source controls wrap, monitor viewport height is 240px, and the analysis split becomes `minmax(0, 1.4fr) minmax(300px, 1fr)`.
- **At 760px and below:** main gutters become 14px, monitors and the analysis area stack, source actions wrap, and the processing stages use three columns. Image viewports use 16:9 with a 210px minimum; anatomy is a fixed 280px high. The transport becomes sticky at the bottom with wrapping performance metadata. Evidence fills the screen width with 22px padding.

The final mobile rules set buttons and transport icon controls to at least 44px in both dimensions; timeline and parameter range controls are 44px high. Desktop general buttons and selects have a 36px minimum height, with compact icon and text exceptions. Keep these responsive exceptions explicit rather than asserting a universal desktop minimum.

The control room has a 72px header, a horizontally scrollable navigation row and a centered content area capped at 1720px with 28px gutters. Live preview and character cue share one frame: their desktop ratio is `minmax(0, 3fr) minmax(245px, 1fr)`. Logs and chat use two columns divided by a vertical rule. At 1150px the preview/cue stack, the cue uses a two-column internal layout and gutters become 18px. At 760px gutters become 14px, header links wrap, the cue returns to one column, forms/logs/chat stack, and the emergency action spans the width. Navigation buttons do not shrink; labels remain intact in the scrollable row, with an 8px icon gap. Mobile transport uses two equal columns of buttons at least 44px high and a full-width autonomy selector below. Icons do not shrink. Tables scroll within their own container.

Broadcast preview uses a 16:9 clipped composition; the standalone stream fills its output viewport. The laboratory scene occupies the whole field. Brand sits upper left, selected-content context upper right, source/model evidence insets down the left and character subtitles below the central action. Polls and game notices occupy the right side; sponsorship has an explicit AD label. The 9:16 composition moves context below the brand, evidence into a lower horizontal strip and subtitles toward the bottom. These layouts describe the existing output and do not replace the science monitor grid.

## Elevation & Depth

The workbench is flat, with depth conveyed by tonal surfaces, one-pixel dividers and the dark image wells. The modal evidence drawer is the one lifted surface: its leftward shadow is `-12px 0 28px #0003`. Active processing stages use `inset 0 -2px var(--model)` as an underline, not an ambient shadow. There are no decorative floating cards. The rendered laboratory uses physical lighting and cast shadows; this scene depth is separate from UI elevation.

**The The Flat Bench Rule.** Use borders and tonal differences for the workbench. Reserve the lateral shadow for the evidence drawer and the inset rule for the active processing stage.

## Shapes

Controls and the outer processing-stage group use small corners (`rounded.control`); monitor frames and joined stage segments stay square (`rounded.square`). Lines are generally one pixel. Circular geometry is reserved for the small live-capture status dot. The evidence drawer has a straight vertical edge. Data images and anatomy are clipped to their viewport rather than placed inside rounded cards.

## Components

### Buttons and source controls

Compact, explicit and easy to scan. Primary buttons use model mint with dark primary ink and medium weight. Secondary actions are transparent with the recurring line border; hovered actions use control graphite and the hover border. Chosen source buttons use selected fill and border; active mode and neuron buttons use mint text on the active fill. Borderless text and icon actions retain the same keyboard focus treatment. Disabled buttons use 0.45 opacity and the not-allowed cursor.

All primary interaction controls use a two-pixel mint `:focus-visible` outline with a three-pixel offset. The evidence context substitutes its darker focus color. Hover changes are immediate: the stylesheet does not define an animated transition duration.

### Fields

Selects use a filled control surface, small corners, one-pixel border and space for the native arrow. Range inputs and checkboxes use mint accent color. Parameters show labels and separate monospaced outputs with explicit units. Preserve native input behavior and visible labels; the science workbench uses selectors and ranges. The control room also has labelled text fields for demo viewer/message, content title and attribution, poll question/options and sponsor title; URL, file and number inputs cover destinations, media and limits. Text and numeric fields use `operator-field`, a one-pixel line border and a 38px desktop minimum height; mobile fields/selects use at least 44px and 16px type. Forms retain visible labels, native validation and the shared mint focus outline. Do not imply an inline error style that has not been implemented.

### Navigation and processing stages

Mode and neuron choices are compact button groups. The five processing stages form one connected segmented surface. Current stage state combines mint text, active fill and an inset bottom line, with a numeric index above each stage label. Stage and neuron selections expose `aria-pressed`; the parameter expander exposes `aria-expanded`.

Control-room navigation combines an inline icon and text, exposes `aria-current="page"`, and uses the existing active fill/mint text with a line border. It remains horizontally scrollable on narrow screens. Operator transport groups session, next-content, reaction-pause and voice controls; autonomy is a labelled native selector. Emergency safe mode remains available above the live frame and every panel.

### Broadcast and character

The program output has no operator navigation or editing controls. Its evidence insets explicitly say SOURCE and MODELLED; expanded anatomy says SOURCE + INFERRED. The character subtitle explicitly says CHARACTER and the brand declares FICTIONAL FLY. Runtime labels distinguish demo, standby, safe and disconnected output. Sponsor output declares AD; operator money views distinguish DEMO DATA from verified events. Use these visible states alongside color.

The fly is a faceted 3D creature at a real rendered desk with wings, legs, antennae and compound eyes. Reactions and output camera changes follow character state. Monitor light samples the actual content; the reduced-motion preference quiets character motion and disables the output camera director. Preserve the separation between this entertainment character and the verified skeleton viewer.

### Scientific classifications

Classification text is uppercase, monospaced and unboxed. SOURCE, MODELLED, INFERRED and MEASURED have stable colors and accompanying descriptions. These labels are evidence categories rather than pill filters. A structural-only optic-lobe view says SOURCE; enabling its available simulated overlay says SOURCE + INFERRED.

### Monitors, transport and response trace

Monitor containers share edges and contain a labeled heading, data viewport and compact footer. Timestamp, sample count and anatomy identity overlays use monospaced text; image text sits on a translucent dark backing. The source, retinal transform and feature history use the same processed frame. Pausing freezes computed data; source seeking clears temporal history. The anatomy camera remains independently inspectable.

The response plot uses mint ON, amber OFF and silver frame change on a shared dimensionless 0–2 vertical scale, with labelled 0, 1 and 2 guides. It holds up to 450 processed frames and is 150px tall at all viewport widths. The bitmap width follows the rendered CSS width so its 13px tick labels remain readable on mobile. Keep the shared-scale caption visible on mobile. No curve implies firing rate or recorded neural activity.

### Evidence inspector

A light modal drawer overlays the right edge at 390px maximum desktop width and full available width on mobile. It is not part of normal page flow. Opening moves focus to the source selector, locks page scrolling and makes the header and workbench inert. Tab stays inside, Escape closes, and close restores focus to the invoking control. The dialog has an accessible title and an explicit close button. Its source selector, citation links, structural-data explanation and limitations remain reachable when content scrolls.

### Anatomy

Verified skeletons form the visualization. Drag/scroll and keyboard arrows/plus/minus control the camera; a reset button restores the view. Camera damping is enabled at 0.1 and auto-rotation is disabled. Selection increases visibility; the activity overlay changes the selected skeleton's color and opacity from actual model features. Do not add independent decorative activity animation. The stylesheet honors reduced motion by disabling transitions and forcing automatic scroll behavior; this is not a claim that source video playback stops under that preference.

## Do's and Don'ts

### Do:

- Do keep source, transform and inference visibly classified.
- Do use the actual Plex weights and monospaced numeric roles recorded above.
- Do preserve shared frame and timestamp behavior when introducing visual output.
- Do retain the evidence drawer focus trap, Escape close, focus restoration and inert background.
- Do stack the monitors on narrow screens and keep the final 44px mobile control overrides.
- Do label response units and retain the shared trace scale and zero reference.
- Do retain labelled operator fields, horizontal navigation scrolling and the two-column mobile transport.
- Do keep demo, character, evidence and advertising labels explicit in broadcast output.

### Don't:

- Don't turn the instrument into a marketing page or a collection of nested cards.
- Don't add decorative gradients, glow, cyberpunk effects or unrelated neuronal animation.
- Don't imply that anatomy colors or inferred activity are measured neural recordings.
- Don't replace explicit state labels with color alone.
- Don't reintroduce provisional claims of wider image columns, a drawer in normal flow, universal shadowlessness or unimplemented type sizes.
