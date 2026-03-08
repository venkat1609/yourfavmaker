
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed existing data
INSERT INTO public.categories (name) VALUES ('Clothing'), ('Accessories'), ('Home'), ('Wellness');
INSERT INTO public.tags (name) VALUES ('Best Sellers'), ('Summer Fest'), ('Winter Wears'), ('New Arrivals');
