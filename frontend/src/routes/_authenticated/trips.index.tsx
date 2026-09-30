import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, MapPinned, Route as RouteIcon } from "lucide-react";

import { AppShell } from "@/components/route-agent/AppShell";
import { Button } from "@/components/ui/button";
import { listTrips } from "@/lib/trip-data";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "Saved trips — Route Agent" },
      { name: "description", content: "Every road trip itinerary you've saved with Route Agent." },
      { property: "og:title", content: "Saved trips — Route Agent" },
      {
        property: "og:description",
        content: "Every road trip itinerary you've saved with Route Agent.",
      },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["trips"], queryFn: listTrips });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="font-display text-2xl font-semibold">Saved trips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Itineraries you've kept, with all their stops and map links.
        </p>

        {isLoading ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-soft">
            <MapPinned className="mx-auto size-6 text-primary" />
            <p className="mt-3 font-display text-lg font-semibold">No saved trips yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Plan a route in chat, then tap Save trip on the itinerary to keep it here.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/chat">Plan a trip</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2">
            {(data ?? []).map((trip) => (
              <li key={trip.id}>
                <Link
                  to="/trips/$tripId"
                  params={{ tripId: trip.id }}
                  className="block rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:border-primary/40"
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <RouteIcon className="size-3.5" /> Itinerary
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-balance-tight">
                    {trip.title}
                  </h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {trip.distance_km ? <span>{Math.round(trip.distance_km)} km</span> : null}
                    {trip.duration_text ? <span>{trip.duration_text}</span> : null}
                    {trip.days ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> {trip.days} days
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
