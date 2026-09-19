# Student Inquiry Management

Inquiry, Demo & Admission Tracking System for an education centre.

Runs at **₹0/month**:

- Frontend: HTML / CSS / JavaScript (GitHub Pages)
- Database: Google Sheets
- Backend: Google Apps Script Web App
- WhatsApp: free `wa.me` click-to-chat

This repo is meant to stay **local** until you upload it yourself. No git push is required.

---

## Open locally (no Google needed for a first look)

1. Open the folder `student-inquiry-management`
2. Start a simple local server in that folder, for example:

```powershell
cd C:\Users\Harsh.patel\Downloads\student-inquiry-management
python -m http.server 8080
```

3. Open [http://127.0.0.1:8080](http://127.0.0.1:8080)

Do **not** double-click `index.html` if you want Google Sheet data. The browser blocks that. Use the local server.

`js/config.js` is already pointed at your last Apps Script URL:

```text
https://script.google.com/macros/s/AKfycbxOviEDTc3cEA1XcFEB3NkLfI_7Wa5lsTGGddXa2X7ZTDf286d096Rm-WGbKSRZyHPk/exec
DEMO_MODE: false
REQUIRE_GOOGLE_AUTH: false
```

If the sheet is empty or the URL changed, use **Settings** in the app, or turn **Demo mode** on to try the UI with sample data in this browser tab only.

---

## Google setup (your last working files)

Copy these files into the Apps Script project bound to your Sheet:

| File | Paste into Apps Script as |
|---|---|
| `apps-script/Code.gs` | `Code.gs` |
| `apps-script/Config.gs` | `Config.gs` |
| `apps-script/Database.gs` | `Database.gs` |
| `apps-script/GoogleForm.gs` | `GoogleForm.gs` |
| `apps-script/Auth.gs` | `Auth.gs` |

### Step 1 — Create the Google Sheet

Create a spreadsheet named **Student Inquiry Management**.

### Step 2 — Create required sheets

In Apps Script (Extensions → Apps Script) run **`setupDatabase`** once.

It creates:

- Inquiries
- Centres
- MessageTemplates
- Settings
- AuditLog
- GoogleFormRaw
- Users

Default centres: **Himatnagar**, **Modasa**.

### Step 3 — Apps Script files

Paste the five `.gs` files listed above. Click **Save**.

In `Config.gs` keep:

```javascript
REQUIRE_GOOGLE_AUTH: false,
```

until Google sign-in is ready.

### Step 4 — Deploy as Web App

1. **Deploy → New deployment** (or **Manage deployments → Edit → New version**)
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy, then copy the URL ending in `/exec`

If you change `Code.gs`, you must deploy a **new version**. Saving is not enough.

### Step 5 — Put the URL in the frontend

Paste it into `js/config.js` → `API_URL`, and set `DEMO_MODE: false`.

Or paste it in the app **Settings** page (stored in this browser tab).

### Step 6 — Create the Google Form

Questions (use **exactly these titles**):

- Student Name
- Student Surname
- Parent Name
- Parent Surname
- Standard (dropdown: Nursery, LKG, UKG, 1–12, Other)
- Mother Name
- Mother Number
- Father Name
- Father Number
- School Name
- School Timing
- Centre Name (dropdown: Himatnagar, Modasa)

Do **not** ask for Source. The backend sets `Source = Google Form`.

### Step 7 — Link form responses to the same Sheet

Form → Responses → Google Sheets icon → **Select existing spreadsheet**.

Tab name should be **Form Responses 1**. If not, change `FORM_RESPONSE_SHEET_NAME` in `Config.gs`.

### Step 8 — Trigger

Apps Script → Triggers → Add trigger:

- Function: `onFormSubmit`
- Event source: From spreadsheet
- Event type: On form submit

Manual backup: app page **Google Form Data → Sync Now**.

Duplicates are skipped using a hash in `sourceRecordId`.

### Step 9 — Upload to GitHub yourself

Do **not** need git from this computer. On github.com:

1. Create a public repo
2. Upload all files (`index.html` must be in the repo root)
3. Settings → Pages → Deploy from branch `main` / root
4. Open `https://YOUR-USERNAME.github.io/REPOSITORY/`

### Step 10 — After Pages is live

In `Config.gs` add your Pages URL to `ALLOWED_ORIGINS`, save, **new version** deploy.

---

## How data flows

**Google Form**

Form → Form Responses sheet → Apps Script → Inquiries (`Source = Google Form`) → app

**Staff add**

App → Add Inquiry → Apps Script → Inquiries (`Source = Self`) → app

Both appear on the same Inquiries page.

---

## WhatsApp

Uses `https://wa.me/91XXXXXXXXXX?text=...`  
10-digit Indian numbers get country code `91`.  
Templates fill `{student_name}`, `{parent_name}`, `{centre_name}`, `{school_name}`, `{standard}`, `{demo_date}`.  
The page cannot send WhatsApp silently. You press Send in WhatsApp.

---

## Security

- Never put service-account JSON, passwords, or private keys in this frontend.
- GitHub Pages is public/static.
- `REQUIRE_GOOGLE_AUTH: false` is for first connection. For production, set it true, add people to the **Users** sheet (`email`, `name`, `role`, `active`), and set `GOOGLE_CLIENT_ID`.
- A client-side Admin/Staff dropdown is only for local testing.

---

## Roles

- **Admin**: add, edit, delete, export, centres, templates, settings, seed/clear demo
- **Staff**: view, add, edit, WhatsApp (no delete / no settings)

---

## Demo sample data

Settings → Load sample data creates 10 fictional inquiries:

- 5 Pending
- 3 Admission OK
- 2 Admission Not OK
- mix of Google Form and Self
- 5 with demo attendance

Use **Remove demo data** to delete `createdBy = demo` rows.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `/exec` JSON works in a tab, app shows error | Need JSONP `Code.gs` + new version deploy, access = Anyone |
| 401 | Who has access must be **Anyone**, not Only myself |
| Empty dashboard | Sheet has no rows, or demo data cleared |
| CORS | App uses JSONP GET, not `fetch` POST from localhost |
| Form not importing | Question titles must match `FORM_MAP`; add `onFormSubmit` trigger |
| Old URL | Deploy new version and update `API_URL` |
