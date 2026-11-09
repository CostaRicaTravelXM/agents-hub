/**
 * The Greenroom master classes: one course per episode, written from each video's
 * transcript. Read by scripts/import-masterclasses.mts (real videos) and by the
 * local demo seed (placeholder videos), so both show the same catalog.
 *
 * Quiz answers are option indexes. Every question must be answerable from the video.
 */

export type MasterclassQuestion = {
  prompt: string;
  type: "single" | "multiple" | "true_false";
  options: string[];
  correct: number[];
  explanation: string;
};

export type Masterclass = {
  /** The Drive file's prefix, also the media folder name. */
  code: string;
  slug: string;
  title: string;
  /** One line under the title on cards and the course page. */
  subtitle: string;
  description: string;
  /** Under the video lesson's title in the syllabus. */
  lessonSummary: string;
  quiz: { passing: number; questions: MasterclassQuestion[] };
};

export const CATEGORY = {
  slug: "masterclasses",
  name: "Masterclasses",
  description: "Greenroom sessions from the TravelXM team in San José, each with a quiz and a certificate.",
  sort_order: 0,
};

const TF = ["True", "False"];

export const masterclasses: Masterclass[] = [
  {
    code: "GR01",
    slug: "costa-rica-seller-foundations",
    title: "Costa Rica Seller Foundations",
    subtitle: "Match each client's motivation to the right region, and build the trip around two bases.",
    description:
      "The first Greenroom session. Eric Salazar, TravelXM's product and sales manager, explains why Costa Rica sells all year: short non-stop flights, a drier season from December to April and a green season from May to November. He shows how to start from what the traveller wants to feel rather than from the map, why two regions with several nights each beat a new hotel every other day, which airport to use, and the six habits of advisors who sell Costa Rica well.",
    lessonSummary: "Why Costa Rica sells all year, matching motivation to region, the two-base rule and the first-timer route.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "What is the two-base rule?",
          type: "single",
          options: [
            "Two, at most three, regions with several nights in each",
            "A different hotel every night, to see more of the country",
            "One hotel for the whole trip, with day trips everywhere",
            "Always start and finish the trip in San José",
          ],
          correct: [0],
          explanation: "Less driving, more time for each region's activities, and happier clients. Less travel, better experience.",
        },
        {
          prompt: "Where should you start when choosing regions for a client?",
          type: "single",
          options: [
            "The map, covering as much of the country as possible",
            "What the traveller wants to feel and experience",
            "The hotels with the lowest rates",
            "The region closest to the airport",
          ],
          correct: [1],
          explanation: "Motivation first. Listen for the words clients use (hot springs, wildlife, adventure, relaxation) and match them to the region.",
        },
        {
          prompt: "Which route does the session give as the classic first-timer trip?",
          type: "single",
          options: [
            "Arenal Volcano for three nights, then Manuel Antonio for three or four",
            "Tortuguero, Osa and Guanacaste in six nights",
            "Five regions in seven nights",
            "San José for the whole stay, with day trips",
          ],
          correct: [0],
          explanation: "Both are within about two and a half to three hours of San José airport, with enough nights in each to settle in.",
        },
        {
          prompt: "Your clients want luxury villas and five-star resorts on the Pacific coast. Which airport should they fly into?",
          type: "single",
          options: ["San José (SJO)", "Liberia (LIR)", "Either, it makes no difference", "Limón"],
          correct: [1],
          explanation: "Use the correct airport. Liberia serves the villas and five-star hotels of the north Pacific; San José suits trips across two or three central regions.",
        },
        {
          prompt: "When is Costa Rica's green season?",
          type: "single",
          options: ["December to April", "May or June to November", "July and August only", "There is no green season"],
          correct: [1],
          explanation: "December to April is the drier season. May or June to November is the green season, with flowers and animals everywhere.",
        },
        {
          prompt: "More stops make a better vacation.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Every hotel change costs vacation time. A simple itinerary creates more and better memories than trying to see everything.",
        },
        {
          prompt: "What turns a three-hour airport transfer into real value for the client?",
          type: "single",
          options: [
            "A faster vehicle",
            "A discount on the transfer price",
            "A driver-guide who stops at a coffee farm, a tortilla maker or an oxcart workshop on the way",
            "Taking the transfer at night to save a day",
          ],
          correct: [2],
          explanation: "Give more than the paper says. The stops along the way make the transfer part of the trip.",
        },
        {
          prompt: "Which of these is one of the habits of top Costa Rica advisors?",
          type: "single",
          options: [
            "Quote the lowest price first",
            "Fit in as many regions as possible",
            "Plan the second trip early",
            "Let clients choose their own guides",
          ],
          correct: [2],
          explanation: "The six habits: match motivation first, sell two-base itineraries, use the correct airport, recommend guides, set expectations confidently and plan the second trip early.",
        },
      ],
    },
  },
  {
    code: "GR02",
    slug: "seasons-gateways-transfers",
    title: "Seasons, Gateways & Transfers",
    subtitle: "When to send clients, which airport to use, and how to pace the days between regions.",
    description:
      "Trips are won or lost on logistics. Eric Salazar walks through Costa Rica's two seasons (and why the Caribbean side has its own), when to choose San José or Liberia, real driving times between the main regions, the four laws of pace, the four ways to get around, and the planning mistakes behind most client complaints.",
    lessonSummary: "Seasons and microclimates, the two international airports, driving times, the four laws of pace and transfer options.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "Under the four laws of pace, how do you count a day when clients move from one region to the next?",
          type: "single",
          options: ["As a full day of activities", "As a half day", "As a rest day", "It does not count as a day"],
          correct: [1],
          explanation: "Two nights minimum per base, three bases maximum, adventure first, and travel days are half days.",
        },
        {
          prompt: "Clients are staying at an all-inclusive resort on the Papagayo Gulf. Which airport should they use?",
          type: "single",
          options: [
            "Liberia (LIR), 30 minutes to an hour from the resorts",
            "San José (SJO), the main international airport",
            "Either airport, the transfer is the same",
            "A domestic flight from San José",
          ],
          correct: [0],
          explanation: "Liberia serves Guanacaste, the Papagayo Gulf and Tamarindo. San José is the gateway to Arenal, Monteverde, Manuel Antonio and the Caribbean.",
        },
        {
          prompt: "How long should you plan for the transfer from San José to Arenal and La Fortuna?",
          type: "single",
          options: ["About an hour", "Three to three and a half hours, so half a day", "A full day", "Around six hours"],
          correct: [1],
          explanation: "With stops for coffee farms, lunch and views along the way, the transfer takes half a day and becomes part of the trip.",
        },
        {
          prompt: "Which way of getting around do nearly all TravelXM clients choose?",
          type: "single",
          options: ["Shared shuttles", "Self-drive rental cars", "Private transfers with a bilingual driver-guide", "Domestic flights between every region"],
          correct: [2],
          explanation: "Private transfers are door to door, can stop wherever the clients like, and suit families and honeymooners. Shared shuttles can lose an hour collecting other passengers.",
        },
        {
          prompt: "Clients land in the afternoon after a long international flight. What is the right plan?",
          type: "single",
          options: [
            "Drive straight to their first region that evening",
            "A first night close to the arrival airport, then travel the next day",
            "Book an evening tour so they make the most of the day",
            "Take a domestic flight straight to the coast",
          ],
          correct: [1],
          explanation: "Long transfers straight after an international arrival are one of the logistics mistakes TravelXM avoids.",
        },
        {
          prompt: "Clients have an international flight home, and their last hotel is three hours from the airport. What do you do?",
          type: "single",
          options: [
            "Leave the hotel three hours before the flight",
            "Leave six hours before the flight and skip breakfast",
            "Move them to the departure region the night before",
            "Book a later flight",
          ],
          correct: [2],
          explanation: "Airports ask for three hours before the flight, so a three-hour drive leaves no buffer. Return to the departure region the night before.",
        },
        {
          prompt: "How far ahead should you start arranging a trip for the busy December to April season?",
          type: "single",
          options: ["Two weeks", "One month", "At least six months", "There is no need to plan ahead"],
          correct: [2],
          explanation: "The drier Pacific season is the busiest and priciest time, with less availability. Plan at least six months ahead.",
        },
        {
          prompt: "In the green season it rains all day, so it is best avoided.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "It can rain and be sunny again 30 minutes later. The green season brings lower prices, fewer people and more flowers and wildlife.",
        },
      ],
    },
  },
  {
    code: "GR04",
    slug: "top-producer-playbook",
    title: "Top Producer Playbook",
    subtitle: "Earn more from the same hours: premium fees, bigger bookings, repeat clients and referrals.",
    description:
      "Two advisors work the same 40 hours. One closes 30 trips at $4,000, the other 18 trips at $11,000 plus fees, half of them repeat clients. Marco Canizales breaks down what the second advisor does differently: stating a planning fee without apologising, the four rungs that raise every booking's value, the 30-day habit that sets up the next trip, and a referral system that runs on fixed moments instead of hope.",
    lessonSummary: "Premium positioning, the booking value ladder, the repeat engine and referrals, applied to Costa Rica.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "You have just told a client your planning fee. What should you do next?",
          type: "single",
          options: [
            "Explain that it can be credited against the trip",
            "Stop talking and let the silence work",
            "Offer a discount if they book this week",
            "List everything the fee covers, one item at a time",
          ],
          correct: [1],
          explanation: "State the fee, then silence. The advisors who lose the fee conversation are the ones who keep talking after the number.",
        },
        {
          prompt: "What are the four rungs of the booking value ladder?",
          type: "single",
          options: [
            "Room, experience, length, season",
            "Flights, transfers, hotels, tours",
            "Fee, deposit, upgrade, insurance",
            "Region, coast, lodge, guide",
          ],
          correct: [0],
          explanation: "Touch all four on every file (room category, a signature experience, an extra night, shoulder-season steering) and the average booking climbs without a single extra client.",
        },
        {
          prompt: "How should you present room categories at Costa Rica's top lodges?",
          type: "single",
          options: [
            "Quote the base room and offer upgrades later",
            "Show every category side by side with prices",
            "Present the upgraded room as the default and the base room as the fallback",
            "Let the client pick from the lodge's own website",
          ],
          correct: [2],
          explanation: "At the top lodges the plunge-pool and view categories are the product. Never quote the base room.",
        },
        {
          prompt: "Where should a signature experience, such as a private naturalist day in Corcovado, appear?",
          type: "single",
          options: [
            "In the proposal itself, one per base",
            "As an optional add-on at the end of the PDF",
            "In a follow-up email after the client books",
            "Only if the client asks about activities",
          ],
          correct: [0],
          explanation: "What is in the proposal gets bought. What is an add-on in a PDF gets ignored.",
        },
        {
          prompt: "When should the client's next trip be set up?",
          type: "single",
          options: [
            "On the last night of the current trip",
            "Within 30 days of the last trip ending",
            "Six months later, with a newsletter",
            "When the client gets in touch again",
          ],
          correct: [1],
          explanation: "Run the debrief call in week one, then within 30 days send one idea built on the client's own words.",
        },
        {
          prompt: "Which debrief question gives you the next trip in the client's own words?",
          type: "single",
          options: [
            "What was the peak of the trip?",
            "What would you change?",
            "What did you find yourself saying you'll do next time?",
            "Would you recommend us to a friend?",
          ],
          correct: [2],
          explanation: "The third question's answer is the next trip, spoken by the client. Write it down word for word.",
        },
        {
          prompt: "Clients who send you referrals should be rewarded with a discount on their next trip.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Reward with recognition (a handwritten note, Costa Rican coffee or chocolate, first call on hot dates). Discounts train everyone to expect discounts.",
        },
        {
          prompt: "Which referral ask works best?",
          type: "single",
          options: [
            "Do you know anyone who needs a travel advisor?",
            "Please share my details with your friends.",
            "You mentioned your sister loved your photos. Would an introduction make sense?",
            "Leave me a review and tag a friend.",
          ],
          correct: [2],
          explanation: "Name the person and define the next step. The named ask beats the open ask.",
        },
      ],
    },
  },
];
