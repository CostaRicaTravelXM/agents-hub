/**
 * Course catalog for the local demo seed: the real masterclasses from
 * masterclasses.mts, with short generated videos in place of the real recordings
 * (those go up with import-masterclasses.mts). Plus one partner-only and one draft
 * masterclass, so group access and drafts can be checked locally.
 */
import { CATEGORY, masterclasses, type MasterclassQuestion } from "./masterclasses.mts";

export type SeedLesson = {
  title: string;
  summary?: string;
  type: "video" | "pdf" | "document" | "link" | "reading" | "quiz";
  video?: string; // key of a generated video
  poster?: string;
  pdf?: string; // key of a generated PDF
  url?: string;
  minutes?: number;
  /** Rich text for reading lessons (TipTap JSON). */
  body?: Record<string, unknown>;
  required?: boolean;
  requiredPct?: number;
  quiz?: { passing: number; attempts: number | null; questions: MasterclassQuestion[] };
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

export const categories = [{ slug: CATEGORY.slug, name: CATEGORY.name, description: CATEGORY.description, is_destination: false }];

export const photoForVideo: Record<string, string> = {
  "videos/demo/arenal.mp4": "public/photos/fortuna-lago-arenal-volcan.jpg",
  "videos/demo/monteverde.mp4": "public/photos/monteverde-bosque-nuboso-neblina.jpg",
  "videos/demo/manuel-antonio.mp4": "public/photos/manuel-antonio-playa-palmeras.jpg",
  "videos/demo/tortuguero.mp4": "public/photos/tortuguero-canales-palmeras-aereo.jpg",
  "videos/demo/rio-celeste.mp4": "public/photos/fortuna-catarata-rio-celeste.jpg",
};
const demoVideos = Object.keys(photoForVideo);
const covers = [
  "/photos/manuel-antonio-punta-catedral-aerea.jpg",
  "/photos/fortuna-lago-arenal-volcan.jpg",
  "/photos/monteverde-puente-colgante-canopy.jpg",
  "/photos/guanacaste-playa-hermosa-atardecer.jpg",
  "/photos/uvita-ballena-jorobada-marino-ballena.jpg",
  "/photos/tortuguero-canales-palmeras-aereo.jpg",
  "/photos/fortuna-catarata-rio-celeste.jpg",
  "/photos/monteverde-bosque-nuboso-neblina.jpg",
  "/photos/manuel-antonio-playa-palmeras.jpg",
];

function masterclassCourse(opts: {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  lessonSummary: string;
  quiz: { passing: number; questions: MasterclassQuestion[] };
  index: number;
}): SeedCourse {
  const cover = covers[opts.index % covers.length];
  return {
    slug: opts.slug,
    title: opts.title,
    subtitle: opts.subtitle,
    description: opts.description,
    category: CATEGORY.slug,
    level: "foundation",
    cover,
    minutes: 6,
    modules: [
      {
        title: "Master class",
        description: "",
        lessons: [
          { title: opts.title, type: "video", video: demoVideos[opts.index % demoVideos.length], poster: cover, summary: opts.lessonSummary },
          {
            title: "Quiz",
            type: "quiz",
            summary: `${opts.quiz.questions.length} questions. Score ${opts.quiz.passing}% or more to get your certificate.`,
            quiz: { passing: opts.quiz.passing, attempts: null, questions: opts.quiz.questions },
          },
        ],
      },
    ],
  };
}

export const courses: SeedCourse[] = [
  ...masterclasses.map((m, index) => ({ ...masterclassCourse({ ...m, index }), featured: index === 0 })),
  {
    ...masterclassCourse({
      slug: "partner-briefing-2027",
      title: "Partner Briefing 2027",
      subtitle: "For partner agencies only",
      description: "Group rates, room blocks and run-of-show for groups of 20 to 200. For agencies in the 2027 partner program.",
      lessonSummary: "How a TravelXM incentive is built, from the site inspection to the farewell dinner.",
      quiz: {
        passing: 100,
        questions: [
          { prompt: "How many hotels for a group of 80?", type: "single", options: ["One", "Two", "Three"], correct: [0], explanation: "Keep to one hotel for groups over 60." },
          { prompt: "How many private group moments per day?", type: "single", options: ["One", "Three", "As many as possible"], correct: [0], explanation: "One per day keeps the program relaxed." },
        ],
      },
      index: 3,
    }),
    visibility: "groups",
    resources: [{ title: "2027 partner rate sheet", description: "Group rates, blackout dates and room-block rules.", pdf: "documents/demo/partner-rate-sheet.pdf" }],
  },
  {
    ...masterclassCourse({
      slug: "caribbean-coast",
      title: "The Caribbean Coast",
      subtitle: "Coming soon",
      description: "Tortuguero, Cahuita and Puerto Viejo. Still being recorded.",
      lessonSummary: "Canals, reefs and the Afro-Caribbean coast.",
      quiz: { passing: 80, questions: [{ prompt: "Tortuguero is reached by boat or light aircraft.", type: "true_false", options: ["True", "False"], correct: [0], explanation: "There is no road into Tortuguero village." }] },
      index: 5,
    }),
    status: "draft",
  },
];

/** Course resources every agent can open, attached to the first masterclass. */
export const sharedResources = [
  { title: "TravelXM advisor handbook", description: "Contacts, booking terms and emergency procedures.", pdf: "documents/demo/advisor-handbook.pdf" },
];
courses[0].resources = sharedResources;
