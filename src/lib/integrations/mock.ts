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

export type MockSourceData = {
  calendar?: CalendarEvent[];
  spotify?: SpotifyData;
  linkedin?: LinkedInData;
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

export function getMockSourceData(sources: ConnectedSource[]): MockSourceData {
  const result: MockSourceData = {};
  if (sources.includes("google_calendar")) result.calendar = mockCalendarData;
  if (sources.includes("spotify")) result.spotify = mockSpotifyData;
  if (sources.includes("linkedin")) result.linkedin = mockLinkedInData;
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
