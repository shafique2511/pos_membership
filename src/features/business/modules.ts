import type { BusinessModule } from "@/types/business";

export const defaultModules: BusinessModule[] = [
  { key: "core", name: "Core Business System", description: "Business profile, customers, and daily operations.", enabled: true, core: true },
  { key: "bookings", name: "Booking Module", description: "Appointments, resources, and scheduling.", enabled: true },
  { key: "memberships", name: "Membership Module", description: "Plans, member status, renewals, and usage.", enabled: true },
  { key: "loyalty", name: "Loyalty & Rewards Module", description: "Points, rewards, and redemptions.", enabled: true },
  { key: "pos", name: "POS Module", description: "Product, service, and membership checkout.", enabled: true },
  { key: "inventory", name: "Inventory Module", description: "Products, suppliers, stock, and alerts.", enabled: true },
  { key: "staff", name: "Staff Module", description: "Team profiles, schedules, and assignments.", enabled: true },
  { key: "staff_commission", name: "Staff Commission Module", description: "Commission tracking and payouts.", enabled: false },
  { key: "payments", name: "Payment Module", description: "Manual payment records, invoices, and receipts.", enabled: true },
  { key: "notifications", name: "Notification Module", description: "In-app, email, WhatsApp, and Telegram templates.", enabled: false },
  { key: "reports", name: "Reports Module", description: "Operational reports and charts.", enabled: true },
  { key: "marketing", name: "Marketing Module", description: "Promos, segments, and campaigns.", enabled: false },
  { key: "branches", name: "Multi-Branch Module", description: "Branch-level operations and reporting.", enabled: false },
  { key: "customer_portal", name: "Customer Portal Module", description: "Mobile-first member portal.", enabled: true },
  { key: "settings", name: "Settings Module", description: "Business configuration and security.", enabled: true, core: true },
  { key: "data_backup", name: "Data Backup & Export Module", description: "Owner-only business backup, module export, report export, and restore preparation.", enabled: true, core: true },
];
