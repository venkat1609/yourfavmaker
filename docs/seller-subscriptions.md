# Seller Subscription Plan Proposal

## Goal

Allow any authenticated user to create a seller profile, but limit the number of products and features based on subscription tier.

## Core Rules

- Free users can create seller profiles and list products.
- Product limits must be enforced on the server, not only in the UI.
- Limits should apply across all storefronts owned by the same seller account.
- The default free-tier product cap should be `10` total products across all stores.

## Recommended Limit Model

### Free

- 10 total products
- Basic analytics
- Email support

### Starter

- 50 total products
- Sales reports and analytics
- Email and chat support

### Growth

- 250 total products
- Advanced analytics
- Bulk upload tools
- Priority support

### Pro

- 1000+ total products
- Sub domain
- Team access
- Advanced analytics
- Bulk upload tools
- Priority support

## Suggested App Changes

- Show a usage meter in the seller overview.
- Disable or block product creation when the limit is reached.
- Show an upgrade CTA when the seller hits the limit.
- Track the current plan on the seller account.
- Apply the limit across all stores owned by the seller.

## Suggested Data Model

Add seller entitlement fields such as:

- `plan`
- `product_limit`
- `store_limit`
- `support_level`
- `features`

## Enforcement

- Enforce limits in Supabase or server-side logic.
- Do not rely only on the frontend to block product creation.
- Return a clear error message when the limit is exceeded.

## Next Step

Implement the first version with:

- free plan capped at 10 total products
- seller overview usage meter
- disabled product creation at the limit
- upgrade CTA placeholder
