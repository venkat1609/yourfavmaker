# Store-Only Onboarding and Seller Flag Plan

## Strategy
- Treat the `stores` table as the single source of truth for seller status and storefront metadata; there will no longer be a separate `sellers` table.
- Users become sellers by successfully running the storefront onboarding (i.e., by inserting/updating a store row with `status = 'pending'` → `approved`). Any subsequent storefronts they create simply become additional rows in `stores` with the same `user_id`.
- All registration addressing/payment/plan data lives on the `stores` row so we can expose store-centric onboarding and easily open the door to multi-store expansion later.

## Schema Target
1. **stores**: keep `user_id`, `status`, address, bank, tax, and payout fields. Add support columns where needed (`is_primary`, `onboarding_step`, etc.) so we can track the onboarding flow per storefront without another join table.
2. **users**: continue to hold the canonical identity (name, email, phone). Use the presence of an `approved` store to determine whether a user is a seller (`is_seller` can be derived client-side).
3. **policies**: all RLS rules should reference `public.stores` (via `user_id` and `status`). Drop anything that depended on `public.sellers`.

## Migration Steps
1. Drop the supplier-specific schema:
   - Remove the `seller_id` column from `public.stores` and its foreign key, since there will no longer be a separate `sellers` row to reference.
   - Drop `public.sellers` entirely (after ensuring no other objects depend on it).
   - Delete helper indexes such as `idx_sellers_default_store_id`.
2. Recreate the RLS policies so they rely purely on `stores` and `stores.user_id`/`status`. Rebuild the policies for products, attributes, variants, collections, order items, orders, and storage uploads.
3. Update the generated Supabase types to remove the `sellers` table definition and rely on `stores` only.

## UI/Data Flow Adjustments
1. **Onboarding**: the seller onboarding page now writes directly to `public.stores`. During submission we insert or update a store row with `status = 'pending'` and the filled-in registration/payment data. Once the store is approved, the user can create additional stores via the same flow.
2. **Dashboard & Profile**: determine `isSeller` by checking whether any of the user's stores is approved. The dashboard can fetch all stores with `.eq('user_id', user.id)` and show the approved store as the active storefront.
3. **Admin surfaces**: manage stores directly, including status changes and deletion. There is no separate seller record to update.

## Validation
- Run `npm run lint` and any automated tests after refreshing Supabase types.
- Apply the migration to staging, confirm `public.sellers` no longer exists, and verify the new policies still allow admins and approved store users to manage catalog data.
- Smoke-test the onboarding flow so that submitting the form results in a pending `stores` row (reachable via dashboard) and users with existing approved stores can create new ones without hitting `sellers`.

## Next Steps
1. Apply the migration file (`supabase/migrations/20260331140000_remove_sellers_table.sql`).
2. Refresh Supabase types and ensure no code imports the removed `sellers` table.
3. Update the frontend flows (onboarding, dashboard, profile, admin screens) to read/write from `stores` as described above.

## Frontend Checklist
- Surface the storefront application status inside the profile experience, showing “Seller Application Pending” when the store row is under review and hiding the “Become a seller” CTA after submission; ensure only the primary address shows in the profile menu and add a dedicated “Manage addresses” route below it.
- Rely on `public.stores` metadata when rendering the seller dashboard, admin dashboards, and catalog pages. Each storefront should appear as a grouped, collapsible sidebar item with tabbed content (overview, products, orders, inquiries, settings) and detail cards (active/pending product counts, orders, units sold, sales).
- Update the header to replace “Products” with “All Products,” move the search components to the right, and add a type-ahead search bar without a submit button; keep only the relevant navigation items in the footer (Company list plus a “Become a seller” link) with the prescribed dark-green background and centered rights text.
- Enhance product management by uploading images to Supabase storage (displaying thumbnails even before upload, drag-and-drop ordering, reorder controls, and preview overlays) and move stock/inventory controls into a dedicated inventory management screen or module separate from the product detail page.
- Treat the seller onboarding journey as store onboarding: drop any standalone “seller” table and use store records to track onboarding steps, approval status, and payment/banking details; the “Become a seller” entry belongs in the footer and seller/profile menu, linking to a dedicated landing page that highlights opportunities, benefits, and pricing at a premium layout.
