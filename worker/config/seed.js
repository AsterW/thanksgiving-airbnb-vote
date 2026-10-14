// Seed listings for the nov26 trip (verified 2026-09-30).
// No prices here: prices come live from Airbnb for each trip's dates (see
// listings/prices.js). The hand-typed 4-night totals these used to carry
// are stripped from saved state in listings/state.js.
// image fields filled from og:image scrape where available; the rest lazy-enrich
// at runtime via /api/enrich.
export const SEED = [
  { roomId: '1227535448419064801', url: 'https://www.airbnb.com/rooms/1227535448419064801?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vista View Cottage', area: '落基山 · Estes Park', sleeps: 12, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.94, reviews: 18, image: 'https://a0.muscache.com/im/pictures/miso/Hosting-1227535448419064801/original/4d15e476-8a5a-4814-8731-a3463dd395b2.png', note: '环绕露台看山景，离公园近' },
  { roomId: '292274', url: 'https://www.airbnb.com/rooms/292274?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Brown Cabin: Charming Mountain House w/Views', area: '落基山 · Estes Park', sleeps: 12, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.8, reviews: 340, image: 'https://a0.muscache.com/im/pictures/fe7217ff-0b24-438d-880d-b94722c75bf5.jpg?im_w=1200', note: '1931年老木屋，大石壁炉，步行20分钟到公园' },
  { roomId: '8740974', url: 'https://www.airbnb.com/rooms/8740974?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Skyline - Michener House in the Sky', area: '落基山 · Estes Park', sleeps: 10, bedrooms: 5, beds: 6, bathrooms: 2,
    rating: 4.93, reviews: 131, image: 'https://a0.muscache.com/im/pictures/111377994/8f520b2f_original.jpg', note: '紧邻公园，大厨房+火坑露台' },
  { roomId: '1658870700646985100', url: 'https://www.airbnb.com/rooms/1658870700646985100?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: "Rocky's Riverside Retreat", area: '落基山 · Estes Park', sleeps: 10, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.67, reviews: 12, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1658870700646985100/original/37d44665-ba6f-4e75-969f-9208f3e4866b.jpeg', note: '临 Fall River，河畔露台+烧烤' },
  { roomId: '724385787075754980', url: 'https://www.airbnb.com/rooms/724385787075754980?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Fall River Oasis · Private Hot Tub · RMNP', area: '落基山 · Estes Park', sleeps: 10, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.73, reviews: 15, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-724385787075754980/original/1dca8f7c-ba03-426e-852a-9165d7bf95a9.jpeg', note: '私家6人热水浴缸，全年可用' },
  { roomId: '39392880', url: 'https://www.airbnb.com/rooms/39392880?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Three Bedroom Cabin - Perfect Your Family', area: '落基山 · Estes Park', sleeps: 10, bedrooms: 3, beds: 5, bathrooms: 2,
    rating: 4.86, reviews: 71, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-39392880/original/01137add-633b-45ca-9fdb-84457f67255b.jpeg', note: '私家热水浴缸看山景，烧柴壁炉' },
  { roomId: '1555270180265800861', url: 'https://www.airbnb.com/rooms/1555270180265800861?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Charming Rustic Cozy Casita Near Sand Dunes', area: '大沙丘区域', sleeps: 10, bedrooms: 2, beds: 10, bathrooms: 1,
    rating: 5.0, reviews: 9, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1555270180265800861/original/47c78951-0836-4300-89a9-c5012216b6e2.jpeg', note: '乡村小木屋，烧烤 patio，最便宜' },
  { roomId: '1645317208833417440', url: 'https://www.airbnb.com/rooms/1645317208833417440?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vintage home with space to entertain', area: '大沙丘区域', sleeps: 11, bedrooms: 4, beds: 5, bathrooms: 2,
    rating: 5.0, reviews: 3, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1645317208833417440/original/8928aa7c-1af3-4409-8e26-b405ee471428.jpeg', note: '私家6人热水浴缸+台球桌' },
  { roomId: '1460891336891261388', url: 'https://www.airbnb.com/rooms/1460891336891261388?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Celestial Lodge: Stargazing, Pet Friendly & Groups', area: '大沙丘区域', sleeps: 14, bedrooms: 3, beds: 10, bathrooms: 2,
    rating: 4.73, reviews: 26, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1460891336891261388/original/93e2f782-f070-4ad2-b440-66b97c3525de.png', note: '暗夜观星平台，离沙丘近' },
  { roomId: '51935947', url: 'https://www.airbnb.com/rooms/51935947?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Beautiful Retreat ~ Multi Family w/ Creek Access', area: '大沙丘区域', sleeps: 13, bedrooms: 5, beds: 10, bathrooms: 2,
    rating: 5.0, reviews: 10, image: 'https://a0.muscache.com/im/pictures/5f090ddb-2bc0-4b1a-bf9f-29b815cc1f34.jpg', note: '小溪+大火坑，Sangre de Cristo 山景' },
];
