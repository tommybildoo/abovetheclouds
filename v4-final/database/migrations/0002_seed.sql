-- ============================================================
-- AboveTheClouds V3 — seed data
-- Apply AFTER 0001_init.sql:
--   wrangler d1 execute abovetheclouds --file=database/migrations/0002_seed.sql
--
-- This is real reference data (specs, ICAO codes) — not flight
-- positions. Live flight data is never seeded; it only ever comes
-- from a configured FlightDataProvider (see server/lib/flightProviders).
-- ============================================================

INSERT OR IGNORE INTO aircraft (slug, manufacturer, model, family, first_flight, length_m, wingspan_m, height_m, cruise_speed, range_km, typical_capacity, engines, mtow_kg, why_fans_love_it, hero_image, created_at) VALUES
('boeing-737', 'Boeing', '737', 'Narrowbody', '1967', 39.5, 35.8, 12.5, 'Mach 0.79', 6570, 210, '2x CFM56/LEAP-1B', 82191, 'The best-selling commercial jet in history — a workhorse fans recognize on sight, in every livery, at every airport.', 'images/aircraft/737.jpg', strftime('%s','now')),
('boeing-747', 'Boeing', '747', 'Widebody', '1969', 76.3, 68.4, 19.4, 'Mach 0.85', 14815, 467, '4x GE/PW/RR turbofans', 447696, 'The Queen of the Skies — its hump silhouette alone is instantly iconic, and it redefined long-haul travel forever.', 'images/aircraft/747.jpg', strftime('%s','now')),
('boeing-757', 'Boeing', '757', 'Narrowbody', '1982', 47.3, 38.0, 13.6, 'Mach 0.80', 7222, 239, '2x RB211/PW2000', 115680, 'A cult favorite among pilots and spotters alike for its powerful engines and steep, dramatic climb-outs.', 'images/aircraft/757.jpg', strftime('%s','now')),
('boeing-767', 'Boeing', '767', 'Widebody', '1981', 54.9, 47.6, 15.8, 'Mach 0.80', 11070, 245, '2x GE/PW/RR turbofans', 186880, 'The first Boeing widebody twinjet — a transatlantic staple still flying strong decades later.', 'images/aircraft/767.jpg', strftime('%s','now')),
('boeing-777', 'Boeing', '777', 'Widebody', '1994', 73.9, 64.8, 18.5, 'Mach 0.84', 15843, 396, '2x GE90/PW4000/Trent 800', 351534, 'The largest twinjet ever built, with a distinctive six-wheel main gear and huge engines that dwarf everything nearby.', 'images/aircraft/777.jpg', strftime('%s','now')),
('boeing-787', 'Boeing', '787', 'Widebody', '2009', 62.8, 60.1, 17.0, 'Mach 0.85', 14140, 296, '2x GEnx/Trent 1000', 254011, 'The Dreamliner — composite construction, bigger windows, and a smoother ride that changed long-haul flying.', 'images/aircraft/787.jpg', strftime('%s','now')),
('airbus-a220', 'Airbus', 'A220', 'Regional Jet', '2013', 35.0, 35.1, 11.5, 'Mach 0.78', 6297, 135, '2x PW1500G', 63100, 'Originally the Bombardier C Series — sleek, efficient, and a favorite for its huge windows and quiet cabin.', 'images/aircraft/a220.jpg', strftime('%s','now')),
('airbus-a320', 'Airbus', 'A320', 'Narrowbody', '1987', 37.6, 35.8, 11.8, 'Mach 0.78', 6100, 180, '2x CFM56/V2500/LEAP-1A', 78000, 'Boeing 737''s fierce rival and the backbone of short-haul flying worldwide, known for its fly-by-wire sidestick.', 'images/aircraft/a320.jpg', strftime('%s','now')),
('airbus-a330', 'Airbus', 'A330', 'Widebody', '1992', 63.7, 60.3, 16.8, 'Mach 0.82', 13450, 335, '2x GE/PW/RR turbofans', 242000, 'A reliable long-haul twin with graceful lines and a huge second life as a freighter and tanker.', 'images/aircraft/a330.jpg', strftime('%s','now')),
('airbus-a340', 'Airbus', 'A340', 'Widebody', '1991', 63.7, 60.3, 16.9, 'Mach 0.82', 15000, 380, '4x CFM56/Trent 500', 275000, 'One of the last major four-engine widebodies — a distinctive sound and silhouette spotters love.', 'images/aircraft/a340.jpg', strftime('%s','now')),
('airbus-a350', 'Airbus', 'A350', 'Widebody', '2013', 66.8, 64.75, 17.1, 'Mach 0.85', 15000, 350, '2x Trent XWB', 280000, 'Airbus'' composite widebody answer to the 787, with a raked wingtip and one of the smoothest rides in the sky.', 'images/aircraft/a350.jpg', strftime('%s','now')),
('airbus-a380', 'Airbus', 'A380', 'Widebody', '2005', 72.7, 79.75, 24.1, 'Mach 0.85', 15200, 555, '4x Trent 900/GP7200', 575000, 'The largest passenger airliner ever built — a full double-deck giant that stops spotters in their tracks.', 'images/aircraft/a380.jpg', strftime('%s','now')),
('embraer-e170', 'Embraer', 'E170', 'Regional Jet', '2002', 29.9, 26.0, 9.9, 'Mach 0.75', 3334, 78, '2x GE CF34-8E', 34600, 'The aircraft that made the modern regional jet mainstream, with a surprisingly spacious cabin for its size.', 'images/aircraft/e170.jpg', strftime('%s','now')),
('embraer-e175', 'Embraer', 'E175', 'Regional Jet', '2003', 31.7, 26.0, 9.9, 'Mach 0.75', 3334, 88, '2x GE CF34-8E', 37500, 'A US regional-market favorite, prized by airlines for its efficiency on shorter routes.', 'images/aircraft/e175.jpg', strftime('%s','now')),
('embraer-e190', 'Embraer', 'E190', 'Regional Jet', '2004', 36.2, 28.7, 10.6, 'Mach 0.78', 4260, 106, '2x GE CF34-10E', 51800, 'A step up in size from the E170/175, popular worldwide for medium-density routes.', 'images/aircraft/e190.jpg', strftime('%s','now')),
('embraer-e195', 'Embraer', 'E195', 'Regional Jet', '2004', 38.65, 28.72, 10.55, 'Mach 0.78', 4077, 124, '2x GE CF34-10E', 52290, 'The largest E-Jet, blurring the line between regional jet and narrowbody mainline aircraft.', 'images/aircraft/e195.jpg', strftime('%s','now'));

INSERT OR IGNORE INTO airports (icao, iata, name, city, country, latitude, longitude, elevation_ft, runways, spotting_notes, hero_image, is_argentina, created_at) VALUES
('SABE', 'AEP', 'Aeroparque Jorge Newbery', 'Buenos Aires', 'Argentina', -34.5592, -58.4156, 18, 1, 'Downtown domestic hub right on the Río de la Plata — great waterfront spotting along Costanera Norte.', 'images/airports/aeroparque.jpg', 1, strftime('%s','now')),
('SAEZ', 'EZE', 'Ministro Pistarini International Airport', 'Buenos Aires', 'Argentina', -34.8222, -58.5358, 67, 2, 'Argentina''s main international gateway, with long-haul widebodies from across the globe.', 'images/airports/ezeiza.jpg', 1, strftime('%s','now')),
('SADF', NULL, 'San Fernando Airport', 'San Fernando', 'Argentina', -34.4531, -58.5836, 18, 2, 'Key general aviation and business jet hub in Greater Buenos Aires.', 'images/airports/san-fernando.jpg', 1, strftime('%s','now')),
('SADP', NULL, 'El Palomar Airport', 'El Palomar', 'Argentina', -34.6098, -58.6133, 55, 1, 'Former military field turned low-cost carrier base.', 'images/airports/el-palomar.jpg', 1, strftime('%s','now')),
('SACO', 'COR', 'Ingeniero Ambrosio Taravella Airport', 'Córdoba', 'Argentina', -31.3236, -64.2081, 1604, 1, 'Major hub in central Argentina with a strong domestic network.', 'images/airports/cordoba.jpg', 1, strftime('%s','now')),
('SAME', 'MDZ', 'Governor Francisco Gabrielli International Airport', 'Mendoza', 'Argentina', -32.8317, -68.7929, 2310, 1, 'Gateway to wine country, framed by the Andes on approach.', 'images/airports/mendoza.jpg', 1, strftime('%s','now')),
('SAWH', 'USH', 'Malvinas Argentinas Ushuaia International Airport', 'Ushuaia', 'Argentina', -54.8433, -68.2958, 21, 1, 'The southernmost international airport in the world, gateway to Antarctica.', 'images/airports/ushuaia.jpg', 1, strftime('%s','now')),
('SAZS', 'BRC', 'San Carlos de Bariloche Airport', 'Bariloche', 'Argentina', -41.1512, -71.1575, 2774, 1, 'Patagonian lakes-and-mountains backdrop — one of the most scenic approaches in the country.', 'images/airports/bariloche.jpg', 1, strftime('%s','now')),
('SAZM', 'MDQ', 'Ástor Piazzolla International Airport', 'Mar del Plata', 'Argentina', -37.9342, -57.5733, 22, 2, 'Coastal city airport, busiest in summer beach season.', 'images/airports/mar-del-plata.jpg', 1, strftime('%s','now')),
('KJFK', 'JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.6413, -73.7781, 13, 4, 'One of the world''s great spotting airports — every major airline and aircraft type passes through.', 'images/airports/jfk.jpg', 0, strftime('%s','now')),
('EGLL', 'LHR', 'Heathrow Airport', 'London', 'United Kingdom', 51.4700, -0.4543, 83, 2, 'Europe''s busiest hub, with the Renaissance/Myhotel viewing areas near the northern runway.', 'images/airports/heathrow.jpg', 0, strftime('%s','now')),
('LEMD', 'MAD', 'Adolfo Suárez Madrid–Barajas Airport', 'Madrid', 'Spain', 40.4936, -3.5668, 2001, 4, 'A major gateway between Europe and Latin America.', 'images/airports/madrid.jpg', 0, strftime('%s','now')),
('OMDB', 'DXB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 25.2532, 55.3657, 62, 2, 'One of the busiest airports on Earth for international passenger traffic.', 'images/airports/dubai.jpg', 0, strftime('%s','now'));

INSERT OR IGNORE INTO news_sources (name, url, type, enabled, category) VALUES
('Aviation Week', 'https://aviationweek.com/rss.xml', 'rss', 1, 'AUTO'),
('Simple Flying', 'https://simpleflying.com/feed/', 'rss', 1, 'AUTO'),
('Aerolíneas Argentinas Newsroom', 'https://www.aerolineas.com.ar/rss/prensa', 'rss', 0, 'ARGENTINA'),
('The Aviationist', 'https://theaviationist.com/feed/', 'rss', 1, 'AUTO');
-- NOTE: verify each feed URL is current and permitted before enabling in
-- production — some publishers change their RSS paths or require you to
-- request access. Toggle `enabled` per source from the admin panel/DB.
