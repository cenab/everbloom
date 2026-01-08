-- Storage buckets configuration for Wedding Bestie
-- All buckets are PRIVATE - access is controlled via signed URLs

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Photos bucket for guest uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    FALSE,  -- Private bucket
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Gallery bucket for admin-uploaded curated photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    FALSE,  -- Private bucket
    15728640,  -- 15MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- OG Images bucket for social sharing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'og-images',
    'og-images',
    TRUE,  -- Public bucket (OG images need to be publicly accessible)
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Photos bucket policies
-- Allow authenticated users to upload to their wedding's folder
CREATE POLICY "Users can upload photos to their wedding folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

-- Allow authenticated users to view photos from their weddings
CREATE POLICY "Users can view photos from their weddings"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

-- Allow authenticated users to delete photos from their weddings
CREATE POLICY "Users can delete photos from their weddings"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

-- Gallery bucket policies (similar to photos)
CREATE POLICY "Users can manage gallery photos"
ON storage.objects FOR ALL
USING (
    bucket_id = 'gallery' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM weddings WHERE user_id = auth.uid()
    )
);

-- OG Images bucket policies (public read, authenticated write)
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
