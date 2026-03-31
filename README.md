# SWOT-TOWS Analysis App

Browser-based strategic planning dashboard for building a SWOT analysis, translating it into TOWS options, scoring strategic posture on a radar chart, and exporting the result as a presentation-style PDF deck.

👉 You can explore the live application rendered from this repository’s source code at: https://aistudio.google.com/apps/2567c7ce-3835-409b-a37a-508372727390?fullscreenApplet=true&showPreview=true&showAssistant=true

The current app is implemented as a single static file: [index.html](./index.html).

## What It Does

- Capture strengths, weaknesses, opportunities, and threats as interactive tags
- Draft SO, WO, ST, and WT strategies in a TOWS matrix
- Score strategic positioning across six dimensions:
  - Innovation
  - Market penetration
  - Operational agility
  - Financial resilience
  - Brand equity
  - Talent density
- Write an executive synthesis, strategic posture, and risk profile
- Export a four-slide PDF strategy deck
- Optionally generate AI suggestions with Gemini + Google Search grounding when an API key is configured
- Fall back to a Google Search-assisted extraction flow when no Gemini key is available

## Tech Stack

- Plain HTML, CSS, and JavaScript
- Tailwind CSS via CDN
- Chart.js for the radar chart
- `html2canvas` + `jsPDF` for PDF export
- Font Awesome for icons
- Gemini API for grounded brainstorming
- Google Search as the no-key fallback input source

## Running Locally

No build step or package install is required.

1. Clone or download this repository.
2. Open [index.html](./index.html) in a modern browser.

If you prefer serving it locally instead of opening the file directly, you can use any simple static server.

## AI Brainstorming Setup

The app supports two brainstorming modes.

### Mode 1: Gemini + Google Search Grounding

If a Gemini API key is available, the app uses Gemini to generate a structured SWOT/TOWS draft and can ground the response with Google Search.

In [index.html](./index.html), the app checks `window.GEMINI_API_KEY` first and then falls back to the local `apiKey` constant.

To enable this mode, inject `window.GEMINI_API_KEY` before the app runs or replace the `apiKey` value with a valid Gemini API key.

### Mode 2: Google Search Fallback

If no Gemini API key is configured, the brainstorm button switches to a Google Search fallback flow:

1. The app opens a prepared Google search query in a new tab.
2. You copy a Google AI overview or useful search summary.
3. You paste that text back into the app.
4. The app heuristically extracts SWOT items, TOWS options, posture, risk, and radar values.

Important: because this is a static browser app, it cannot directly scrape or read Google Search pages automatically. The fallback is assisted, not fully autonomous.

## How To Use

1. Enter the required project metadata: client/project, objective, and lead consultant.
2. Add SWOT items by typing into each input and pressing `Enter`.
3. Use the brainstorm button if you want AI/search assistance.
4. With a Gemini key, the app generates a grounded draft directly.
5. Without a Gemini key, the app opens Google Search and lets you paste back the result for extraction.
6. Review and apply the generated insights if needed.
7. Fill in or refine the TOWS strategy areas.
8. Adjust the six radar sliders to reflect the current strategic posture.
9. Write or refine the executive synthesis, strategic posture, and risk profile.
10. Click `Generate Strategy Deck` to export the PDF once all required fields are complete.

## Notes

- The export button stays disabled until all required fields and SWOT sections are populated.
- `Reset All` clears the full dashboard state.
- External libraries are loaded from CDNs, so internet access is required unless those dependencies are vendored locally.
- The Google Search fallback may need popup permission to open a new tab.
- The clipboard helper in the fallback flow depends on browser clipboard permissions.

## Project Structure

```text
.
|-- index.html
`-- README.md
```
