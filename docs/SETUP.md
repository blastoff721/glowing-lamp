# Virasat Diwali Anka: setup and testing

Do these steps in order. Steps 1 and 2 must be finished **before** the new code goes live,
otherwise the order form will say "We could not start your order".

---

## 0. Cover image
Already added: `assets/img/virasat-cover.jpg` (price removed). To change it, replace that file
with a portrait JPG under 400 KB, same name.

---

## 1. Order sheet (Google Sheets + Apps Script)

1. Create a new Google Sheet called **Virasat Orders** (keep it separate from the ticket sheet).
2. In the sheet: **Extensions → Apps Script**. Delete what is there and paste all of
   `docs/google-apps-script.gs`.
3. Make a secret: any long random password (30+ letters and numbers, no spaces).
   Put it in line `const SECRET = '...'`. Click **Save**.
4. **Deploy → New deployment** → type **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click Deploy and allow access. Copy the **Web app URL** (ends with `/exec`).
5. Check it: open that URL in a browser. It should say *"Virasat order sheet is running."*

The sheet creates two tabs by itself on the first order:
- **Orders**: paid orders only. This is the shipping list. Fill in *Posted on* and
  *Speed Post no.* when you post, then send that number to the buyer on WhatsApp.
- **Pending**: people who started an order but did not pay. Do not ship these.

> If you ever change the script, use **Deploy → Manage deployments → Edit → Version: New version**
> so the URL stays the same.

---

## 2. Vercel settings
Vercel → your project → **Settings → Environment Variables**. Tick **Production** and **Preview**.

| Name | Value | Status |
|---|---|---|
| `PHONEPE_CLIENT_ID` | from PhonePe | already there |
| `PHONEPE_CLIENT_VERSION` | from PhonePe | already there |
| `PHONEPE_CLIENT_SECRET` | from PhonePe | already there |
| `PHONEPE_MERCHANT_ID` | from PhonePe | already there |
| `SHEET_WEBHOOK_URL` | the Web app URL from step 1.4 | **new** |
| `SHEET_SECRET` | the same secret as in step 1.3 | **new** |
| `PHONEPE_ENV` | `sandbox` (Preview only, and only with PhonePe **test** keys) | optional |
| `PHONEPE_WEBHOOK_USERNAME` / `PHONEPE_WEBHOOK_PASSWORD` | see step 5 | optional |

---

## 3. Upload the code to GitHub (on a test branch first)

On github.com/blastoff721/glowing-lamp:

1. **Add file → Upload files**. Drag in everything from this folder **except** `node_modules`
   and `.git`. Same names are replaced automatically.
2. At the bottom choose **"Create a new branch for this commit"**, name it `virasat`, then
   **Propose changes**. Do not merge yet.
3. Switch to the `virasat` branch and delete the old files no longer used
   (open each one → **…** menu → **Delete file**; for the folder use **Delete directory**):
   `static/` (whole folder), `checkout.html`, `faliure.html`, `Yuddhakand_Banner.jpeg`,
   `asset-manifest.json`, `.htaccess`.

Vercel builds the branch and shows a **Preview** link (on the pull request, or under
Vercel → Deployments).

---

## 4. Test on the Preview link

| # | Do this | You should see |
|---|---|---|
| 1 | Open the preview link on your phone | New home page, one big *Purchase Virasat Diwali Anka 2026* button, no Aranyakand button |
| 2 | Tap the ☰ menu, open Magazine | Virasat with contents list, then Itihaasa Issue 1 |
| 3 | Open `<preview link>/Magazine` (capital M) directly | Magazine page, **not** a 404 |
| 4 | Open `<preview link>/checkout.html` | It sends you to the Virasat order page |
| 5 | On the order page press Pay with everything empty | Red borders + "Please enter your full name." |
| 6 | Use + / − on copies | Total changes 349 → 698 → 1,047 … (max 10) |
| 7 | Fill everything, tick the box, Pay | PhonePe payment page opens showing **₹349 × copies** |
| 8 | Look at the sheet **before** paying | A row in **Pending** with the address |
| 9 | Complete payment (sandbox, or a real ₹349 you refund later from the PhonePe dashboard) | Success page: *Payment confirmed*, transaction ID, order ID, copies, amount, Speed Post note |
| 10 | Look at the sheet | The row moved from **Pending** to **Orders** with the transaction ID |
| 11 | Refresh the success page 2–3 times | Still only **one** row in Orders |
| 12 | Start another order but cancel on PhonePe | Success page says *Payment not completed* + Try again; nothing new in Orders |
| 13 | Footer → Shipping Policy | The shipping policy page |

If step 7 fails: Vercel → Deployments → the preview → **Functions / Logs** shows the reason
(usually a missing or misspelt environment variable).

When everything passes: open the pull request and **Merge**. The live site updates in about a minute.
Do one real order on www.itihaasa.in to confirm.

---

## 5. (Recommended) PhonePe webhook
So a paid order reaches the sheet even if the buyer closes the browser before the success page loads.

PhonePe dashboard → Developer settings → **Webhook**:
- URL: `https://www.itihaasa.in/api/webhook`
- Username and password: choose any; add the same two in Vercel as
  `PHONEPE_WEBHOOK_USERNAME` and `PHONEPE_WEBHOOK_PASSWORD`.
- Event: **checkout.order.completed**

Without it the system still works: such orders show in the PhonePe dashboard and stay in
**Pending**. Check Pending against the PhonePe dashboard once a day.

---

## Changing things later
- **Price**: `api/_lib.js` (the real price) **and** `assets/js/order.js` (`PRICE`, display only),
  plus the "Rs 349" text in the HTML pages.
- **Description / contents**: `magazine.html`, `index.html`, `virasat.html`.
- **Shipping times**: `shippingpolicy.html`.
