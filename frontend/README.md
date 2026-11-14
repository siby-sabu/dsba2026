# Agricultural Analytics Frontend

React-based frontend for visualizing Indian crop yield and climate data.

## Setup

### Prerequisites
- Node.js 18+ and npm
- Backend API running at http://localhost:8000

### Installation

```bash
cd frontend
npm install
```

This will install:
- `react` & `react-dom` - React framework
- `react-leaflet` & `leaflet` - Interactive maps
- `recharts` - Charts
- `@mui/material` - UI components
- `axios` - HTTP client

### Run Development Server

```bash
npm start
```

Opens at: http://localhost:3000

## Features

### Interactive Map
- 515 district markers across India
- Click any marker to view insights
- Color-coded for selection/hover states
- Zoom and pan controls

### District Insights Popup
Shows when you click a district marker:
- **Water Stress**: Drought/Normal/Irrigated/Pest-Disease
- **Rainfall**: Average annual precipitation
- **Vegetation Health**: NDVI score and health level
- **Top 3 Crops**: By area with average yield

### Filters (Sidebar)
- **State Filter**: View districts from a specific state
- **District Count**: Shows filtered district count
- **Selected District**: Highlights selected district info
- **Map Legend**: Explains marker colors

## Project Structure

```
frontend/
├── public/
│   └── index.html              # HTML template with Leaflet CSS
├── src/
│   ├── index.js                # React entry point
│   ├── App.js                  # Main app component
│   ├── App.css                 # Global styles
│   ├── api/
│   │   └── client.js           # Axios API client
│   └── components/
│       ├── map/
│       │   ├── IndiaMap.js     # Leaflet map with markers
│       │   └── DistrictPopup.js # Popup content with insights
│       └── filters/
│           └── FilterPanel.js   # Sidebar filters
└── package.json                # Dependencies
```

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000/api/v1`:

### Endpoints Used:
- `GET /states` - List all states
- `GET /districts?state={state}` - List districts (filterable)
- `GET /insights/district/{district_id}` - District insights for popup

### Configuration:
Set API URL via environment variable:
```bash
REACT_APP_API_URL=http://localhost:8000/api/v1 npm start
```

## Components

### IndiaMap.js
- Renders interactive Leaflet map
- Centers on India (20.5937°N, 78.9629°E)
- Creates CircleMarker for each district
- Handles hover and click events

### DistrictPopup.js
- Fetches insights from API on open
- Displays water stress badge
- Shows rainfall and vegetation stats
- Lists top 3 crops by area

### FilterPanel.js
- State dropdown filter
- District count display
- Selected district info
- Map legend

## Styling

### Color Scheme:
- **Primary Green**: #2e7d32 (agriculture theme)
- **District Markers**: #4caf50 (green)
- **Selected**: #1976d2 (blue)
- **Hover**: #ff9800 (orange)

### Water Stress Badges:
- **Drought**: Red (#c62828)
- **Normal**: Green (#2e7d32)
- **Irrigated**: Blue (#1565c0)
- **Pest/Disease**: Orange (#e65100)

## Data Flow

1. **App.js** loads states and districts on mount
2. User selects state → filters districts
3. User clicks map marker → sets selectedDistrict
4. **DistrictPopup** fetches insights from API
5. Insights displayed in popup with styled badges

## Development Tips

### Hot Reload
React Scripts provides hot reload - changes auto-refresh

### Debug API Calls
Open browser DevTools → Network tab to see API requests

### Test Without Backend
Mock the API client in `src/api/client.js` to return dummy data

### Add New Features
- Create new components in `src/components/`
- Import and use in `App.js`
- Style in `App.css` or component CSS

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### API Connection Error
- Check backend is running: `curl http://localhost:8000/health`
- Check CORS is enabled in FastAPI (already configured)
- Check browser console for errors

### Map Not Loading
- Check Leaflet CSS is loaded in `public/index.html`
- Check coordinates are valid (lat/lon not reversed)
- Open browser console for errors

### Markers Not Showing
- Check `districts` prop has data
- Check each district has `centroid_lat` and `centroid_lon`
- Check coordinates are not null/undefined

## Production Build

```bash
npm run build
```

Creates optimized build in `build/` folder.

To serve:
```bash
npx serve -s build -p 3000
```

Or deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag `build/` folder to Netlify
- **GitHub Pages**: Push `build/` to gh-pages branch

## Next Steps

1. ✅ Basic map with district markers
2. ✅ District insights popup
3. ✅ State filter
4. ⏳ Add year/season filters
5. ⏳ Add crop filter
6. ⏳ Add charts (Recharts line/bar charts)
7. ⏳ Add drought-prone filter (special filter)
8. ⏳ Add state detail page (routing)

See `docs/07_WEB_APPLICATION_IMPLEMENTATION_PLAN.md` for complete roadmap.
