# Zola Deal Hunter

NYC real estate development deal-scoring tool. Analyzes Zola PLUTO export data to identify underbuilt lots in the Bronx (or any borough) that are attractive for acquisition, demolition, and rebuild.

## Features

- **Configurable Scoring Engine** — 6-factor weighted scoring system with user-editable weights, financial assumptions, deal criteria, premium zones, and land cost overrides
- **Dashboard** — KPI cards, score distribution chart, deal signal breakdown, top zipcodes, top opportunities
- **Deal Explorer** — sortable/filterable table with 3,780+ property records, search, pagination
- **Map View** — Leaflet map with NYC PLUTO lot polygons, color-coded by score or signal, real-time filtering (minROI, minFarGap, minUnits, meetsCriteria)
- **Capital Planner** — budget-based analysis showing affordable deals by ROI
- **Settings Panel** — full configuration UI for all scoring parameters, save & re-score all properties instantly
- **Excel Upload** — drag-and-drop any Zola export to analyze a new dataset

## Tech Stack

| Layer     | Technology                                          |
| --------- | --------------------------------------------------- |
| Frontend  | React 18, Vite, Tailwind CSS v3, shadcn/ui, wouter  |
| Backend   | Express 5, TypeScript (ESM)                         |
| Data      | xlsx parser, in-memory store, JSON config persistence |
| Maps      | react-leaflet v4, NYC PLUTO Carto API for lot polygons |
| Charts    | Recharts                                             |

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/        # Dashboard, Explorer, MapView, CapitalPlanner, Settings, PropertyDetail
│   │   ├── components/   # shadcn/ui components
│   │   ├── lib/          # queryClient, utils
│   │   └── hooks/        # useToast, useMobile
│   └── index.html
├── server/               # Express backend
│   ├── routes.ts         # API endpoints (config, properties, stats, map-data, upload, rescore)
│   ├── scoring.ts        # Configurable scoring engine
│   ├── excel-parser.ts   # Column-agnostic Zola Excel parser
│   ├── geocoder.ts       # NYC PLUTO Carto API batch geocoder
│   └── Bronx-Sheet-Zola.xlsx  # Default dataset (3,780 properties)
├── shared/
│   └── schema.ts         # UserConfig, Property, FilterParams types + Zod schemas
├── render.yaml           # Render deployment config
└── package.json
```

## API Endpoints

| Method | Path               | Description                                |
| ------ | ------------------ | ------------------------------------------ |
| GET    | /api/config        | Get current user config                    |
| PUT    | /api/config        | Update user config (persists to JSON file) |
| POST   | /api/rescore       | Re-score all properties with current config|
| GET    | /api/stats         | Dashboard summary statistics               |
| GET    | /api/properties    | Filtered, sorted, paginated property list  |
| GET    | /api/properties/:id| Single property detail                     |
| GET    | /api/filters       | Distinct values for filter dropdowns       |
| GET    | /api/top-deals     | Top deals by score                         |
| GET    | /api/capital-analysis | Budget-based deal analysis              |
| GET    | /api/map-data      | GeoJSON FeatureCollection with lot polygons|
| POST   | /api/upload        | Upload new Excel file                      |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (frontend + backend on port 5000)
npm run dev

# Open http://localhost:5000
```

## Build & Production

```bash
# Build frontend + backend
npm run build

# Start production server
npm start
```

## Deploy to Render

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint** and connect your GitHub repo
4. Render will detect `render.yaml` and set up the service automatically
5. Or manually: **New → Web Service**, connect repo, set Build Command to `npm install && npm run build` and Start Command to `npm start`

The app serves both the API and the static frontend from the same Express server on port 5000 (Render's default).

## Deploy Frontend to Vercel (Optional)

If you want to split frontend to Vercel and backend to Render:

1. Deploy the backend to Render first (see above)
2. Note your Render URL (e.g. `https://zola-deal-hunter.onrender.com`)
3. In `client/src/lib/queryClient.ts`, update the `API_BASE`:
   ```ts
   const API_BASE = "https://zola-deal-hunter.onrender.com";
   ```
4. Create a `vercel.json` in the project root:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist/public",
     "framework": null
   }
   ```
5. Deploy to Vercel, pointing at this repo

> **Note:** The simplest approach is to deploy everything to Render as a single service — the `render.yaml` is already configured for this.

## Configurable Parameters

All of these are editable from the Settings page:

- **Financial Assumptions** — Construction $/SF, Demolition $/SF, GDV Residential $/SF, GDV Commercial $/SF, Default Land Cost $/SF
- **Scoring Weights** — FAR Utilization, Unit Potential, Lot Size, Building Age, Owner Type, Zoning Premium (must sum to 100%)
- **Deal Criteria** — Min Score, Min ROI, Min FAR Gap, Min Potential Units, Lot Area range, Max Project Cost, Exclude Protected
- **Land Cost Overrides** — Per-zone $/SF rates (20 zones pre-configured)
- **Premium Zones** — Zones that get max zoning score (17 zones pre-configured)
- **Lot Size Sweet Spot** — Min/Max range for ideal lot sizes

## License

MIT
