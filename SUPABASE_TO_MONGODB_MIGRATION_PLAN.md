# Supabase to MongoDB Migration Plan

This document outlines the first practical migration path for moving this app away from Supabase/Postgres and onto MongoDB.

## Goal

Replace the current Supabase-backed relational model with MongoDB while keeping the app usable during the transition.

## First Step

Freeze the current schema and map every Supabase dependency before writing any migration code.

That means documenting:

- tables
- foreign keys
- triggers and functions
- RLS policies
- auth assumptions
- storage buckets
- edge functions

Do not start copying data until this map is complete.

## Current Supabase Dependencies

The app currently depends on:

- `profiles`
- `addresses`
- `user_roles`
- `categories`
- `tags`
- `sellers`
- `products`
- `product_attributes`
- `product_variants`
- `cart_items`
- `orders`
- `order_items`

It also depends on:

- `public.has_role(...)`
- `handle_new_user()` profile bootstrap
- `update_updated_at_column()`
- `product-images` storage bucket
- `razorpay-order` edge function

## Proposed MongoDB Model

### `users`

Store application profile data here or in a related `profiles` collection, depending on whether you want auth and profile data split.

Suggested fields:

- `_id`
- `authUserId`
- `fullName`
- `email`
- `phone`
- `avatarUrl`
- `roles`
- `createdAt`
- `updatedAt`

### `addresses`

Keep addresses in a separate collection.

Suggested fields:

- `_id`
- `userId`
- `label`
- `street`
- `city`
- `state`
- `zip`
- `country`
- `isPrimary`
- `createdAt`
- `updatedAt`

Keep a unique constraint in application code or via Mongo indexes so each user has only one `isPrimary` address.

### `sellers`

Keep sellers separate because they have their own lifecycle and status.

Suggested fields:

- `_id`
- `userId`
- `name`
- `slug`
- `logoUrl`
- `description`
- `location`
- `phone`
- address fields
- bank fields
- `taxId`
- `status`
- `createdAt`
- `updatedAt`

### `products`

Keep products separate from sellers, but reference `sellerId`.

Suggested fields:

- `_id`
- `sellerId`
- `name`
- `description`
- `price`
- `compareAtPrice`
- `imageUrl`
- `category`
- `tags`
- `stock`
- `isActive`
- `createdAt`
- `updatedAt`

### `productAttributes`

Keep as a separate collection unless the app only ever loads them with the product.

Suggested fields:

- `_id`
- `productId`
- `name`
- `values`
- `displayOrder`
- `createdAt`

### `productVariants`

Keep variants separate because they have pricing, stock, and option combinations.

Suggested fields:

- `_id`
- `productId`
- `name`
- `sku`
- `price`
- `compareAtPrice`
- `stock`
- `options`
- `isActive`
- `createdAt`
- `updatedAt`

### `cartItems`

Keep as a separate collection.

Suggested fields:

- `_id`
- `userId`
- `productId`
- `variantId`
- `quantity`
- `createdAt`

### `orders`

Keep orders separate.

Suggested fields:

- `_id`
- `userId`
- `status`
- `total`
- `shippingAddressSnapshot`
- `razorpayOrderId`
- `razorpayPaymentId`
- `createdAt`
- `updatedAt`

### `orderItems`

Keep order items separate, but treat them as immutable snapshots.

Suggested fields:

- `_id`
- `orderId`
- `productId`
- `productName`
- `price`
- `quantity`
- `variantId`
- `variantName`
- `variantOptions`

### `categories`

Keep as a small lookup collection.

### `tags`

Keep as a small lookup collection.

## What Changes Functionally

### RLS becomes application authorization

Supabase row-level security is currently doing a lot of work. In MongoDB, that must move into:

- API middleware
- service-layer authorization checks
- admin-only route protection

### Triggers become application logic

The following need to move out of the database:

- auto-creating profiles on signup
- `updatedAt` maintenance
- primary address enforcement
- cleanup logic for deleted records

### Foreign keys become app-managed references

MongoDB will not enforce the same relational constraints. You need to handle:

- orphan prevention
- cascading deletes
- referential checks
- data consistency in writes

### Storage becomes a separate concern

The current `product-images` bucket must be replaced by:

- Mongo-backed metadata plus
- an object store such as S3, Cloudflare R2, or MongoDB-compatible media storage

Do not store images as raw binary in the same collections unless you have a very specific reason.

## Recommended Migration Order

1. Define Mongo schema for all collections.
1. Decide auth strategy.
1. Build the new backend API layer.
1. Add read-only compatibility against current Supabase data.
1. Migrate lookup data: categories, tags.
1. Migrate users, profiles, roles, sellers.
1. Migrate products, attributes, variants.
1. Migrate addresses.
1. Migrate carts.
1. Migrate orders and order items.
1. Cut over writes.
1. Freeze Supabase.
1. Verify data parity.
1. Remove Supabase client code.

## Cutover Strategy

Use a two-phase cutover:

### Phase 1: Dual Read

- Keep Supabase as the source of truth.
- Build Mongo collections and API endpoints in parallel.
- Read from one source at a time, not both, to avoid inconsistent UI behavior.

### Phase 2: Dual Write or Final Sync

- Either write to both systems temporarily
- or freeze writes on Supabase and run a final migration

Final sync is simpler and safer for this app unless you need near-zero downtime.

## Data Risks

- Existing RLS rules will not carry over automatically.
- The admin dashboard depends on role checks.
- Checkout depends on order item snapshots and payment verification.
- Seller ownership must remain strict.
- Primary address logic must remain deterministic.
- Product and order queries currently assume relational joins.

## Success Criteria

Migration is complete when:

- the app can authenticate users against the new backend
- admin and seller permissions work correctly
- products, carts, and orders work end to end
- checkout still creates and verifies orders
- no UI path depends on Supabase directly

## Next Implementation Step

Before writing migration code, create a `schema.md` or `collections.md` file that maps each Supabase table to a Mongo collection and defines:

- field-by-field shape
- indexes
- required relations
- deletion behavior
- ownership rules

That document becomes the contract for the backend rewrite.
