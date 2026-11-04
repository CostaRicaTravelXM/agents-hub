/**
 * Course content for the demo seed. Written in the brand voice: concrete
 * nouns and numbers, sentence case, one exclamation mark at most.
 */

type Node = Record<string, unknown>;
const text = (t: string, marks?: string[]): Node => ({
  type: "text",
  text: t,
  ...(marks ? { marks: marks.map((m) => ({ type: m })) } : {}),
});
export const doc = (...content: Node[]) => ({ type: "doc", content });
export const h2 = (t: string) => ({ type: "heading", attrs: { level: 2 }, content: [text(t)] });
export const h3 = (t: string) => ({ type: "heading", attrs: { level: 3 }, content: [text(t)] });
export const p = (...parts: (string | Node)[]) => ({
  type: "paragraph",
  content: parts.map((x) => (typeof x === "string" ? text(x) : x)),
});
export const b = (t: string) => text(t, ["bold"]);
export const i = (t: string) => text(t, ["italic"]);
export const ul = (...items: string[]) => ({
  type: "bulletList",
  content: items.map((t) => ({ type: "listItem", content: [p(t)] })),
});
export const ol = (...items: string[]) => ({
  type: "orderedList",
  content: items.map((t) => ({ type: "listItem", content: [p(t)] })),
});
export const quote = (t: string) => ({ type: "blockquote", content: [p(t)] });

export type SeedLesson = {
  title: string;
  summary?: string;
  type: "video" | "pdf" | "document" | "link" | "reading" | "quiz";
  video?: string; // key of a generated video
  poster?: string;
  pdf?: string; // key of a generated PDF
  url?: string;
  minutes?: number;
  body?: ReturnType<typeof doc>;
  required?: boolean;
  requiredPct?: number;
  quiz?: {
    passing: number;
    attempts: number | null;
    questions: { prompt: string; type: "single" | "multiple" | "true_false"; options: string[]; correct: number[]; explanation: string }[];
  };
};
export type SeedModule = { title: string; description: string; requires?: number[]; lessons: SeedLesson[] };
export type SeedCourse = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: "foundation" | "advanced" | "specialist";
  cover: string;
  status?: "draft" | "published";
  visibility?: "public" | "groups";
  featured?: boolean;
  minutes: number;
  modules: SeedModule[];
  resources?: { title: string; description: string; pdf?: string; url?: string }[];
};

export const categories = [
  { slug: "country-essentials", name: "Country essentials", is_destination: false, description: "How Costa Rica works: regions, seasons, logistics." },
  { slug: "arenal-la-fortuna", name: "Arenal & La Fortuna", is_destination: true, description: "Volcano, lake, hot springs and hanging bridges." },
  { slug: "monteverde", name: "Monteverde", is_destination: true, description: "Cloud forest reserves at 1,400 m." },
  { slug: "manuel-antonio", name: "Manuel Antonio", is_destination: true, description: "National park beaches on the Central Pacific." },
  { slug: "guanacaste", name: "Guanacaste", is_destination: true, description: "Dry-forest coast and the country's sunniest beaches." },
  { slug: "tortuguero", name: "Tortuguero", is_destination: true, description: "Caribbean canals reachable only by boat or light aircraft." },
  { slug: "costa-ballena", name: "Costa Ballena", is_destination: true, description: "Uvita, Marino Ballena and the whale season." },
  { slug: "central-valley", name: "Poás & Central Valley", is_destination: true, description: "Volcano craters, coffee farms and San José." },
  { slug: "groups-incentives", name: "Groups & incentives", is_destination: false, description: "Selling and operating group and incentive programs." },
];

const q = (prompt: string, options: string[], correct: number[], explanation: string, type: "single" | "multiple" | "true_false" = "single") => ({
  prompt,
  type,
  options,
  correct,
  explanation,
});

export const courses: SeedCourse[] = [
  {
    slug: "costa-rica-specialist",
    title: "Costa Rica Specialist",
    subtitle: "The certification every TravelXM advisor starts with",
    description:
      "Four modules, about two hours. You learn how TravelXM works with advisors, how the country's seven regions and two seasons shape an itinerary, the three destinations that appear in nine out of ten first trips, and how to build and sell a 10-day plan. Pass the final exam to earn your Costa Rica Specialist certificate.",
    category: "country-essentials",
    level: "specialist",
    cover: "/photos/manuel-antonio-punta-catedral-aerea.jpg",
    featured: true,
    minutes: 125,
    modules: [
      {
        title: "Welcome to TravelXM",
        description: "Who we are, what we operate, and how bookings flow from your agency to our team in San José.",
        lessons: [
          {
            title: "Who we are and how we work with advisors",
            type: "video",
            video: "videos/demo/arenal.mp4",
            poster: "/photos/fortuna-lago-arenal-volcan.jpg",
            summary: "A short tour of TravelXM: our team in San José, the programs we run and what we handle for you on the ground.",
          },
          {
            title: "How to book with TravelXM",
            type: "reading",
            minutes: 6,
            summary: "Quotes, deposits, final documents and who to call when a client's flight is delayed.",
            body: doc(
              p("Every TravelXM booking follows the same five steps. Knowing them lets you give clients firm dates instead of estimates."),
              h2("The five steps"),
              ol(
                "Send the request through the agent portal with travel dates, party size and budget band.",
                "Receive a priced itinerary within one business day, with hotel alternatives for each night.",
                "Confirm with a 30% deposit. We hold rooms for 72 hours while you collect it.",
                "Pay the balance 45 days before arrival. Final documents follow within 48 hours.",
                "Your clients get a WhatsApp line to our operations team for the whole trip.",
              ),
              h2("Commission and payment"),
              p("Commission is paid on the land package, excluding taxes and park fees, within 15 days of the clients' return. You see every booking and its status in the agent portal."),
              quote("If a client's flight is delayed, call operations, not sales. The transfer driver is rescheduled from there, day or night."),
              h2("What we need from you"),
              ul(
                "Full names exactly as they appear on passports.",
                "Arrival and departure flight numbers.",
                "Dietary needs and mobility limitations at booking, not at check-in.",
              ),
            ),
          },
          {
            title: "TravelXM advisor handbook",
            type: "pdf",
            pdf: "documents/demo/advisor-handbook.pdf",
            summary: "The reference guide: contacts, booking terms, cancellation rules and emergency procedures.",
            minutes: 8,
          },
        ],
      },
      {
        title: "Geography and seasons",
        description: "Seven regions, two seasons and the driving times that decide how many hotels an itinerary can hold.",
        requires: [0],
        lessons: [
          {
            title: "Seven regions in one small country",
            type: "video",
            video: "videos/demo/monteverde.mp4",
            poster: "/photos/monteverde-bosque-nuboso-neblina.jpg",
            summary: "From the Caribbean canals to the Pacific dry forest, and why 250 km can take six hours.",
          },
          {
            title: "Green season and dry season",
            type: "reading",
            minutes: 7,
            summary: "When to send clients where, month by month.",
            body: doc(
              p("Costa Rica has two seasons, and they do not fall on the same months on both coasts. Getting this right is the fastest way to earn a repeat client."),
              h2("Dry season: December to April"),
              p("The Pacific side and the Central Valley are at their driest. Guanacaste gets almost no rain from January to March. Prices and occupancy peak over Christmas, New Year and Easter week, so book those dates ", b("six to nine months ahead"), "."),
              h2("Green season: May to November"),
              p("Mornings are usually clear and rain arrives in the afternoon. Rates drop 20–35% and the forests are at their fullest. September and October are the wettest months on the Pacific side."),
              h3("The Caribbean exception"),
              p("Tortuguero and the south Caribbean follow their own pattern. September and October are among the driest months there, which makes them the best green-season recommendation."),
              h2("Wildlife calendar"),
              ul(
                "Humpback whales at Marino Ballena: late July to October, and December to March.",
                "Green turtle nesting in Tortuguero: July to October.",
                "Resplendent quetzal in Monteverde and San Gerardo de Dota: February to May.",
              ),
            ),
          },
          {
            title: "Official visitor information",
            type: "link",
            url: "https://www.visitcostarica.com/en",
            summary: "The Costa Rica Tourism Board site: entry requirements, health rules and national park updates.",
            minutes: 5,
          },
        ],
      },
      {
        title: "Signature destinations",
        description: "Arenal, Monteverde and Manuel Antonio: what to book, where to stay and how long to stay.",
        requires: [1],
        lessons: [
          {
            title: "Arenal and La Fortuna",
            type: "video",
            video: "videos/demo/arenal.mp4",
            poster: "/photos/fortuna-lago-arenal-volcan.jpg",
            summary: "Hot springs, hanging bridges and the volcano views that sell the trip.",
          },
          {
            title: "Monteverde cloud forest",
            type: "video",
            video: "videos/demo/monteverde.mp4",
            poster: "/photos/monteverde-puente-colgante-canopy.jpg",
            summary: "Reserves, night walks and why two nights is the minimum.",
          },
          {
            title: "Manuel Antonio",
            type: "video",
            video: "videos/demo/manuel-antonio.mp4",
            poster: "/photos/manuel-antonio-playa-palmeras.jpg",
            summary: "Park beaches, catamaran days and the hotels on the ridge.",
          },
          {
            title: "Destination fact sheets",
            type: "document",
            pdf: "documents/demo/destination-fact-sheets.pdf",
            summary: "One page per destination: altitude, driving times, signature activities and hotel tiers.",
            minutes: 5,
          },
        ],
      },
      {
        title: "Selling Costa Rica",
        description: "Build a 10-day first-timer itinerary and pass the final exam.",
        requires: [2],
        lessons: [
          {
            title: "Building a 10-day first-timer itinerary",
            type: "reading",
            minutes: 8,
            summary: "The route most first-time visitors should take, and when to change it.",
            body: doc(
              p("Nine out of ten first-time clients are best served by the same shape of trip: volcano, cloud forest, beach. The order matters more than the hotels."),
              h2("The classic route"),
              ol(
                "Night 1 · San José or Alajuela, close to the airport.",
                "Nights 2–4 · Arenal. Three nights leave a full day for hot springs and one for the hanging bridges and a waterfall.",
                "Nights 5–6 · Monteverde. Two nights so the morning reserve walk is not rushed.",
                "Nights 7–9 · Manuel Antonio or Guanacaste for the beach.",
              ),
              h2("When to change it"),
              ul(
                "Families with children under 8: skip the Arenal–Monteverde road and add a second beach instead.",
                "Honeymooners: swap Manuel Antonio for a Guanacaste resort and add a private transfer.",
                "Wildlife-first clients in July to October: add Tortuguero for turtle nesting.",
              ),
              quote("Never put more than one hotel change on a travel day. Clients remember the drives, not the distances."),
            ),
          },
          {
            title: "Specialist final exam",
            type: "quiz",
            summary: "Eight questions. Score 80% to earn your certificate. You have three attempts.",
            quiz: {
              passing: 80,
              attempts: 3,
              questions: [
                q("What deposit confirms a TravelXM booking?", ["10%", "30%", "50%", "The full amount"], [1], "A 30% deposit confirms the booking. Rooms are held for 72 hours while you collect it."),
                q("When is the balance due?", ["On arrival", "7 days before arrival", "45 days before arrival", "90 days before arrival"], [2], "The balance is due 45 days before arrival. Final documents follow within 48 hours."),
                q("Which months are driest on the Caribbean side?", ["January and February", "September and October", "April and May", "December and January"], [1], "The Caribbean follows its own pattern: September and October are among its driest months."),
                q("Which of these are good green-season recommendations?", ["Tortuguero in September", "Guanacaste in October", "Monteverde in the morning", "A beach day every afternoon"], [0, 2], "Tortuguero is dry in September and mornings are usually clear everywhere. Afternoons bring the rain on the Pacific side."),
                q("How many nights should a first-timer spend in Monteverde at minimum?", ["One", "Two", "Four", "It depends on the hotel"], [1], "Two nights, so the morning reserve walk is not rushed after the drive in."),
                q("Humpback whales can be seen at Marino Ballena twice a year.", ["True", "False"], [0], "Northern and southern populations visit: late July to October, and December to March.", "true_false"),
                q("Who should the advisor call when a client's flight is delayed?", ["The hotel", "TravelXM sales", "TravelXM operations", "The airline"], [2], "Operations reschedules the transfer driver at any hour."),
                q("What is the key rule for travel days?", ["Always drive at night", "One hotel change at most", "Book the cheapest transfer", "Avoid the Central Valley"], [1], "Never put more than one hotel change on a travel day."),
              ],
            },
          },
        ],
      },
    ],
    resources: [
      { title: "TravelXM advisor handbook", description: "Contacts, booking terms and emergency procedures.", pdf: "documents/demo/advisor-handbook.pdf" },
      { title: "Destination fact sheets", description: "One page per destination with driving times and hotel tiers.", pdf: "documents/demo/destination-fact-sheets.pdf" },
      { title: "Costa Rica Tourism Board", description: "Official entry requirements and park updates.", url: "https://www.visitcostarica.com/en" },
    ],
  },
  {
    slug: "arenal-la-fortuna",
    title: "Arenal & La Fortuna",
    subtitle: "Volcano, lake and hot springs",
    description:
      "The destination almost every client visits. Learn the three hot-spring properties we book most, the hanging bridges versus the waterfall hike, and how many nights each traveller type needs.",
    category: "arenal-la-fortuna",
    level: "foundation",
    cover: "/photos/fortuna-lago-arenal-volcan.jpg",
    minutes: 40,
    modules: [
      {
        title: "The volcano and the lake",
        description: "Geography, access roads and where to stay.",
        lessons: [
          { title: "Arenal in four minutes", type: "video", video: "videos/demo/arenal.mp4", poster: "/photos/fortuna-lago-arenal-volcan.jpg", summary: "The volcano, Lake Arenal and the town of La Fortuna." },
          {
            title: "Where to stay",
            type: "reading",
            minutes: 5,
            summary: "Three hotel tiers and which clients each one suits.",
            body: doc(
              p("La Fortuna sits 7 km from the volcano. Most hotels line the road between the town and the national park entrance."),
              h2("Hotel tiers"),
              ul(
                "Volcano-view lodges: rooms facing the cone, best for couples and photographers.",
                "Hot-spring resorts: the springs are on site, so families rarely need a car.",
                "Town hotels: walkable to restaurants, the best value for budget travellers.",
              ),
              p("Ask whether the room faces the volcano. Clouds cover the summit most afternoons, and a clear sunrise view is what clients photograph."),
            ),
          },
        ],
      },
      {
        title: "Hot springs, bridges and waterfalls",
        description: "The three signature activities and how to combine them.",
        lessons: [
          { title: "A day in La Fortuna", type: "video", video: "videos/demo/rio-celeste.mp4", poster: "/photos/fortuna-catarata-rio-celeste.jpg", summary: "Morning bridges, afternoon waterfall, evening springs." },
          { title: "Arenal fact sheet", type: "pdf", pdf: "documents/demo/arenal-fact-sheet.pdf", summary: "Driving times, altitudes and the activities we book.", minutes: 4 },
        ],
      },
      {
        title: "Check your knowledge",
        description: "Four questions on Arenal.",
        requires: [0, 1],
        lessons: [
          {
            title: "Arenal quiz",
            type: "quiz",
            summary: "Four questions. Score 75% to complete the course.",
            quiz: {
              passing: 75,
              attempts: null,
              questions: [
                q("How far is La Fortuna from the volcano?", ["About 7 km", "About 40 km", "About 90 km", "It sits on the crater"], [0], "La Fortuna is about 7 km from Arenal."),
                q("Which hotel tier suits families who do not want to drive?", ["Town hotels", "Hot-spring resorts", "Volcano-view lodges"], [1], "Hot-spring resorts have the springs on site."),
                q("When is the summit most often covered by cloud?", ["Early morning", "Afternoon", "Never"], [1], "Clouds usually cover the summit in the afternoon."),
                q("Hanging bridges are best visited in the morning.", ["True", "False"], [0], "Wildlife is most active and the light is better in the morning.", "true_false"),
              ],
            },
          },
        ],
      },
    ],
    resources: [{ title: "Arenal fact sheet", description: "Driving times, altitudes and bookable activities.", pdf: "documents/demo/arenal-fact-sheet.pdf" }],
  },
  {
    slug: "monteverde-cloud-forest",
    title: "Monteverde Cloud Forest",
    subtitle: "Reserves, night walks and the road in",
    description: "What makes a cloud forest, which of the four reserves to book, and how to set expectations for the road from Arenal.",
    category: "monteverde",
    level: "foundation",
    cover: "/photos/monteverde-bosque-nuboso-neblina.jpg",
    minutes: 30,
    modules: [
      {
        title: "The cloud forest",
        description: "Reserves, canopy and wildlife.",
        lessons: [
          { title: "Inside the cloud forest", type: "video", video: "videos/demo/monteverde.mp4", poster: "/photos/monteverde-bosque-nuboso-neblina.jpg", summary: "Monteverde, Santa Elena and the canopy bridges." },
          {
            title: "Choosing a reserve",
            type: "reading",
            minutes: 5,
            summary: "Monteverde, Santa Elena, Curi-Cancha or the Children's Eternal Rain Forest.",
            body: doc(
              p("Monteverde sits at about 1,400 m. Four reserves protect the forest, and each suits a different client."),
              ul(
                "Monteverde Reserve: the best-known trails, busiest from 9:00. Book the 7:00 guided walk.",
                "Santa Elena: higher and wetter, fewer visitors.",
                "Curi-Cancha: open clearings, the best odds for quetzals from February to May.",
                "Night walks: tarantulas, sloths and tree frogs. Two hours, suitable for children.",
              ),
            ),
          },
        ],
      },
      {
        title: "Getting there",
        description: "Roads, transfers and timing.",
        lessons: [
          {
            title: "The road from Arenal",
            type: "reading",
            minutes: 4,
            summary: "Jeep-boat-jeep or the long road around the lake.",
            body: doc(
              p("There are two ways from Arenal to Monteverde. Tell clients which one they are on before they leave."),
              ul(
                "Jeep-boat-jeep: about 3 hours including a 30-minute boat across Lake Arenal. Luggage travels with them.",
                "Private road transfer: about 3.5 hours around the lake, the last 30 minutes on a rough road.",
              ),
              p("Clients prone to motion sickness should take the boat option and sit in the front seat for the last stretch."),
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "manuel-antonio",
    title: "Manuel Antonio",
    subtitle: "Beaches inside a national park",
    description: "The park, the ridge-top hotels and the day trips that fill a three-night stay on the Central Pacific.",
    category: "manuel-antonio",
    level: "foundation",
    cover: "/photos/manuel-antonio-playa-palmeras.jpg",
    minutes: 25,
    modules: [
      {
        title: "Park and beaches",
        description: "What to book and when.",
        lessons: [
          { title: "Manuel Antonio in five minutes", type: "video", video: "videos/demo/manuel-antonio.mp4", poster: "/photos/manuel-antonio-playa-palmeras.jpg", summary: "The park, Espadilla beach and the ridge." },
          {
            title: "Park rules clients must know",
            type: "reading",
            minutes: 4,
            summary: "Closed on Tuesdays, timed tickets and what can come in.",
            body: doc(
              ul(
                "The park is closed on Tuesdays. Plan the park day around it.",
                "Tickets are timed and sold online only. We book them with the guide.",
                "No food in plastic packaging and no drones. Bags are checked at the gate.",
                "A guide with a spotting scope roughly triples the wildlife clients see.",
              ),
            ),
          },
          { title: "National park information", type: "link", url: "https://www.sinac.go.cr/EN-US/Pages/default.aspx", summary: "Opening hours and rules from SINAC, the national park authority.", minutes: 3 },
        ],
      },
    ],
  },
  {
    slug: "tortuguero-canals",
    title: "Tortuguero Canals",
    subtitle: "The Caribbean coast by boat",
    description: "How clients get to a village with no roads, what the turtle season looks like, and why two nights is the right length.",
    category: "tortuguero",
    level: "foundation",
    cover: "/photos/tortuguero-canales-palmeras-aereo.jpg",
    minutes: 20,
    modules: [
      {
        title: "Getting to Tortuguero",
        description: "Boats, flights and lodges.",
        lessons: [
          { title: "The canals", type: "video", video: "videos/demo/tortuguero.mp4", poster: "/photos/tortuguero-canales-palmeras-aereo.jpg", summary: "Boat transfers and the lodges along the canals." },
          {
            title: "Turtle season",
            type: "reading",
            minutes: 4,
            summary: "Green turtles from July to October.",
            body: doc(
              p("Green turtles nest on Tortuguero's beach from July to October, with the peak in August. Night tours run with certified guides only, in groups of up to 10."),
              p("Cameras and phone screens are not allowed on the beach at night. Tell clients before they arrive so nobody is disappointed."),
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "costa-ballena-whales",
    title: "Costa Ballena & the whales",
    subtitle: "Uvita and Marino Ballena National Park",
    description: "Two whale seasons, a beach shaped like a whale's tail and the waterfall day that completes the stay.",
    category: "costa-ballena",
    level: "advanced",
    cover: "/photos/uvita-ballena-jorobada-marino-ballena.jpg",
    minutes: 20,
    modules: [
      {
        title: "Whale season",
        description: "When and how to see humpbacks.",
        lessons: [
          { title: "Humpbacks at Marino Ballena", type: "video", video: "videos/demo/tortuguero.mp4", poster: "/photos/uvita-ballena-jorobada-marino-ballena.jpg", summary: "Boat tours and the two migrations." },
          {
            title: "Planning a Costa Ballena stay",
            type: "reading",
            minutes: 4,
            summary: "Three nights, one boat morning and one waterfall day.",
            body: doc(
              p("Book the whale tour for the first full morning so a rough sea can be rescheduled. The Nauyaca waterfalls fill the second day."),
              p("The whale's tail sandbar at Punta Uvita is only walkable at low tide. Check the tide table when you plan the beach day."),
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "groups-incentives-2027",
    title: "Groups & Incentives Playbook 2027",
    subtitle: "For partner agencies only",
    description:
      "Rates, room blocks and run-of-show for groups of 20 to 200. Available to agencies in the 2027 partner program.",
    category: "groups-incentives",
    level: "advanced",
    cover: "/photos/guanacaste-playa-hermosa-atardecer.jpg",
    visibility: "groups",
    minutes: 45,
    modules: [
      {
        title: "Program structure",
        description: "How a TravelXM incentive is built.",
        lessons: [
          { title: "Anatomy of an incentive program", type: "video", video: "videos/demo/rio-celeste.mp4", poster: "/photos/guanacaste-playa-hermosa-atardecer.jpg", summary: "From the site inspection to the farewell dinner." },
          { title: "2027 partner rate sheet", type: "pdf", pdf: "documents/demo/partner-rate-sheet.pdf", summary: "Group rates, blackout dates and room-block rules.", minutes: 6 },
        ],
      },
      {
        title: "Selling the program",
        description: "Proposals and the partner exam.",
        requires: [0],
        lessons: [
          {
            title: "Writing the proposal",
            type: "reading",
            minutes: 6,
            summary: "What corporate buyers ask for first.",
            body: doc(
              p("Corporate buyers compare three things before anything else: cost per head, the number of hotel changes and the group moments."),
              ul(
                "Keep to one hotel for groups over 60.",
                "Schedule one private group moment per day, not more.",
                "Include a rain plan for every outdoor event from May to November.",
              ),
            ),
          },
          {
            title: "Partner exam",
            type: "quiz",
            summary: "Three questions. Score 100% to complete.",
            quiz: {
              passing: 100,
              attempts: null,
              questions: [
                q("How many hotels for a group of 80?", ["One", "Two", "Three"], [0], "Keep to one hotel for groups over 60."),
                q("Which months need a rain plan for outdoor events?", ["December to April", "May to November", "Only October"], [1], "Green season runs from May to November."),
                q("How many private group moments per day?", ["One", "Three", "As many as possible"], [0], "One per day keeps the program relaxed."),
              ],
            },
          },
        ],
      },
    ],
    resources: [{ title: "2027 partner rate sheet", description: "Group rates, blackout dates and room-block rules.", pdf: "documents/demo/partner-rate-sheet.pdf" }],
  },
  {
    slug: "poas-central-valley",
    title: "Poás & the Central Valley",
    subtitle: "Craters, coffee and San José",
    description: "Arrival and departure days done well: the Poás crater, a coffee farm and the best of San José.",
    category: "central-valley",
    level: "foundation",
    cover: "/photos/poas-tucan-pico-iris.jpg",
    status: "draft",
    minutes: 20,
    modules: [
      {
        title: "Arrival day ideas",
        description: "Short trips near the airport.",
        lessons: [
          {
            title: "Poás volcano",
            type: "reading",
            minutes: 4,
            summary: "Timed entry and the morning rule.",
            body: doc(p("Poás is 55 km from the airport. The crater is clearest before 10:00, so book the first entry slot.")),
          },
        ],
      },
    ],
  },
];

export const photoForVideo: Record<string, string> = {
  "videos/demo/arenal.mp4": "public/photos/fortuna-lago-arenal-volcan.jpg",
  "videos/demo/monteverde.mp4": "public/photos/monteverde-bosque-nuboso-neblina.jpg",
  "videos/demo/manuel-antonio.mp4": "public/photos/manuel-antonio-playa-palmeras.jpg",
  "videos/demo/tortuguero.mp4": "public/photos/tortuguero-canales-palmeras-aereo.jpg",
  "videos/demo/rio-celeste.mp4": "public/photos/fortuna-catarata-rio-celeste.jpg",
};
