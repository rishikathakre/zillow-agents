export type Property = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  photo: string;
  photos: string[];
  aqi: number;
  score: number;
  recommendation: "BUY" | "HOLD" | "PASS";
};

const photo = (seed: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const SEEDS = [
  "1568605114967-8130f3a36994",
  "1564013799919-ab600027ffc6",
  "1570129477492-45c003edd2be",
  "1600585154340-be6161a56a0c",
  "1600596542815-ffad4c1539a9",
  "1605276374104-dee2a0ed3cd6",
  "1600047509807-ba8f99d2cdde",
  "1600566753190-17f0baa2a6c3",
  "1613490493576-7fde63acd811",
  "1502672260266-1c1ef2d93688",
  "1512917774080-9991f1c4c750",
  "1599809275671-b5942cabc7a2",
];

const TYPES = ["Single Family", "Condo", "Townhouse", "Multi-Family", "Loft"];
const CITIES: [string, string, string][] = [
  ["New York", "NY", "10001"],
  ["Brooklyn", "NY", "11201"],
  ["Queens", "NY", "11375"],
  ["Manhattan", "NY", "10014"],
];

export const mockProperties: Property[] = SEEDS.map((s, i) => {
  const [city, state, zip] = CITIES[i % CITIES.length];
  const aqi = 22 + ((i * 17) % 90);
  const score = 62 + ((i * 7) % 35);
  return {
    id: `prop-${i + 1}`,
    address: `${100 + i * 23} ${["Park", "Madison", "Lexington", "Broadway", "5th"][i % 5]} Ave #${i + 1}`,
    city, state, zip,
    price: 450000 + i * 87500,
    beds: 1 + (i % 4),
    baths: 1 + (i % 3),
    sqft: 650 + i * 90,
    type: TYPES[i % TYPES.length],
    photo: photo(s, 800, 600),
    photos: SEEDS.slice(0, 5).map((x) => photo(x)),
    aqi,
    score,
    recommendation: score >= 80 ? "BUY" : score >= 70 ? "HOLD" : "PASS",
  };
});

export const mockAgents = [
  { id: "market", name: "Market Analyst", icon: "📊", desc: "Comps & price trends" },
  { id: "env", name: "Environmental Agent", icon: "🌿", desc: "AQI, pollen, climate" },
  { id: "flood", name: "Flood Risk Agent", icon: "🌊", desc: "FEMA flood zones" },
  { id: "school", name: "Schools Agent", icon: "🎓", desc: "Ratings & distance" },
  { id: "walk", name: "Walkability Agent", icon: "🚶", desc: "Walk/Bike/Transit" },
  { id: "rent", name: "Rental Agent", icon: "💰", desc: "Cap rate & rents" },
  { id: "employ", name: "Employment Agent", icon: "💼", desc: "BLS job growth" },
  { id: "synth", name: "Synthesizer", icon: "🧠", desc: "Final score & report" },
];

export const mockWeather = {
  temp: 68, condition: "Partly Cloudy", aqi: 42, pollen: { tree: 4, grass: 2, weed: 1 },
};

export const mockPriceHistory = Array.from({ length: 24 }).map((_, i) => ({
  month: `M${i + 1}`,
  price: 720000 + Math.round(Math.sin(i / 3) * 30000 + i * 4500),
}));

export const mockEmployment = Array.from({ length: 12 }).map((_, i) => ({
  month: `M${i + 1}`,
  jobs: 100 + Math.round(Math.sin(i / 2) * 8 + i * 1.2),
}));

export const mockReport = `Based on a comprehensive multi-agent analysis, this property shows strong investment fundamentals. The Market Analyst identified favorable comp pricing 6% below neighborhood median. Environmental scoring is solid with AQI in the "Good" range and low pollen exposure year-round. The Flood Risk agent confirmed Zone X (minimal risk). Schools score above district average with three highly-rated options within 1 mile. Walkability is excellent (Walk Score 88), and employment growth in the metro is trending +2.3% YoY per BLS. Recommended action: BUY — projected 7.4% cap rate with 11% 5-year appreciation upside.`;