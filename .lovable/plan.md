## Goal

Let sales reps search your WooCommerce product catalog from inside the quotation builder, attach products to a quote with name, description, price, and image auto-filled, and edit any field (including the image) per quote line.

## How it will work

```text
WordPress (WooCommerce)            Lovable Cloud                 Quote Builder UI
┌────────────────────────┐         ┌──────────────────┐          ┌────────────────────┐
│ /wp-json/wc/v3/products│ ──sync─►│ products table   │ ──search►│ "Add product"      │
│ name, desc, price, img │         │ (cached catalog) │          │ search box         │
└────────────────────────┘         └──────────────────┘          │   ↓ select         │
                                          ▲                      │ Line item (edit)   │
                                          │                      │ name/desc/price/img│
                                   "Sync now" button             └────────────────────┘
                                   + daily cron
```

1. We add a `products` cache table in Lovable Cloud that mirrors WooCommerce.
2. An edge function `sync-woocommerce-products` pulls the full catalog from your WP site (paginated) and upserts into the cache.
3. A daily cron + a manual "Sync products" button keep it fresh.
4. In the quote builder, a search field queries the cached `products` table (fast, fuzzy on name/SKU).
5. Picking a product appends a line item with name, description, price, image URL prefilled. All four fields are editable on that quote only — the catalog stays untouched.
6. Editable image: rep can paste a new URL or upload a new image (stored in a Lovable Cloud storage bucket).

## What you need to provide

To talk to WooCommerce we need **read-only API credentials** from your WordPress site:

1. In WP Admin → **WooCommerce → Settings → Advanced → REST API → Add key**
2. Permissions: **Read**
3. Copy the **Consumer Key** and **Consumer Secret**
4. Also share your store URL (e.g. `https://yourshop.com`)

We'll store these as three secrets in Lovable Cloud:
- `WOOCOMMERCE_URL`
- `WOOCOMMERCE_CONSUMER_KEY`
- `WOOCOMMERCE_CONSUMER_SECRET`

Requirements on the WP side:
- WooCommerce installed and REST API enabled (default)
- HTTPS on the site (WooCommerce REST requires it for auth)
- Products published with name, description, regular price, and a featured image

## Build steps

1. **Database**
   - New `products` table: `wc_id`, `name`, `description`, `short_description`, `price`, `sku`, `image_url`, `permalink`, `last_synced_at`.
   - Indexes on `name` and `sku` for search.
   - RLS: any authenticated user can read; only the sync function writes (service role).
   - New storage bucket `quote-images` (public read) for rep-uploaded line-item images.
   - Extend `quotations.products` JSON shape to optionally carry `wc_id` and `image_url` per line.

2. **Edge function: `sync-woocommerce-products`**
   - Auth via Basic auth using consumer key/secret.
   - Paginates `/wp-json/wc/v3/products?per_page=100` until done.
   - Upserts by `wc_id`; soft-deletes products no longer returned.
   - Returns count synced. Triggered by button or `pg_cron` daily.

3. **Edge function: `search-products`** (optional thin wrapper) or do it client-side directly against the cache via Supabase client with `ilike`.

4. **Quote builder UI changes (`QuotationForm.tsx`)**
   - "Add product from catalog" combobox with debounced search (Command/Popover from shadcn).
   - Result row shows thumbnail + name + price.
   - On select → push a new line item with editable fields:
     - Name (input)
     - Description (textarea, prefilled from short_description)
     - Price (number input)
     - Image (preview + "replace" button → upload to `quote-images` bucket, or paste URL)
   - "Sync products" button in a small admin area (visible to logged-in reps) calls the sync function and shows toast.
   - Existing manual "blank line" entry stays as a fallback.

5. **PDF generation**
   - Include the per-line image (compressed) in the rendered PDF, keeping the existing 30 MB cap.

## Out of scope (confirm if you want any of these)

- Pulling product variations (size/color variants).
- Pulling stock levels or category filters in the search.
- Writing back to WooCommerce (this is read-only).
- Multi-currency.

## After approval

I will, in order:
1. Ask you to add the three WooCommerce secrets.
2. Run the DB migration (products table, storage bucket, RLS).
3. Create the sync edge function and run a first sync to verify.
4. Update `QuotationForm.tsx` with the search + editable line items + image upload.
5. Schedule the daily cron.
