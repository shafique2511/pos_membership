import type { BusinessTypeKey } from "@/types/business";

export const businessTypeLabels: Record<BusinessTypeKey, string> = {
  barber_shop: "Barber Shop",
  coffee_shop: "Coffee Shop",
  salon: "Salon",
  spa: "Spa",
  clinic: "Clinic",
  event_space: "Event Space",
  custom_business: "Custom Business",
};

export const businessTypeVocabulary: Record<BusinessTypeKey, Record<string, string>> = {
  barber_shop: {
    customer: "Client",
    booking: "Appointment",
    service: "Service",
  },
  coffee_shop: {
    customer: "Guest",
    booking: "Table Booking",
    service: "Menu Item",
  },
  salon: {
    customer: "Client",
    booking: "Appointment",
    service: "Treatment",
  },
  spa: {
    customer: "Guest",
    booking: "Treatment Booking",
    service: "Treatment",
  },
  clinic: {
    customer: "Patient",
    booking: "Appointment",
    service: "Consultation",
  },
  event_space: {
    customer: "Client",
    booking: "Event Booking",
    service: "Space",
  },
  custom_business: {
    customer: "Customer",
    booking: "Booking",
    service: "Service",
  },
};

export const presetSupportedBusinessTypes: BusinessTypeKey[] = [
  "barber_shop",
  "coffee_shop",
  "clinic",
  "custom_business",
];
