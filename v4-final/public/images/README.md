# AboveTheClouds V3 — Image Folders

Drop real photos into the matching folder using the filenames referenced
in `database/migrations/0002_seed.sql` (aircraft.hero_image, airports.hero_image)
or in news/community records. No code changes needed — the app reads
`hero_image` paths straight from the database.

images/
├── hero/        → homepage hero background
├── aircraft/     → 737.jpg, 747.jpg, 757.jpg, 767.jpg, 777.jpg, 787.jpg,
│                   a220.jpg, a320.jpg, a330.jpg, a340.jpg, a350.jpg, a380.jpg,
│                   e170.jpg, e175.jpg, e190.jpg, e195.jpg
├── airports/     → aeroparque.jpg, ezeiza.jpg, san-fernando.jpg, el-palomar.jpg,
│                   cordoba.jpg, mendoza.jpg, ushuaia.jpg, bariloche.jpg,
│                   mar-del-plata.jpg, jfk.jpg, heathrow.jpg, madrid.jpg, dubai.jpg
├── aviation/     → daily challenge photos (see server/lib/challenges.js)
├── community/    → community photo submissions (moderated via /api/photos)
├── products/     → Aviation Tags product photos (future use)
└── og/           → og-cover.jpg (1200×630px) for social sharing previews

Recommended: keep files under ~400KB; the app lazy-loads everything
below the fold already.
