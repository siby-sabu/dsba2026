# Agricultural Analytics - Editorial Design Guide

## Design Philosophy

This application uses an editorial design language inspired by high-end magazine layouts and the "Grid Breaking" theme. The design emphasizes:

- **Typography-first**: Serif headers (Playfair Display) + Sans-serif body (Inter)
- **Minimalist color palette**: Warm neutrals and muted earth tones
- **Generous whitespace**: Clean, breathable layouts
- **Split-screen composition**: Map on left, editorial content on right
- **No unnecessary decoration**: Content and data take center stage

---

## Color Palette

### Primary Colors
```
Background:       #f8f7f4  (Warm off-white)
Text Primary:     #2c2418  (Dark warm brown)
Text Secondary:   #6b5d4f  (Muted brown)
Borders:          #e0ddd8  (Light warm gray)
```

### Accent Colors
```
Map Markers:
  Default:        #a89984  (Light muted brown)
  Hover:          #2c2418  (Dark brown)
  Selected:       #6b5d4f  (Muted brown)

Water Stress:
  Drought:        #c62828  (Red)
  Normal:         #2e7d32  (Green)
  Irrigated:      #1565c0  (Blue)
  Pest/Disease:   #e65100  (Orange)
```

---

## Typography

### Font Families
```css
Headers:  'Playfair Display', serif
Body:     'Inter', sans-serif
Mono:     monospace (for numeric data)
```

### Font Weights
```
Light:    300  (Inter only, for secondary text)
Regular:  400  (Default for both)
Medium:   500  (Inter, for emphasis)
Semibold: 600  (Inter, for labels)
Bold:     700  (Inter, for data values)
```

### Typography Scale
```
H1: 3.5rem / 56px  (Hero titles)
H2: 3rem   / 48px  (Section titles)
H3: 2.5rem / 40px  (State dialog title)
H4: 2rem   / 32px  (District card title)
H5: 1.5rem / 24px  (Subsection titles)
H6: 1.25rem/ 20px  (Small headers)

Body:     1.05rem / 17px  (Comfortable reading)
Small:    0.875rem/ 14px  (Captions, metadata)
Overline: 0.75rem / 12px  (Labels, uppercase)
```

### Letter Spacing
```
Headers:       -0.02em  (Tight, elegant)
Overlines:     0.1em    (Uppercase labels)
Body:          normal
```

---

## Layout Grid

### Split Screen Layout
```
Desktop (lg):  50% map | 50% content
Tablet (md):   60% map | 40% content  
Mobile (xs):   100% map stacked on 100% content
```

### Content Spacing
```
Section padding:    6rem (96px)  desktop
                    3rem (48px)  mobile
                    
Between sections:   8rem (128px) desktop
                    4rem (64px)  mobile

Grid gaps:          2-4rem (32-64px)
```

---

## Components

### 1. Header
- Clean serif title
- Uppercase overline with date range
- 1px bottom border

### 2. Map (Left Panel)
- Sticky position on desktop
- Muted Stamen Toner Lite tiles (50% opacity)
- Small circular markers (5-8px radius)
- Minimal controls with custom styling
- Dark tooltips on hover

### 3. Content Section (Right Panel)
- Scrollable editorial content
- Hero section with large serif headline
- Stats grid with Playfair Display numbers
- State cards with hover effects
- Selected district highlight box

### 4. State Dialog (Modal)
- Full-width modal (maxWidth: md)
- Header with serif title + close button
- Stats grid (4 columns)
- District cards grid (3 columns)
- Minimal borders, no shadows

### 5. District Card (Modal)
- Smaller modal (maxWidth: sm)
- Water stress badge at top
- Large serif numbers for key metrics
- Top crops list with monospace values
- Metadata footer

---

## Interactive States

### Hover Effects
```css
Transform:     translateY(-2px)
Transition:    all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
Border color:  #6b5d4f
```

### Map Markers
```
Default:   5px radius, #a89984 fill, 70% opacity
Hover:     7px radius, #2c2418 fill, 80% opacity
Selected:  8px radius, #6b5d4f fill, 80% opacity
```

### Buttons & Cards
```
Background:    transparent → slight tint on hover
Border:        #e0ddd8 → #6b5d4f on hover
Cursor:        pointer
```

---

## Spacing System

### Padding/Margin Scale (MUI spacing units)
```
xs:   8px   (1 unit)
sm:   16px  (2 units)
md:   24px  (3 units)
lg:   32px  (4 units)
xl:   48px  (6 units)
xxl:  64px  (8 units)
```

---

## Responsiveness

### Breakpoints
```
xs:  0px     (Mobile)
sm:  600px   (Tablet)
md:  900px   (Small desktop)
lg:  1200px  (Desktop)
xl:  1536px  (Large desktop)
```

### Mobile Adaptations
- Stack map above content
- Reduce hero font size (3.5rem → 2.5rem)
- Single column grids
- Reduce section padding (6rem → 3rem)

---

## Accessibility

### Contrast Ratios
```
#2c2418 on #f8f7f4:  WCAG AAA (>10:1)
#6b5d4f on #f8f7f4:  WCAG AA  (>4.5:1)
```

### Interactive Elements
- Minimum 44x44px touch targets
- Visible focus states
- Keyboard navigation support
- Screen reader labels

---

## Animation Guidelines

### Timing Functions
```
Standard:     cubic-bezier(0.4, 0, 0.2, 1)
Decelerate:   cubic-bezier(0.0, 0, 0.2, 1)
Accelerate:   cubic-bezier(0.4, 0, 1, 1)
```

### Duration
```
Fast:    150ms  (Tooltips, small changes)
Medium:  300ms  (Hover effects, cards)
Slow:    500ms  (Dialogs, large transitions)
```

### What to Animate
- Hover states (opacity, transform, border-color)
- Modal enter/exit
- Loading states
- NOT: Text reflow, layout shifts

---

## Map Styling

### Tile Layer
```
Provider:  Stamen Toner Lite (via Stadia Maps)
Opacity:   0.5 (muted to match editorial theme)
```

### Markers
```
Shape:      Circle
Size:       5-8px radius
Fill:       Muted browns (#a89984, #6b5d4f, #2c2418)
Stroke:     #f8f7f4 (background color)
Weight:     1.5px
```

### Controls
```
Background:  #f8f7f4
Border:      #e0ddd8
Border-radius: 0 (no rounded corners)
Hover:       #6b5d4f background
```

---

## Data Visualization

### Number Formatting
```
Large numbers:  3-digit grouping with Playfair Display
Decimals:       2 decimal places for yields, 0 for rainfall
Units:          Displayed inline, muted color
```

### KPI Cards
```
Layout:    Number above label
Font:      Playfair Display 2.5-3rem for number
Color:     #2c2418 for number, #6b5d4f for label
```

---

## File Structure
```
src/
├── App.js                              # Main app with split layout
├── App.css                             # Global editorial styles
├── components/
│   ├── map/
│   │   ├── IndiaMap.js                # Leaflet map component
│   │   └── DistrictPopup.js           # (Legacy, can remove)
│   ├── content/
│   │   └── ContentSection.js          # Right panel editorial content
│   ├── dialogs/
│   │   └── StateDialog.js             # State-level modal
│   ├── cards/
│   │   └── DistrictCard.js            # District-level modal
│   └── filters/
│       └── FilterPanel.js             # (Legacy, can remove)
└── api/
    └── client.js                       # API integration
```

---

## Design References

**Inspiration**: Grid Breaking editorial theme
**Typeface pairing**: Playfair Display + Inter
**Color inspiration**: Warm editorial neutrals
**Map style**: Minimalist cartography

---

## Next Steps

1. ✅ Editorial layout implemented
2. ✅ Typography system applied
3. ✅ Color palette integrated
4. ⏳ Test with real data (npm start)
5. ⏳ Fine-tune spacing and responsive breakpoints
6. ⏳ Add micro-interactions (loading states, smooth scrolls)

---

**Design Principle**: "Data storytelling through refined editorial design"
