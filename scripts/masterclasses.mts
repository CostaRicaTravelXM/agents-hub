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
    code: "GR03",
    slug: "luxury-and-eco-luxury",
    title: "Luxury & Eco-Luxury",
    subtitle: "In Costa Rica luxury is access, privacy and nature. Match the tier, then add value instead of discounting.",
    description:
      "Luxury in Costa Rica does not need marble. Eric Salazar explains why the country's luxury is private access to nature, exclusive hours and the best guides, and why luxury clients pay premium rates and come back. He covers the four luxury tiers, the three questions that place a client in the right one, the deal breakers to find early, the two-base luxury itinerary and how to answer \"for that price we could go to Europe\" without cutting the rate.",
    lessonSummary: "What luxury means in Costa Rica, the four tiers, the three luxury questions, two-base design and objection handling.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "According to the session, what is luxury in Costa Rica?",
          type: "single",
          options: [
            "Marble lobbies and big-name hotel chains",
            "Access, privacy and nature",
            "The highest nightly rate available",
            "As many activities as possible each day",
          ],
          correct: [1],
          explanation: "Luxury does not need marble. In Costa Rica luxury is what you get access to: exclusive places, hours and guides, with privacy and nature.",
        },
        {
          prompt: "Which of these is one of the four luxury tiers?",
          type: "single",
          options: ["Eco-luxury lodges", "Budget hostels", "Shared group tours", "Cruise ship cabins"],
          correct: [0],
          explanation: "The four tiers: marquee resorts, eco-luxury lodges, estate and wellness retreats, and private villas.",
        },
        {
          prompt: "What are the three luxury questions?",
          type: "single",
          options: [
            "Budget, dates and group size",
            "How much privacy, what pace and how much brand recognition",
            "Beach, mountains or city",
            "Flights, transfers and insurance",
          ],
          correct: [1],
          explanation: "Privacy, pace and recognition place the client in the right tier, before you pick a property.",
        },
        {
          prompt: "Which of these can be deal breakers for some luxury guests, so you should find out about them early?",
          type: "multiple",
          options: ["Mobility needs and stairs", "Hillside properties", "Boat or 4x4 access", "The colour of the room"],
          correct: [0, 1, 2],
          explanation: "Mobility, stairs, hillside properties and boat or 4x4 access are deal breakers for some guests. Know your client before they travel.",
        },
        {
          prompt: "How does the session shape a luxury itinerary?",
          type: "single",
          options: [
            "A new lodge every night",
            "Two bases, rainforest and coast, with four or more nights each",
            "One week in San José with day trips",
            "Five regions in ten nights",
          ],
          correct: [1],
          explanation: "Two bases, four or more nights each, unpack only once.",
        },
        {
          prompt: "Luxury clients can save money with shared shuttles between regions without affecting the experience.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Private transfers, private vehicles or short domestic flights. Never a shared shuttle: luxury clients should not be mixed with other travellers.",
        },
        {
          prompt: "How many signature experiences should each stay have?",
          type: "single",
          options: ["None, leave the days open", "One extraordinary moment per stay", "One every day", "As many as the budget allows"],
          correct: [1],
          explanation: "One irreplaceable moment in each base, not a full activity calendar.",
        },
        {
          prompt: "A client says: \"For that price we could go to Europe or the Maldives.\" What is the right response?",
          type: "single",
          options: [
            "Offer a discount to match",
            "Switch them to a cheaper hotel",
            "Compare the experience, not the rate, and add value such as an upgrade or a private transfer",
            "Agree and suggest they book Europe",
          ],
          correct: [2],
          explanation: "Add value, don't discount. An upgrade, a private transfer or a signature dinner protects the rate and raises the perceived value.",
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
  {
    code: "GR05",
    slug: "mice-corporate-retreats",
    title: "MICE & Corporate Retreats",
    subtitle: "Qualify the committee, never quote without the full RFP, and design mornings for the mission.",
    description:
      "Corporate groups need three things: rooms in one block, real meeting space and an airport transfer under two hours. Marco Canizales shows the two Costa Rica zones that deliver all three, how to qualify a buying committee and work through a complete request for proposal, how to budget per person per day, how to build an agenda around morning sessions and afternoon experiences, and the contract clauses to read before your client does.",
    lessonSummary: "The two MICE zones, committee qualification and the RFP, budgets and timelines, agenda design and contracts.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "What three things does every corporate group need?",
          type: "single",
          options: [
            "Rooms in one block, real meeting space and an airport transfer under two hours",
            "A beach, a volcano and a rainforest",
            "The lowest rate, free upgrades and late checkout",
            "A five-star brand, a golf course and a casino",
          ],
          correct: [0],
          explanation: "Rooms in one block, real meeting space and one airport transfer under two hours. Costa Rica has two zones that deliver all three.",
        },
        {
          prompt: "Who are you selling to in MICE?",
          type: "single",
          options: [
            "The one person who sent the email",
            "A committee: the planner, the budget owner, the executive sponsor and the attendees",
            "Only the attendees",
            "The hotel's sales team",
          ],
          correct: [1],
          explanation: "You are never selling to one person. You are selling to a committee wearing one email address. Map it before you quote.",
        },
        {
          prompt: "The client wants a price today but has not answered the request for proposal. What do you do?",
          type: "single",
          options: [
            "Send an estimate based on a similar group",
            "Quote the lowest possible number to win the business",
            "Get the complete RFP first. Don't quote without it",
            "Quote high to leave room for negotiation",
          ],
          correct: [2],
          explanation: "Get the complete RFP done or don't quote. Accurate proposals the first time come from full answers.",
        },
        {
          prompt: "How are budgets discussed in MICE?",
          type: "single",
          options: ["Per room per night", "Per person per day", "As one total for the whole program", "Per activity"],
          correct: [1],
          explanation: "Learn the buyer's per person per day from their last two programs and design to it. A number 40% above their history without warning kills credibility.",
        },
        {
          prompt: "How far ahead are corporate programs usually booked?",
          type: "single",
          options: ["Two to four weeks", "Six to 18 months", "Three to five years", "Whenever the hotel has space"],
          correct: [1],
          explanation: "Corporate programs book six to 18 months out, so start early.",
        },
        {
          prompt: "What is the agenda rule from the session?",
          type: "single",
          options: [
            "Meetings all day, with one free afternoon at the end",
            "Mornings for the mission, afternoons for the country, one signature night",
            "Activities in the morning, meetings at night",
            "Leave the agenda to the attendees",
          ],
          correct: [1],
          explanation: "Mornings for the mission, afternoons for the country, one signature night, repeat. In green season this also keeps sessions dry when afternoons rain.",
        },
        {
          prompt: "What should the group's arrival day look like?",
          type: "single",
          options: [
            "A full strategy session straight from the airport",
            "Soft: transfer, welcome reception and an early night",
            "The signature offsite activity",
            "A long transfer to a second region",
          ],
          correct: [1],
          explanation: "Keep arrival day soft. Transfer, welcome reception, early night.",
        },
        {
          prompt: "Insurance can be offered as an option the client is free to skip without discussion.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Insurance is non-negotiable. Present it as a line item, never as an option to decline silently.",
        },
      ],
    },
  },
  {
    code: "GR06",
    slug: "wellness-transformational-travel",
    title: "Wellness & Transformational Travel",
    subtitle: "Sell the right tier, ask about day three, and remember that white space is the product.",
    description:
      "Wellness travel runs from a spa week to a life-transition retreat, and selling the wrong one is the costliest mistake in the niche. Marco Canizales explains the four wellness tiers, the Nicoya blue zone and how to talk about it honestly, the one question that tells you which tier a client needs, why a wellness stay needs one base and seven nights, how to pace the days, how to reframe the budget conversation and the lines a travel professional never crosses.",
    lessonSummary: "The four wellness tiers, the day-three question, one base and seven nights, white space and zero medical claims.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "What is the question that tells you which wellness tier a client needs?",
          type: "single",
          options: [
            "Which spa treatments do you like?",
            "It's day three of the trip, mid-morning. What do you want to be feeling like?",
            "How much do you want to spend?",
            "Have you been to a retreat before?",
          ],
          correct: [1],
          explanation: "Ask about the feeling on day three, mid-morning. The answer places the client on the spectrum.",
        },
        {
          prompt: "A client wants a spa, hot springs and good food. Which program should you not sell them?",
          type: "single",
          options: ["A resort with a spa", "A hot springs stay in Arenal", "A structured retreat", "A healthy-cuisine resort"],
          correct: [2],
          explanation: "The intensity honesty rule: never sell a structured retreat to a pampering client, or a spa week to someone in crisis.",
        },
        {
          prompt: "How does the session describe the Nicoya blue zone?",
          type: "single",
          options: [
            "A medical certification for spas",
            "A longevity culture of real food, movement, community and purpose",
            "A guarantee that guests will live longer",
            "A protected marine park",
          ],
          correct: [1],
          explanation: "Use the credential honestly. Sell eating and moving the way centenarians live for a week, never medical promises.",
        },
        {
          prompt: "What is the right shape for a wellness stay?",
          type: "single",
          options: [
            "Two or three bases to see more",
            "One base, seven nights minimum",
            "A long weekend",
            "A new lodge every two nights",
          ],
          correct: [1],
          explanation: "One base, seven nights minimum. The nervous system needs days three and four in the same bed to downshift.",
        },
        {
          prompt: "Unscheduled time in a wellness itinerary is wasted inventory you should fill.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "One anchor activity a day. The white space is not unsold inventory, it is the product.",
        },
        {
          prompt: "What should be scheduled for the first 24 hours after arrival?",
          type: "single",
          options: ["Nothing", "A yoga class and a spa treatment", "An intake session and a hike", "A welcome excursion"],
          correct: [0],
          explanation: "Arrival decompression: nothing scheduled for 24 hours. The first anchor lands gently on day two.",
        },
        {
          prompt: "A client says the retreat feels expensive. Which reframe does the session give?",
          type: "single",
          options: [
            "It's a once-in-a-lifetime treat",
            "Prices are going up next year",
            "This isn't a treat. It's maintenance for the person everyone else relies on",
            "We can take a few nights off to lower the price",
          ],
          correct: [2],
          explanation: "Anchor the cost to what burnout costs: sleep, patience and health. Then the number reads differently.",
        },
        {
          prompt: "Which of these does the session say a professional wellness seller does?",
          type: "multiple",
          options: [
            "Makes zero medical claims",
            "Books a post-trip integration check-in at two weeks",
            "Promises the trip will heal the client",
            "Fills every afternoon with activities",
          ],
          correct: [0, 1],
          explanation: "You are a travel professional, not a clinician: no medical claims, no therapy promises. Book the two-week integration call.",
        },
      ],
    },
  },
  {
    code: "GR07",
    slug: "adventure-experiential-travel",
    title: "Adventure & Experiential Travel",
    subtitle: "Grade every product and every client, design weeks as waves, and sell the safety stack.",
    description:
      "The adventure buyer is no longer a backpacker in their twenties. It is families, honeymooners and travellers over 50 who want guided, safe stories. Marco Canizales shows how to grade every activity as soft, moderate or high, grade clients on the same scale, design an adventure week as a wave of big days and recovery days, put the Pacuare River overnight at the centre of the trip, and talk about safety, insurance and waivers in a way that closes parents and executives.",
    lessonSummary: "Grading products and people, the mixed-group rule, wave design, the Pacuare overnight and selling safety.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "What three grades does the session use for activities?",
          type: "single",
          options: ["Easy, medium, extreme", "Soft, moderate, high", "Bronze, silver, gold", "Family, couple, solo"],
          correct: [1],
          explanation: "Soft, moderate, high. Grade discipline is what makes you professional in this niche.",
        },
        {
          prompt: "How should you grade a client's fitness?",
          type: "single",
          options: [
            "Ask how fit they think they are",
            "Use the same scale as the products, and believe their recent evidence over their self-image",
            "Assume everyone can do the high grade",
            "Leave it to the guide on the day",
          ],
          correct: [1],
          explanation: "Ask what is the most physical thing they have loved doing in the last year. Recent evidence beats identity.",
        },
        {
          prompt: "A mixed group has different fitness levels. What is the rule?",
          type: "single",
          options: [
            "Grade to the fittest person so nobody is bored",
            "Grade to the most cautious body, then add intensity for the rest",
            "Split the group for the whole trip",
            "Book only soft activities",
          ],
          correct: [1],
          explanation: "A group day everyone finishes beats a heroic day that breaks someone. Add split-option days for the rest.",
        },
        {
          prompt: "A client says they're nervous but want to try. What do you sell?",
          type: "single",
          options: [
            "The hardest activity first, to get it over with",
            "A graduation ladder: hanging bridges on day one, zip line on day two, rappelling on day three",
            "No adventure activities at all",
            "A private guide for the high-grade day",
          ],
          correct: [1],
          explanation: "Confidence is also a designable outcome. Step the intensity up day by day.",
        },
        {
          prompt: "An adventure week should build like a staircase, with each day harder than the last.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Adventure weeks are waves, not staircases: big day, recovery day, big day. Hot springs are recovery infrastructure.",
        },
        {
          prompt: "Which product does the session put at the centre of the adventure map?",
          type: "single",
          options: [
            "The Pacuare River overnight: raft in, sleep at the river lodge, raft out",
            "A city tour of San José",
            "A day at a beach club",
            "A canopy tour in the first hour after landing",
          ],
          correct: [0],
          explanation: "The Pacuare overnight is the single greatest adventure product in the country and the best story generator. Position it as the centrepiece.",
        },
        {
          prompt: "How should you talk about safety?",
          type: "single",
          options: [
            "Avoid it so you don't scare buyers",
            "Mention it only if the client asks",
            "Sell the safety stack proudly: licensed operators, certified guides with radios, briefings and rescue protocols",
            "Tell clients the activities have no risk",
          ],
          correct: [2],
          explanation: "Safety talk doesn't scare buyers. It closes parents and executives.",
        },
        {
          prompt: "What does the session call the cardinal sin of adventure selling?",
          type: "single",
          options: ["Underselling difficulty", "Booking named guides", "Adding recovery days", "Sending a packing list"],
          correct: [0],
          explanation: "Never undersell difficulty. Grade everything, products and people, on the same scale.",
        },
      ],
    },
  },
  {
    code: "GR08",
    slug: "weddings-and-honeymoons",
    title: "Destination Weddings & Honeymoons",
    subtitle: "Lead with the legal ceremony, pick the venue family first, and run the block and the honeymoon as two machines.",
    description:
      "In Costa Rica the beach ceremony can be the legal wedding. Marco Canizales explains how to open a consultation with that advantage, the four venue families and how guest count and the couple's need for control pick one, the questions and the 12-month timeline behind every wedding file, how to split the work with the on-site planner, and the two machines that make romance profitable: the guest room block and the honeymoon.",
    lessonSummary: "The legal ceremony, four venue families, discovery and the 12-month arc, room blocks, honeymoon design and the rain answer.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "What is the door opener for a Costa Rica wedding consultation?",
          type: "single",
          options: [
            "The ceremony on the beach can be the legal wedding, recognised back home",
            "Weddings in Costa Rica are always cheaper than at home",
            "No documents are needed",
            "Every resort includes a free wedding",
          ],
          correct: [0],
          explanation: "Civil ceremonies performed by an authorised official with the proper documents are legally valid. Check the current document list for each couple with the planners on the ground.",
        },
        {
          prompt: "Which of these are among the four venue families?",
          type: "multiple",
          options: ["Resort turnkey", "Boutique cliff top", "Barefoot beach", "A courthouse at home"],
          correct: [0, 1, 2],
          explanation: "Resort turnkey, boutique cliff top, private villa estate and barefoot beach. Guest count and the couple's appetite for control decide which.",
        },
        {
          prompt: "A couple has more than 60 guests. Which venue family suits them?",
          type: "single",
          options: ["Barefoot beach", "Resort turnkey", "Boutique cliff top", "Any, guest count doesn't matter"],
          correct: [1],
          explanation: "More than 60 guests, or a couple anxious about planning, points to a turnkey resort with packages, room blocks and a rain plan in the contract.",
        },
        {
          prompt: "Why are ceremonies timed backwards from sunset?",
          type: "single",
          options: [
            "Officials only work in the evening",
            "So the photographer can use the golden hour",
            "Venues are cheaper after dark",
            "It's a legal requirement",
          ],
          correct: [1],
          explanation: "Sunset falls in a narrow, early band all year in the tropics. Back-time the ceremony so the photographer is ready for the golden hour.",
        },
        {
          prompt: "On the wedding week, how is the work split between you and the planner on the ground?",
          type: "single",
          options: [
            "You run everything, including the florist",
            "You own the guests and the travel; the planner owns the event",
            "The planner handles the guests' flights",
            "The couple coordinates the vendors themselves",
          ],
          correct: [1],
          explanation: "Your role is client leadership plus travel logistics. Don't become a remote florist.",
        },
        {
          prompt: "How should you contract the guest room block?",
          type: "single",
          options: [
            "Commit to as many rooms as possible up front",
            "Commit conservatively and expand happily",
            "Don't contract a block; let guests book alone",
            "Only after all guests have confirmed",
          ],
          correct: [1],
          explanation: "Contract a realistic, attrition-aware base block, and publish a booking deadline that matches the venue's release date.",
        },
        {
          prompt: "How many splurges should a honeymoon have?",
          type: "single",
          options: ["One", "Two: the room category and one signature experience", "Five, one per day", "As many as the budget allows"],
          correct: [1],
          explanation: "Exactly two splurges. Scarcity keeps them special and the budget honest.",
        },
        {
          prompt: "The couple can fly out to their honeymoon the morning after the wedding.",
          type: "true_false",
          options: TF,
          correct: [1],
          explanation: "Never fly out the morning after the wedding. Write at least one decompression night into every quote.",
        },
      ],
    },
  },
  {
    code: "GR09",
    slug: "multigenerational-family-travel",
    title: "Multi-Generational & Family Travel",
    subtitle: "Sell to the matriarch, give every generation a win each day, and grade activities for the youngest and the oldest.",
    description:
      "Family trips are among the most requested at TravelXM: more travellers, more rooms, an emotional purchase and loyalty that lasts as the grandchildren grow up. Eric Salazar explains who really decides, the triple win rule for grandparents, parents and children, how to choose between villas, resorts with connecting rooms and all-inclusives, how to grade each activity for the youngest and the oldest traveller, and how to settle the money conversation early with shared and individual costs.",
    lessonSummary: "The decision maker, the triple win rule, family lodging, grading activities twice and the money conversation.",
    quiz: {
      passing: 80,
      questions: [
        {
          prompt: "Who is often the real buyer of a multi-generational trip?",
          type: "single",
          options: ["The youngest child", "The matriarch, often the mother or grandmother", "The hotel", "Whoever books the flights"],
          correct: [1],
          explanation: "Sell to the matriarch, or whoever is the decision maker. She is not only buying the itinerary, she is creating the family memory.",
        },
        {
          prompt: "What is the triple win rule?",
          type: "single",
          options: [
            "Three regions in one trip",
            "Every day has a win for the grandparents, the parents and the children",
            "Three upgrades on every booking",
            "Book three trips with each family",
          ],
          correct: [1],
          explanation: "Audit every day: is there something for the grandparents, something for the parents and something for the kids?",
        },
        {
          prompt: "What does \"grade twice\" mean for family activities?",
          type: "single",
          options: [
            "Check each activity for both the youngest and the oldest traveller",
            "Book every activity two times",
            "Ask the guide to grade the family",
            "Grade the hotel and the restaurant",
          ],
          correct: [0],
          explanation: "Design every activity for the youngest traveller as well as for the oldest.",
        },
        {
          prompt: "How many bases does the session recommend for a family trip?",
          type: "single",
          options: ["Two at most", "Four or five", "A new hotel every night", "It doesn't matter"],
          correct: [0],
          explanation: "Two bases maximum, with the adventure in the morning, depending on how active the group is.",
        },
        {
          prompt: "A family with small children wants flexibility and a kids' club. Why should they book early?",
          type: "single",
          options: [
            "Connecting rooms sell out",
            "Prices always drop later",
            "Kids' clubs close in the green season",
            "Flights must be booked a year ahead",
          ],
          correct: [0],
          explanation: "Resorts with connecting rooms suit families who want flexibility. Book early because availability is limited.",
        },
        {
          prompt: "Which lodging does the session say suits budget-minded large groups and first-time international travellers?",
          type: "single",
          options: ["All-inclusive resorts", "Remote eco-lodges", "Hostels", "Private yachts"],
          correct: [0],
          explanation: "All-inclusives are worry-free for larger groups and first-time international travellers. Add authentic Costa Rican experiences outside the resort.",
        },
        {
          prompt: "How should you handle the money conversation?",
          type: "single",
          options: [
            "Leave it until the end of planning",
            "Solve it early, splitting shared expenses from individual ones",
            "Let each family member pay the hotel separately",
            "Avoid it; the matriarch will handle it",
          ],
          correct: [1],
          explanation: "Shared: the villa, family experiences and shared activities. Individual: flights, personal upgrades and optional activities.",
        },
        {
          prompt: "What should your family intake form ask?",
          type: "multiple",
          options: ["Is there a celebration?", "Ages and mobility needs", "Dietary preferences or restrictions", "Each traveller's passport number"],
          correct: [0, 1, 2],
          explanation: "Build your intake form: the occasion, ages, mobility needs and dietary preferences or restrictions.",
        },
      ],
    },
  },
];
