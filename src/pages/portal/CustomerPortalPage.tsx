import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, Gift, IdCard, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useBusiness } from "@/features/business/business-context";
import { useAuth } from "@/features/auth/auth-context";
import { getLinkedCustomer, getCustomerPointBalance, listCustomerBookings, listCustomerMemberships, listCustomerPaymentsAndReceipts, type CustomerProfileRecord } from "@/features/portal/customer-portal-service";
import { useToast } from "@/components/ui/toast";

export function CustomerPortalPage() {
  const auth = useAuth();
  const { getBusinessLabel } = useBusiness();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerProfileRecord | null>(null);
  const [stats, setStats] = useState({ upcomingBookings: 0, activeMemberships: 0, points: 0, payments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPortal();
  }, [auth.business?.id, auth.user?.id]);

  async function loadPortal() {
    if (!auth.business?.id || !auth.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const linkedCustomer = await getLinkedCustomer(auth.business.id, auth.user.id);
      setCustomer(linkedCustomer);
      if (!linkedCustomer) return;

      const [bookings, memberships, points, paymentData] = await Promise.all([
        listCustomerBookings(auth.business.id, linkedCustomer.id),
        listCustomerMemberships(auth.business.id, linkedCustomer.id),
        getCustomerPointBalance(auth.business.id, linkedCustomer.id),
        listCustomerPaymentsAndReceipts(auth.business.id, linkedCustomer.id),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      setStats({
        upcomingBookings: bookings.filter((booking) => booking.booking_date >= today && !["cancelled", "completed", "no_show"].includes(booking.status)).length,
        activeMemberships: memberships.filter((membership) => membership.status === "active").length,
        points,
        payments: paymentData.payments.length,
      });
    } catch (error) {
      toast({ title: "Portal failed to load", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState title="Loading customer portal" />;

  if (!customer) {
    return (
      <EmptyState
        title="Customer record not linked"
        description="Ask the business owner to link this login to your customer profile before using the portal."
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{customer.full_name}</CardTitle>
              <CardDescription>Bookings, membership, rewards, payments, receipts, and profile data.</CardDescription>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Metric icon={CalendarDays} label={getBusinessLabel("booking")} value={`${stats.upcomingBookings} upcoming`} to="/portal/bookings" />
          <Metric icon={IdCard} label="Membership" value={`${stats.activeMemberships} active`} to="/portal/membership" />
          <Metric icon={Gift} label="Rewards" value={`${stats.points} points`} to="/portal/rewards" />
          <Metric icon={CreditCard} label="Payments" value={`${stats.payments} records`} to="/portal/payments" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <div>
            <p className="font-medium">Member card</p>
            <p className="mt-1 text-sm text-muted-foreground">Show this at the counter for member lookup.</p>
          </div>
          <div className="text-center">
            <QrCode className="mx-auto h-14 w-14 text-primary" />
            <p className="mt-2 max-w-32 truncate font-mono text-xs">{customer.customer_code ?? customer.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, to }: { icon: typeof CalendarDays; label: string; value: string; to: string }) {
  return (
    <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/50" to={to}>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </Link>
  );
}
