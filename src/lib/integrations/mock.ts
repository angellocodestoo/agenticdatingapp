import type { ConnectedSource } from "@/lib/types";

export type CalendarEvent = {
  title: string;
  dayOfWeek: string;
  time: string;
  isRecurring: boolean;
};

export type SpotifyData = {
  topArtists: string[];
  topGenres: string[];
  listeningMood: string;
};

export type LinkedInData = {
  role: string;
  company: string;
  industry: string;
  skills: string[];
  yearsExperience: number;
};

export type FreeBusySlot = {
  start: string;
  end: string;
  timezone: string;
};

export type VenueRecommendation = {
  name: string;
  neighborhood: string;
  type: string;
  why: string;
};

export type StravaData = {
  provider: string;
  weeklyActivities: number;
  topActivities: string[];
  usualTime: string;
  consistencyWeeks: number;
  longestRecent: string;
};

export type InstagramData = {
  postingCadence: string;
  topThemes: string[];
  taggedLocations: string[];
  socialPattern: string;
};

export type GoodreadsData = {
  booksThisYear: number;
  topGenres: string[];
  currentlyReading: string;
  readingPattern: string;
};

export type MapsData = {
  favoriteSpots: string[];
  homeNeighborhood: string;
  radiusKm: number;
  weekendPattern: string;
};

export type AiAssistantData = {
  provider: string;
  conversationThemes: string[];
  recurringQuestions: string[];
  personalContext: string[];
  toneProfile: string;
};

export type MockSourceData = {
  calendar?: CalendarEvent[];
  spotify?: SpotifyData;
  linkedin?: LinkedInData;
  strava?: StravaData;
  instagram?: InstagramData;
  goodreads?: GoodreadsData;
  maps?: MapsData;
  aiAssistant?: AiAssistantData;
};

const mockCalendarData: CalendarEvent[] = [
  { title: "7am gym session", dayOfWeek: "Mon/Wed/Fri", time: "07:00", isRecurring: true },
  { title: "Team standup", dayOfWeek: "Mon-Fri", time: "09:30", isRecurring: true },
  { title: "Weekly partner call", dayOfWeek: "Tuesday", time: "14:00", isRecurring: true },
  { title: "LP dinner", dayOfWeek: "Thursday", time: "19:30", isRecurring: false },
  { title: "Saturday farmers market", dayOfWeek: "Saturday", time: "10:00", isRecurring: true },
  { title: "Sunday trail run", dayOfWeek: "Sunday", time: "08:00", isRecurring: true },
];

const mockSpotifyData: SpotifyData = {
  topArtists: ["Khruangbin", "Nils Frahm", "Radiohead", "Anderson .Paak", "Tame Impala"],
  topGenres: ["indie", "neo-soul", "ambient", "jazz-fusion"],
  listeningMood: "focused & introspective with upbeat peaks",
};

const mockLinkedInData: LinkedInData = {
  role: "Managing Partner",
  company: "Meridian Ventures",
  industry: "Venture Capital",
  skills: ["deal sourcing", "portfolio operations", "strategic partnerships", "board advisory"],
  yearsExperience: 12,
};

const mockStravaData: StravaData = {
  provider: "Strava",
  weeklyActivities: 4,
  topActivities: ["running", "cycling", "trail running"],
  usualTime: "06:30",
  consistencyWeeks: 38,
  longestRecent: "Half marathon, Central Park loop",
};

const mockInstagramData: InstagramData = {
  postingCadence: "a few times a month",
  topThemes: ["travel", "food", "friends' dinners", "city skylines"],
  taggedLocations: ["Lisbon", "Big Sur", "West Village", "Montauk"],
  socialPattern: "small-group gatherings over big parties",
};

const mockGoodreadsData: GoodreadsData = {
  booksThisYear: 14,
  topGenres: ["literary fiction", "behavioral science", "memoir"],
  currentlyReading: "The Overstory",
  readingPattern: "finishes what they start — few abandoned books",
};

const mockMapsData: MapsData = {
  favoriteSpots: ["a corner café in the West Village", "Prospect Park loop", "small jazz bars", "the Whitney"],
  homeNeighborhood: "West Village",
  radiusKm: 6,
  weekendPattern: "explores a new neighborhood about twice a month",
};

const mockAiAssistantData: AiAssistantData = {
  provider: "Claude",
  conversationThemes: [
    "career strategy and difficult decisions",
    "sleep and stress management",
    "recipes and meal planning",
    "book recommendations",
    "how to be a better partner and friend",
  ],
  recurringQuestions: [
    "how to balance ambition with being present",
    "whether to take the bigger role or protect personal time",
    "improving deep sleep",
  ],
  personalContext: [
    "shared health goals and sleep data",
    "talked through a career crossroads over several weeks",
    "asks for advice on important relationships",
  ],
  toneProfile: "reflective and direct — asks hard questions and wants honest answers",
};

export function getMockSourceData(
  sources: ConnectedSource[],
  fitnessProvider?: string,
  aiProvider?: string
): MockSourceData {
  const result: MockSourceData = {};
  if (sources.includes("google_calendar")) result.calendar = mockCalendarData;
  if (sources.includes("spotify")) result.spotify = mockSpotifyData;
  if (sources.includes("linkedin")) result.linkedin = mockLinkedInData;
  if (sources.includes("strava")) {
    result.strava = { ...mockStravaData, provider: fitnessProvider ?? "Strava" };
  }
  if (sources.includes("instagram")) result.instagram = mockInstagramData;
  if (sources.includes("goodreads")) result.goodreads = mockGoodreadsData;
  if (sources.includes("google_maps")) result.maps = mockMapsData;
  if (sources.includes("ai_assistant")) {
    result.aiAssistant = { ...mockAiAssistantData, provider: aiProvider ?? "Claude" };
  }
  return result;
}

export function getMockFreeBusy(): FreeBusySlot[] {
  const now = new Date();
  const slots: FreeBusySlot[] = [];
  for (let daysAhead = 5; daysAhead <= 14; daysAhead++) {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    const dayNum = d.getDay();
    if (dayNum === 0 || dayNum === 6) {
      d.setHours(11, 0, 0, 0);
      const end = new Date(d);
      end.setHours(13, 0, 0, 0);
      slots.push({
        start: d.toISOString(),
        end: end.toISOString(),
        timezone: "America/New_York",
      });
    } else if (dayNum === 3 || dayNum === 4) {
      d.setHours(19, 0, 0, 0);
      const end = new Date(d);
      end.setHours(21, 0, 0, 0);
      slots.push({
        start: d.toISOString(),
        end: end.toISOString(),
        timezone: "America/New_York",
      });
    }
  }
  return slots;
}

export function getVenueRecommendation(sharedInterests: string[]): VenueRecommendation {
  const venueMap: Record<string, VenueRecommendation> = {
    "fine dining": {
      name: "Gramercy Tavern",
      neighborhood: "Flatiron",
      type: "restaurant",
      why: "Warm, unhurried atmosphere perfect for a first real conversation.",
    },
    tennis: {
      name: "Manhattan Pickleball Club",
      neighborhood: "Chelsea",
      type: "activity",
      why: "Light sport format that's naturally conversation-friendly.",
    },
    "modern art": {
      name: "MoMA + coffee nearby",
      neighborhood: "Midtown",
      type: "museum + café",
      why: "Shared context for deep conversation without the pressure of a pure dinner.",
    },
    hiking: {
      name: "Harriman State Park trail + brunch after",
      neighborhood: "Day trip",
      type: "outdoor activity",
      why: "Side-by-side activity research shows lowers first-date anxiety.",
    },
    jazz: {
      name: "Village Vanguard",
      neighborhood: "West Village",
      type: "live music",
      why: "Intimate venue — world-class music does half the work.",
    },
    running: {
      name: "Prospect Park run + brunch at Olmsted",
      neighborhood: "Brooklyn",
      type: "outdoor + restaurant",
      why: "Active shared interest followed by relaxed conversation.",
    },
    default: {
      name: "Le Crocodile",
      neighborhood: "Williamsburg",
      type: "restaurant",
      why: "Elegant but not stiff — great for a first substantive date.",
    },
  };

  for (const interest of sharedInterests) {
    const key = Object.keys(venueMap).find((k) =>
      interest.toLowerCase().includes(k)
    );
    if (key) return venueMap[key];
  }
  return venueMap.default;
}

export function getMockMaskedNumber(seed: string): string {
  const digits = seed
    .split("")
    .map((c) => c.charCodeAt(0) % 10)
    .slice(0, 7)
    .join("");
  return `+1 (212) ${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
}
