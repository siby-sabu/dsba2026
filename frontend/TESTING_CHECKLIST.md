# Testing Checklist - State Click Feature

## 🔧 Before Testing

### 1. Ensure Backend is Running
```bash
# Terminal 1: Start backend
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026
cd src/api
uvicorn main:app --reload
```

**Expected**: Server running at http://localhost:8000

### 2. Start Frontend
```bash
# Terminal 2: Start frontend
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/frontend
npm start
```

**Expected**: Opens http://localhost:3000

---

## ✅ Testing Steps

### Test 1: Visual Verification
**What to check:**
- [ ] Map loads with district markers (brown dots)
- [ ] Map shows India centered
- [ ] State labels visible (Punjab, Kerala, etc.)
- [ ] Map has zoom controls (+/-)

**If fails**: Check browser console for errors

---

### Test 2: State Regions Visible
**What to check:**
- [ ] Hover over any state area (not just markers)
- [ ] State region should highlight slightly
- [ ] Tooltip appears showing state name
- [ ] Tooltip says "X districts • Click to explore →"

**Where to test:**
- Try Kerala (southwest coast)
- Try Punjab (north)
- Try Maharashtra (west coast)

**If fails**: 
- Open browser console (F12)
- Look for errors
- Check if polygons are rendering

---

### Test 3: State Click Opens Panel
**What to do:**
1. Click on Kerala region (southwest India)
2. Watch for StatePanel to slide in from left

**Expected behavior:**
- [ ] Panel slides in from left (smooth animation)
- [ ] Panel shows "Kerala" at top
- [ ] Statistics displayed: Districts, Crops, Rainfall
- [ ] Dominant crops tags appear
- [ ] District list shows (scrollable)

**Console check:**
- Open browser console (F12)
- Click Kerala
- Should see: "State clicked: Kerala"

**If fails:**
- Check console for JavaScript errors
- Verify API is returning data
- Try clicking district markers instead

---

### Test 4: District List Interaction
**What to do:**
1. With Kerala panel open
2. Scroll district list
3. Click any district (e.g., "Thiruvananthapuram")

**Expected behavior:**
- [ ] District list is scrollable
- [ ] Hover over district shows highlight
- [ ] Click district opens DistrictCard modal
- [ ] Modal shows district details

**Console check:**
- Should see: "District clicked: Thiruvananthapuram"

---

### Test 5: State Switching
**What to do:**
1. Click Kerala → Panel opens
2. Click Punjab (on map) → Panel updates
3. Click Tamil Nadu → Panel updates

**Expected behavior:**
- [ ] Panel updates instantly to new state
- [ ] Previous state deselects
- [ ] New state highlights on map
- [ ] District list updates

---

### Test 6: Panel Controls
**What to do:**
1. Click collapse button (▼) → Panel minimizes
2. Click expand button (▲) → Panel expands
3. Click close button (X) → Panel closes

**Expected behavior:**
- [ ] Collapse: Panel shrinks, state stays selected
- [ ] Expand: Panel reopens
- [ ] Close: Panel closes, state deselects

---

### Test 7: Browser Console Logs
**Open Console (F12) and check:**

When clicking state:
```
State clicked: Kerala
```

When clicking district marker:
```
District clicked: Thiruvananthapuram
```

When clicking district in panel:
```
District clicked: Thiruvananthapuram
```

---

## 🐛 Troubleshooting

### Issue: State regions not visible
**Fix:**
- States have very light overlay (5% opacity)
- Try hovering to see highlight (15% opacity)
- Look for slight gray overlay over state areas

### Issue: Click not working
**Check:**
1. Is backend running? (http://localhost:8000/health)
2. Are there console errors?
3. Try clicking district markers instead
4. Try refreshing page (Cmd+R)

### Issue: Panel not appearing
**Check:**
1. Console for "State clicked: [name]" message
2. Check if StatePanel.js is imported in App.js
3. Check statePanelOpen state value
4. Try clicking multiple times

### Issue: API errors
**Fix:**
```bash
# Check backend health
curl http://localhost:8000/health

# Check states endpoint
curl http://localhost:8000/api/v1/states

# Check districts endpoint
curl http://localhost:8000/api/v1/districts
```

---

## 📊 Visual Reference

### What You Should See:

**1. Default Map**
```
- Muted beige/brown map
- Brown circular district markers
- State labels (Punjab, Kerala, etc.)
- Light gray state boundaries
```

**2. State Hover**
```
- State area highlights (light brown overlay)
- Tooltip appears: "Kerala - 13 districts • Click to explore →"
- Cursor changes to pointer
```

**3. State Selected**
```
- State area highlighted (darker brown, 25% opacity)
- StatePanel slides in from left (420px wide)
- District markers in state highlighted
- Panel shows state statistics
```

**4. StatePanel Content**
```
┌────────────────────────┐
│ STATE OVERVIEW    [▲][X]│
│ Kerala                 │
├────────────────────────┤
│ 13       62            │
│ Districts Crops        │
│                        │
│ Dominant Crops:        │
│ [Rice] [Coconut]       │
│                        │
│ Districts (13)         │
│ [Thiruvananthapuram →] │
│ [Kollam             →] │
│ [Alappuzha          →] │
└────────────────────────┘
```

---

## 🎯 Success Criteria

All must pass:
- [x] Map loads correctly
- [x] State regions are visible (even if subtle)
- [x] Hover shows tooltip with state name
- [x] Click state opens StatePanel
- [x] Panel shows correct state data
- [x] District list is clickable
- [x] Console logs show clicks
- [x] Panel controls work (collapse/close)
- [x] Can switch between states

---

## 🔍 Detailed Debugging

### Step 1: Check React DevTools
1. Open React DevTools (F12 → React tab)
2. Find `<App>` component
3. Check state:
   - `selectedState`: Should show state name when clicked
   - `statePanelOpen`: Should be `true` when panel visible
   - `districts`: Should have 515 items

### Step 2: Check Network Tab
1. Open Network tab (F12 → Network)
2. Click a state
3. Check for API calls:
   - `/api/v1/insights/state/Kerala`
   - `/api/v1/districts?state=Kerala`
4. Both should return 200 OK

### Step 3: Check Element Inspector
1. Open Elements tab (F12 → Elements)
2. Search for "leaflet-interactive" class
3. Should see multiple `<path>` elements (state polygons)
4. Check if they have `fill-opacity` > 0

### Step 4: Force Panel Open (Manual Test)
Add this temporarily to App.js:
```javascript
useEffect(() => {
  // Force open panel for testing
  setTimeout(() => {
    setSelectedState('Kerala');
    setStatePanelOpen(true);
  }, 2000);
}, []);
```

If panel appears after 2 seconds, click is the issue.
If panel doesn't appear, StatePanel component has issues.

---

## 📞 Report Results

After testing, report:
1. Which tests passed ✅
2. Which tests failed ❌
3. Console error messages (if any)
4. Screenshots of issues
5. Browser version (Chrome, Firefox, Safari)

---

## 🚀 Quick Test Script

Run this in browser console:
```javascript
// Test 1: Check if states loaded
console.log('States:', document.querySelectorAll('.leaflet-interactive').length);

// Test 2: Check panel exists
console.log('Panel element:', document.querySelector('[class*="StatePanel"]'));

// Test 3: Simulate click (replace 'Kerala' with visible state)
// This won't work via console, but shows how clicks propagate
```

---

**Ready to test?** Open http://localhost:3000 and start with Test 1!
