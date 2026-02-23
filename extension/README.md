# Job Tracker Assistant (Chrome Extension)

This extension extracts job data from a LinkedIn job page and opens the app with either:
- prefilled create dialog (`Open in App`)
- direct create trigger (`Create in DB`)

## Load Unpacked

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension` folder in this repository

## Usage

1. Open a LinkedIn job page.
2. Click the extension icon.
3. Verify extracted fields in the popup.
4. Set **App URL**:
- Local: `http://localhost:3000`
- Production: `https://job-application-tracking-app.vercel.app`
5. Choose one action:
- **Open in App**: opens the prefilled create dialog.
- **Create in DB**: opens the app and auto-creates the entry (requires existing app session and role/company fields).

The app receives prefill data via query parameters and can auto-submit to `/api/applications`.
