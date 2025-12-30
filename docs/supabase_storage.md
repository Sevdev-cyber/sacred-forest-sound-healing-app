# Supabase Storage layout

This project expects two buckets with strict access boundaries:

1) preview-gallery (public)
   - lightweight mp3 previews for web and quick in-app previews
2) crystal-vault (authenticated)
   - high quality assets (ogg/m4a) downloaded and cached for offline use

Recommended folder layout (same in both buckets):
  tones/
    pure/
      anchor_c.mp3
      anchor_c.ogg
      anchor_c.m4a
    warm/
      anchor_warm.mp3
      anchor_warm.ogg
      anchor_warm.m4a
  atmos/
    birds.mp3
    birds.ogg
    birds.m4a

Supabase dashboard steps:
1) Open your project -> Storage -> Create bucket
2) Create preview-gallery, set "Public" to ON
3) Create crystal-vault, keep "Public" OFF
4) Upload files following the folder layout above

Notes:
- preview-gallery should only contain mp3 to keep it fast and small.
- crystal-vault should contain ogg (Android) and m4a (iOS).
- The app uses the same key names for both buckets.
