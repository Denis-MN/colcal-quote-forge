## Goal
Make the entire app comfortable to use on phones (≤640px), while keeping desktop layout intact. PDF rendering is unaffected — it's already forced to 1024px width during export.

## Scope of changes (UI/presentation only)

### 1. Page shell & header (`QuotationForm.tsx`)
- Reduce outer padding on mobile: `py-8` → `py-4 sm:py-8`, `px-4` stays.
- Header row: stack title and Logout button on mobile (`flex-col sm:flex-row`, `gap-3`), shrink title `text-2xl sm:text-3xl`.
- Tabs: keep 2 cols, but allow text wrap and shorten "Saved Quotations (Last 30 Days)" → "Saved" on mobile (use a hidden span pattern).

### 2. Form card
- Card padding: `pt-6` stays; reduce inner section spacing `space-y-8` → `space-y-6 sm:space-y-8`.
- Card header title `text-2xl` → `text-xl sm:text-2xl`.
- All section headings keep responsive sizes; ensure inputs fill width (already do).

### 3. Product line items (biggest mobile pain point)
- Per-product card: header row already flex; keep.
- The image upload row: stack file input above preview thumbnail on mobile (`flex-col sm:flex-row items-start`).
- Confirm number inputs use `inputMode="decimal"` for better mobile keyboards (Quantity, Unit Price, Installation Cost).
- ProductSearch results: ensure dropdown is scrollable and tap-friendly (verify in component, expand row hit area, truncate long names).

### 4. Action buttons (Save / Generate PDF / Cancel Edit)
- Currently `flex gap-4 justify-end`. On mobile, stack full-width: `flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end`, buttons get `w-full sm:w-auto`.

### 5. Quotation preview card
- Outer padding: `p-8 md:p-12` → `p-4 sm:p-8 md:p-12`.
- Header logo/title block already stacks via `flex-col md:flex-row` — change breakpoint to `sm:` so it splits earlier and aligns the QUOTATION label right on tablets.
- Products table: already wrapped in `overflow-x-auto`. Add `min-w-[640px]` on the `<table>` so columns don't crush; users scroll horizontally on phones. Reduce cell padding `p-3` → `p-2 sm:p-3`.
- Price summary: `w-full md:w-96` is fine; keep.
- Signature block and footer: ensure flex wrap on small screens.

### 6. Saved Quotations list
- Card row currently `flex justify-between items-start` with action buttons `ml-4`. On mobile, stack: details on top, action buttons row below (`flex-col sm:flex-row`, buttons `w-full sm:w-auto`, remove `ml-4` on mobile).
- Inner details grid: `grid-cols-2` is OK but tight; switch to `grid-cols-1 sm:grid-cols-2`.

### 7. Auth page (`src/pages/Auth.tsx`)
- Quick pass: ensure card max-width and padding work on small screens (likely already OK from shadcn defaults; verify and adjust if needed).

### 8. Viewport meta
- Verify `index.html` has `<meta name="viewport" content="width=device-width, initial-scale=1" />` (Vite template default). No change unless missing.

## Out of scope
- No business-logic changes.
- No changes to PDF generation pipeline (it forces 1024px desktop render, so the preview tweaks won't affect exported PDFs).
- No new components or routes.

## Files touched
- `src/components/QuotationForm.tsx` (majority of edits)
- `src/components/ProductSearch.tsx` (tap targets / dropdown sizing)
- `src/pages/Auth.tsx` (minor, if needed)
- `index.html` (verify viewport meta only)

## Verification
- Switch preview to mobile (375px) and walk through: login → create quote → add catalog product → upload image → generate PDF preview → saved list.
- Confirm desktop layout (≥1024px) is visually unchanged.
