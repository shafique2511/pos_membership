import type { BusinessModule } from "@/types/business";

export const defaultModules: BusinessModule[] = [
  { key: "core", name: "Core Business System", description: "Business profile, customers, and daily operations.", enabled: true, core: true },
  { key: "bookings", name: "Booking Module", description: "Appointments, resources, and scheduling.", enabled: true, recommendedBusinessTypes: ["barber_shop", "salon", "spa", "clinic", "event_space"] },
  { key: "memberships", name: "Membership Module", description: "Plans, member status, renewals, and usage.", enabled: true, recommendedBusinessTypes: ["barber_shop", "coffee_shop", "salon", "spa"] },
  { key: "loyalty", name: "Loyalty & Rewards Module", description: "Points, rewards, and redemptions.", enabled: true, recommendedBusinessTypes: ["barber_shop", "coffee_shop", "salon", "spa"] },
  { key: "pos", name: "POS Module", description: "Product, service, and membership checkout.", enabled: true, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "salon", "spa"] },
  { key: "inventory", name: "Inventory Module", description: "Products, suppliers, stock, and alerts.", enabled: true, recommendedBusinessTypes: ["coffee_shop", "salon", "spa"] },
  { key: "staff", name: "Staff Module", description: "Team profiles, schedules, and assignments.", enabled: true, recommendedBusinessTypes: ["barber_shop", "salon", "spa", "clinic", "event_space"] },
  { key: "staff_commission", name: "Staff Commission Module", description: "Commission tracking and payouts.", enabled: false, recommendedBusinessTypes: ["barber_shop", "salon", "spa"] },
  { key: "payments", name: "Payment Module", description: "Manual payment records, invoices, and receipts.", enabled: true, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "salon", "spa", "clinic", "event_space"] },
  { key: "notifications", name: "Notification Module", description: "In-app, email, WhatsApp, and Telegram templates.", enabled: false, recommendedBusinessTypes: ["clinic", "barber_shop", "salon", "spa"] },
  { key: "reports", name: "Reports Module", description: "Operational reports and charts.", enabled: true, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "salon", "spa", "clinic", "event_space"] },
  { key: "marketing", name: "Marketing Module", description: "Promos, segments, and campaigns.", enabled: false, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "salon", "spa"] },
  { key: "branches", name: "Multi-Branch Module", description: "Branch-level operations and reporting.", enabled: false, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "clinic"] },
  { key: "customer_portal", name: "Customer Portal Module", description: "Mobile-first member portal.", enabled: true, recommendedBusinessTypes: ["coffee_shop", "barber_shop", "salon", "spa", "clinic", "event_space"] },
  { key: "settings", name: "Settings Module", description: "Business configuration and security.", enabled: true, core: true },
  { key: "data_backup", name: "Data Backup & Export Module", description: "Owner-only business backup, module export, report export, and restore preparation.", enabled: true, core: true },
];
