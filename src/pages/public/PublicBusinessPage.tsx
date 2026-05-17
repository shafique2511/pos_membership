import { useEffect, useState } from "react";
import { CalendarDays, IdCard, MapPin, Phone, UserPlus } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { getPublicBusinessPage, type PublicBusinessPageContext } from "@/features/portal/customer-portal-service";
import { useToast } from "@/components/ui/toast";

export function PublicBusinessPage() {
  const { businessSlug } = useParams();
  const { toast } = useToast();
  const [context, setContext] = useState<PublicBusinessPageContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPublicPage();
  }, [businessSlug]);

  async function loadPublicPage() {
    if (!businessSlug) return;
    try {
      setLoading(true);
      setContext(await getPublicBusinessPage(businessSlug));
    } catch (error) {
      toast({ title: "Public page failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState title="Loading public business page" />;
  if (!context) return <EmptyState title="Business not found" description="This public page is not available." />;

  const bookingEnabled = context.modules.includes("bookings");
  const membershipEnabled = context.modules.includes("memberships");

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-card px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary">Luxantara Members</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{context.business.name}</h1>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {context.business.address ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{context.business.address}</p> : null}
            {context.business.phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{context.business.phone}</p> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {bookingEnabled ? <Button type="button" onClick={() => { window.location.href = `/public/${context.business.slug}/book`; }}><CalendarDays className="h-4 w-4" />Book now</Button> : null}
            <Button type="button" variant="outline" onClick={() => { window.location.href = "/portal/register"; }}><UserPlus className="h-4 w-4" />Customer register</Button>
            <Button type="button" variant="ghost" onClick={() => { window.location.href = "/portal/login"; }}>Customer login</Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-4 px-4 py-6">
        {bookingEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Services, tables, rooms, and resources</CardTitle>
              <CardDescription>Public booking options configured by the business.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {context.services.concat(context.resources).length === 0 ? (
                <EmptyState title="No public options yet" description="Booking options will appear here when configured." />
              ) : context.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{service.label}</p>
                    <p className="text-sm text-muted-foreground">{service.durationMinutes ?? 30} minutes</p>
                  </div>
                  <Badge variant="secondary">{Number(service.price ?? 0).toFixed(2)}</Badge>
                </div>
              ))}
              {context.resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <p className="font-medium">{resource.label}</p>
                  <Badge variant="secondary">{resource.type ?? "resource"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {membershipEnabled ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 pt-5">
              <div>
                <p className="font-medium">Member portal</p>
                <p className="mt-1 text-sm text-muted-foreground">Customers can view memberships, rewards, payments, receipts, and profile data.</p>
              </div>
              <IdCard className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
