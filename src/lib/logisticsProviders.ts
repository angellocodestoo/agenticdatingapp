import {
  getMockFreeBusy,
  getMockMaskedNumber,
  getVenueRecommendation,
  type FreeBusySlot,
  type VenueRecommendation,
} from "@/lib/integrations/mock";

export type ProviderName = "mock";

export type AvailabilityProvider = {
  name: ProviderName;
  getFreeBusy(): FreeBusySlot[];
};

export type VenueProvider = {
  name: ProviderName;
  recommend(sharedInterests: string[]): VenueRecommendation;
};

export type MaskedCallProvider = {
  name: ProviderName;
  getMaskedNumber(seed: string): string;
};

export const availabilityProvider: AvailabilityProvider = {
  name: "mock",
  getFreeBusy: getMockFreeBusy,
};

export const venueProvider: VenueProvider = {
  name: "mock",
  recommend: getVenueRecommendation,
};

export const maskedCallProvider: MaskedCallProvider = {
  name: "mock",
  getMaskedNumber: getMockMaskedNumber,
};

export function logisticsProviderNames() {
  return {
    availability: availabilityProvider.name,
    venue: venueProvider.name,
    maskedCall: maskedCallProvider.name,
  };
}
