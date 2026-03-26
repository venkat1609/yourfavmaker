-- Public Supabase API data dump
-- Generated: 2026-03-26T13:17:37.528Z
-- Source: https://ovsbgltsqgyhynfttoiw.supabase.co
-- Scope: rows accessible with the anonymous key only.

BEGIN;

-- Table: categories
INSERT INTO public.categories (id, name, created_at) VALUES
  ('5f4ff4ed-7323-4c11-8332-42cbee67c7a4', 'Clothing', '2026-03-08T23:25:45.030293+00:00'),
  ('3b57fba5-0483-49c8-817e-847ce27c3ef8', 'Accessories', '2026-03-08T23:25:45.030293+00:00'),
  ('86494c40-1724-461a-80c9-fd7fd4225ac6', 'Home', '2026-03-08T23:25:45.030293+00:00'),
  ('b1dfec26-3f18-4a50-baa1-2889352aa7ab', 'Wellness', '2026-03-08T23:25:45.030293+00:00')
ON CONFLICT DO NOTHING;

-- Table: tags
INSERT INTO public.tags (id, name, created_at) VALUES
  ('c01826a2-6188-467a-969e-f28d44f1843e', 'Best Sellers', '2026-03-08T23:25:45.030293+00:00'),
  ('331d6669-be79-44f0-94f5-b77b4c1d3b04', 'Summer Fest', '2026-03-08T23:25:45.030293+00:00'),
  ('c6a7c4bb-6dac-473e-a7e0-dc3aea313d4e', 'Winter Wears', '2026-03-08T23:25:45.030293+00:00'),
  ('c69b5152-52f2-4ad7-b46f-777f3fe8d372', 'New Arrivals', '2026-03-08T23:25:45.030293+00:00')
ON CONFLICT DO NOTHING;

-- Table: sellers
INSERT INTO public.sellers (id, user_id, name, slug, logo_url, description, location, created_at, updated_at, phone, address_street, address_city, address_state, address_zip, address_country, bank_name, bank_account_number, bank_ifsc, tax_id, status) VALUES
  ('e47167f8-3c07-4455-a571-4718647ea77a', NULL, 'hookd', 'hookd', '', '', 'Chennai, India', '2026-03-22T19:16:53.454941+00:00', '2026-03-22T19:16:53.454941+00:00', NULL, NULL, NULL, NULL, NULL, 'IN', NULL, NULL, NULL, NULL, 'pending'),
  ('3ba7330e-d8d3-4e8c-98e9-3b34190a9d6e', 'e0341ad4-45bd-4663-b083-3a47e892939b', 'Nexus', 'nexus', '', '', NULL, '2026-03-23T10:31:14.994047+00:00', '2026-03-23T10:31:14.994047+00:00', '+919597983689', 'Pattinathamman Kanniamman Koil Street', 'Chennai', 'Tamil Nadu', '603103', 'IN', 'Axis Bank', 'test', 'test', 'test', 'pending')
ON CONFLICT DO NOTHING;

-- Table: products
INSERT INTO public.products (id, name, description, price, compare_at_price, image_url, category, stock, is_active, created_at, updated_at, tags, seller_id) VALUES
  ('09c3424a-1d2f-44ec-8938-ed144254d7f3', 'Linen Blend Shirt', 'Relaxed-fit linen blend shirt in natural tones. Breathable and effortlessly elegant.', 89, 120, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop', 'Clothing', 25, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:45:26.20878+00:00', '[]'::jsonb, NULL),
  ('29630ae3-e714-44b2-bded-4b9fbefaeae3', 'Ceramic Pour-Over Set', 'Handcrafted ceramic dripper and server. Minimalist design meets ritual.', 65, NULL, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=800&fit=crop', 'Home', 15, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:45:26.20878+00:00', '[]'::jsonb, NULL),
  ('40f0b189-7e17-43e3-a7aa-8e54e7a0f4fd', 'Canvas Tote', 'Heavy-weight organic cotton canvas. Built to carry your daily essentials.', 42, NULL, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=800&fit=crop', 'Accessories', 50, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:45:26.20878+00:00', '[]'::jsonb, NULL),
  ('f62b3d06-2291-49c5-ae2b-c8b48c17bdcc', 'Relaxed Fit Chinos', 'Garment-dyed cotton chinos with a relaxed silhouette. All-day comfort.', 95, NULL, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=800&fit=crop', 'Clothing', 20, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:56:10.338304+00:00', '[]'::jsonb, NULL),
  ('eb18fdc9-8715-4bf6-b8d6-9d8ba4e7ee73', 'Leather Card Holder', 'Full-grain vegetable-tanned leather. Slim profile, holds up to 8 cards.', 35, NULL, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=800&fit=crop', 'Accessories', 35, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:56:10.338304+00:00', '[]'::jsonb, NULL),
  ('a721f40a-0d3f-478a-8c17-4dbc4bde51c2', 'Brass Desk Lamp', 'Adjustable brass desk lamp with linen shade. Warm, ambient lighting.', 145, 180, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/brass-lamp.jpg', 'Home', 10, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:59:39.134186+00:00', '[]'::jsonb, NULL),
  ('1b5e8ab9-a835-43d3-97f1-273bffec1b70', 'Stoneware Mug', 'Hand-thrown stoneware mug with a matte glaze. 12oz capacity.', 28, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/stoneware-mug.jpg', 'Home', 40, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T21:59:39.134186+00:00', '[]'::jsonb, NULL),
  ('24c5f352-26a3-4fbd-998d-326111d01c60', 'Wool Blend Scarf', 'Soft merino wool blend scarf in muted earth tones. Perfect layering piece.', 55, 75, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/wool-scarf.jpg', 'Accessories', 30, TRUE, '2026-03-08T21:45:26.20878+00:00', '2026-03-08T22:02:13.027075+00:00', '[]'::jsonb, NULL),
  ('d524d726-30dd-465a-a9e1-4b325e13ea82', 'Cotton Beach Towel', 'Oversized Turkish cotton towel. Quick-dry, sand-resistant weave.', 45, 60, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/beach-towel.jpg', 'Home', 40, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Summer Fest"]'::jsonb, NULL),
  ('4cbeed8c-8ec4-4b8b-ae39-d2e01a98c148', 'Linen Shorts', 'Relaxed-fit French linen shorts. Cool and breathable for warm days.', 72, 95, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/linen-shorts.jpg', 'Clothing', 30, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Summer Fest"]'::jsonb, NULL),
  ('b49ceec7-8c87-4cee-b63e-bef880afd7bf', 'Cashmere Sweater', 'Pure Grade-A cashmere crew neck. Luxuriously warm and lightweight.', 185, 240, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/cashmere-sweater.jpg', 'Clothing', 18, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Winter Wears"]'::jsonb, NULL),
  ('9919140c-2e1d-4d95-a1de-5266c44e9c59', 'Quilted Vest', 'Lightweight quilted vest with recycled down fill. Layer effortlessly.', 125, 160, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/quilted-vest.jpg', 'Clothing', 15, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Winter Wears"]'::jsonb, NULL),
  ('c10e1423-21c5-47de-8e9f-b5bfa157f96b', 'Shearling Gloves', 'Genuine shearling-lined leather gloves. Butter-soft lambskin.', 78, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/shearling-gloves.jpg', 'Accessories', 22, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Winter Wears"]'::jsonb, NULL),
  ('23e0b38e-9e6b-43f1-a10f-b32cbe948a85', 'Thermal Henley', 'Waffle-knit thermal henley in brushed cotton. Perfect base layer.', 58, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/thermal-henley.jpg', 'Clothing', 35, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-22T19:17:15.291861+00:00', '["Winter Wears"]'::jsonb, 'e47167f8-3c07-4455-a571-4718647ea77a'),
  ('cbbec6df-5dfb-4026-a580-6181d13174a4', 'Cork Yoga Mat', 'Sustainable cork surface with natural rubber base. Non-slip grip.', 85, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/cork-yoga-mat.jpg', 'Wellness', 20, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-22T19:18:30.522301+00:00', '["New Arrivals"]'::jsonb, 'e47167f8-3c07-4455-a571-4718647ea77a'),
  ('e1c413d8-69c5-4ea1-b04c-2ae5aa0f1b12', 'Straw Sun Hat', 'Wide-brim straw hat with leather trim. Artisan woven.', 55, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/straw-hat.jpg', 'Accessories', 20, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Summer Fest"]'::jsonb, NULL),
  ('06e5de41-83bf-483e-8ed3-301935875f6d', 'Copper Water Bottle', 'Pure copper bottle with matte finish. Ayurvedic wellness meets modern design.', 42, 55, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/copper-bottle.jpg', 'Home', 30, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["New Arrivals"]'::jsonb, NULL),
  ('4fbda462-1ba2-46ab-aea7-3dfcfa93969b', 'Handwoven Basket', 'Artisan-woven seagrass storage basket. Beautiful and functional.', 56, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/woven-basket.jpg', 'Home', 18, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["New Arrivals"]'::jsonb, NULL),
  ('32d9ff40-cad3-49d6-a3e5-c09ccf839851', 'Linen Napkin Set', 'Set of 4 stonewashed linen napkins. Softens beautifully with every wash.', 38, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/linen-napkins.jpg', 'Home', 25, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["New Arrivals"]'::jsonb, NULL),
  ('86629a9f-fa94-4865-aa4b-d2b02278da98', 'Merino Wool Beanie', 'Ultra-soft merino wool beanie. Timeless warmth for every season.', 38, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/wool-beanie.jpg', 'Accessories', 45, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Best Sellers"]'::jsonb, NULL),
  ('ad5c000c-44a0-4c85-8b3e-ebe93b659f1f', 'Minimalist Watch', 'Japanese movement, sapphire crystal. 38mm case in brushed steel.', 195, 250, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=800&fit=crop', 'Accessories', 12, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Best Sellers"]'::jsonb, NULL),
  ('8d665596-f191-4a69-99df-810595999061', 'Natural Soy Candle', 'Hand-poured soy wax candle with cedarwood and vanilla. 60hr burn time.', 32, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/soy-candle.jpg', 'Home', 55, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Best Sellers"]'::jsonb, NULL),
  ('2f9dfebe-08b1-4dc0-ae79-52aaae9c1ff2', 'Organic Cotton Crew Tee', 'Heavyweight 220gsm organic cotton. The perfect everyday staple.', 48, 62, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop', 'Clothing', 60, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Best Sellers"]'::jsonb, NULL),
  ('262049f6-248f-481d-90db-b91cfc29da74', 'Bamboo Sunglasses', 'Polarized lenses with natural bamboo frames. UV400 protection.', 68, NULL, 'https://ovsbgltsqgyhynfttoiw.supabase.co/storage/v1/object/public/product-images/bamboo-sunglasses.jpg', 'Accessories', 25, TRUE, '2026-03-08T21:48:55.346514+00:00', '2026-03-08T23:18:21.176885+00:00', '["Summer Fest"]'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- Table: product_attributes
-- No rows exported from product_attributes

-- Table: product_variants
-- No rows exported from product_variants

COMMIT;
