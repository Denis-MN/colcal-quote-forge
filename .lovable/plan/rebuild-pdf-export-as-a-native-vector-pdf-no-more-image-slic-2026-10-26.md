# Rebuild PDF export as a native vector PDF (no more image slicing)

## Problem
The current export screenshots the preview (`html2canvas`) and slices the image into A4 pages. This causes:
- Big empty gaps at the bottom of pages (cuts happen early at block boundaries)
- No page numbers
- Product table header appears only on page 1

The user asked to move away from rendering the PDF as an image. (pdf.js is a PDF *viewer*, so the fix is generating a real text/vector PDF with jsPDF instead of screenshotting.)

## Approach
Replace `generatePDF` in `src/components/QuotationForm.tsx` with a native jsPDF document builder using `jspdf-autotable` (new dependency). Content flows page-to-page automatically — no slicing, no gaps.

### What gets drawn programmatically (mirrors the on-screen preview)
1. **Header (page 1):** logo image (existing imported asset), tagline, "QUOTATION", number, date — with the teal brand rule below.
2. **Contact block:** Email / Phone / Website / Address (Ruai, Kangundo rd, Opposite Shell Petrol Station).
3. **Bill To:** customer info grid.
4. **Project title** ("Quotation for ...") when present.
5. **Intro text** and **Technical Specifications / Project Overview** (multi-line text wrap).
6. **Products table via autoTable:** columns #, Product, Description, Qty, Unit Price (KES), Total (KES).
   - `head` repeats automatically on every page (built-in autotable behavior) — solves the repeated header request.
   - Product images drawn into the Product cell via `didDrawCell` (data URLs work directly).
   - `pageBreak: 'auto'`, row splitting avoided (`rowPageBreak: 'avoid'`) so rows never cut mid-line.
7. **Price summary:** Subtotal, Installation, VAT (16%, only when the include-tax checkbox is on, products only), Total Payable.
8. **Why Choose Colcal Machinery?** paragraph + the four checkmark bullets.
9. **Payment details:** LIPA NA MPESA (Paybill 880100 / Account 308388) and BANKING DETAILS (NCBA BANK KENYA PLC — all-caps formatting as currently shown).
10. **Prepared by / signature:** sales rep details, signature image (or signature line), date.
11. **Footer** on every page: thin brand rule, sentence-case tagline, website / email / tel line, and **"Page X of Y"** right-aligned (page numbers via `didDrawPage`, total filled in at the end with `getNumberOfPages`).

### Technical details
- Add dependency: `bun add jspdf-autotable` (jsPDF already present).
- Brand colors defined once as RGB constants (teal primary `hsl(196 67% 33%)` → rgb(31 127 141), etc.) — no hardcoding elsewhere.
- Reuse existing state/values: `customerInfo`, `salesRepInfo`, `projectTitle`, `introText`, `projectDetails`, `products`, `installationCost`, `includeTax`, `calculateSubtotal/VAT/Total`, `quotationNumber`, `date`, `formatCurrency`.
- Track `cursorY` and call `addPage()` when a block won't fit; use `doc.lastAutoTable.finalY` after the products table.
- File size stays tiny (vector text + compressed JPEG images only) — well under the 30MB target; quality is sharper than the screenshot approach.
- The 1024px width forcing / html2canvas code and the crop/break-point logic are removed.
- The on-screen preview (HTML) stays exactly as it is — only the exported PDF changes.
- Minor expected visual difference: the PDF uses standard fonts (Helvetica) with the same brand colors and layout order; text in the PDF becomes selectable/copyable.

## Verification
- Build passes (build-errors.log clean).
- Generate a PDF in Playwright from the live preview with several products and long descriptions, force 3+ pages, then render pages to images and check: table header on every page, "Page X of Y" footer, no large bottom gaps, no sliced rows, signature/product images present.
