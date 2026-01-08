-- Storage buckets configuration for Wedding Bestie
-- All buckets are PRIVATE except OG images (public).

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    FALSE,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'og-images',
    'og-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload photos to their wedding folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos from their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos from their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view OG images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload OG images for their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update OG images for their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete OG images for their weddings" ON storage.objects;

CREATE POLICY "Users can upload photos to their wedding folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view photos from their weddings"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete photos from their weddings"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage gallery photos"
ON storage.objects FOR ALL
USING (
    bucket_id = 'gallery' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view OG images"
ON storage.objects FOR SELECT
USING (bucket_id = 'og-images');

CREATE POLICY "Users can upload OG images for their weddings"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'og-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update OG images for their weddings"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'og-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete OG images for their weddings"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'og-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);
