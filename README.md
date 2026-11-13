# SWOT-TOWS Analysis: Strategy Synthesis Engine

Full-stack strategic planning dashboard for building a SWOT analysis, translating it into TOWS options, scoring strategic positioning on a six-axis radar chart, and exporting reports as a four-slide PDF deck, print-friendly JPG slide images, Word (`.docx`), Excel (`.xlsx`), or plain text (`.txt`).

## Features

- **Project Metadata & Expandable Objective**: Capture client/project, auto-resizing multi-line objective, and lead consultant.
- **Interactive SWOT Matrix**: Add and remove tags across Strengths, Weaknesses, Opportunities, and Threats.
- **TOWS Strategic Options**: Draft SO (Maxi-Maxi), WO (Mini-Maxi), ST (Maxi-Mini), and WT (Mini-Mini) strategies.
- **Strategic Positioning Radar**: Score Innovation, Market Penetration, Operational Agility, Financial Resilience, Brand Equity, and Talent Density from 0 to 100.
- **Executive Readout**: Document executive synthesis, strategic posture, and risk profile.
- **Grounded AI Brainstorming**: Generate structured SWOT, TOWS, posture, risk, and radar suggestions via the server-side `POST /api/gemini/brainstorm` endpoint powered by Gemini (`gemini-4-hydrogen`) and Google Search grounding, with a Google Search summary paste-and-extract fallback if the AI service is unavailable.
- **Multi-Format Report Export**: Use the expandable **Export** menu (`PDF Slide Deck`, `Print-Friendly JPG Images`, `Word`, `Excel`, or `Text`) to generate a four-slide PDF deck (`.pdf`), four high-resolution print-friendly slide images (`.jpg`), Word document (`.docx` with embedded radar chart), multi-sheet Excel workbook (`.xlsx`), or plain text report (`.txt`) once all mandatory fields and SWOT categories are populated.

## Tech Stack

- **Frontend**: HTML, Tailwind CSS (CDN), vanilla JavaScript, Chart.js, `html2canvas`, `jsPDF`, `docx`, `exceljs`, Font Awesome
- **Backend**: Node.js, Express, `@google/genai`, `dotenv`
- **Tooling**: TypeScript, Vite, `tsx`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example`):
   - `GEMINI_API_KEY`: Server-side Gemini API key (configured via **Settings > Secrets** in AI Studio or `.env` locally).
   - `PORT`: Optional server port (defaults to `3000`).
3. Run in development (Express + Vite middleware on port `3000`):
   ```bash
   npm run dev
   ```
4. Build and run in production:
   ```bash
   npm run build
   npm start
   ```
5. Type-check:
   ```bash
   npm run lint
   ```

## Workflow & Fallbacks

1. Fill in the required metadata (`Client / Project`, `Objective`, `Lead Consultant`) and click **Brainstorm with Gemini** to preview and apply an AI-generated draft, or enter items manually.
2. If the Gemini endpoint is unavailable or unconfigured, the modal automatically opens the **Google Search-Assisted Brainstorm** fallback where you can open a prepared search tab, paste a summary (with clipboard helper support), and extract structured insights locally.
3. Refine SWOT tags, TOWS quadrants, radar sliders, and executive readout fields.
4. Click **Export** and select **PDF Slide Deck**, **Print-Friendly JPG Images**, **Word**, **Excel**, or **Text** to download the report, or **Reset All** to clear the dashboard.

*Note: Frontend UI libraries load from CDNs, so internet access is required in the browser. Opening Google Search or reading the clipboard in fallback mode depends on browser popup and clipboard permissions.*

## Project Structure

```text
.
├── index.html        # Dashboard UI, radar chart, fallback parser, and PDF/JPG slide exports
├── src/exports.ts    # Word (.docx), Excel (.xlsx), and Text (.txt) report generators
├── server.ts         # Express server, Vite middleware, and /api/gemini/brainstorm
├── package.json      # Dependencies and dev/build/start/lint scripts
├── vite.config.ts    # Vite configuration
├── metadata.json     # Applet metadata and server-side Gemini capability
├── .env.example      # Environment variable template
└── README.md
```
