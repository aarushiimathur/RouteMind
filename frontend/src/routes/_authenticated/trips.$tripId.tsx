import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/route-agent/AppShell";
import { ItineraryTimeline } from "@/components/route-agent/ItineraryTimeline";
import { Button } from "@/components/ui/button";
import { parseReply } from "@/lib/itinerary";
import { deleteTrip, getTrip } from "@/lib/trip-data";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip itinerary — Route Agent" },
      { name: "description", content: "A saved Route Agent itinerary with stops and map links." },
      { property: "og:title", content: "Trip itinerary — Route Agent" },
      {
        property: "og:description",
        content: "A saved Route Agent itinerary with stops and map links.",
      },
    ],
  }),
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = useParams({ from: "/_authenticated/trips/$tripId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
  });

  const parsed = useMemo(
    () => (trip?.itinerary_text ? parseReply(trip.itinerary_text) : null),
    [trip?.itinerary_text],
  );

  const remove = useMutation({
    mutationFn: () => deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip deleted");
      navigate({ to: "/trips", replace: true });
    },
    onError: () => toast.error("Couldn't delete that trip."),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link to="/trips">
            <ArrowLeft className="size-4" /> Saved trips
          </Link>
        </Button>

        {isLoading ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : !trip ? (
          <p className="text-sm text-muted-foreground">This trip could not be found.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-2xl font-semibold text-balance-tight">
                {trip.title}
              </h1>
              <div className="flex gap-2">
                {trip.conversation_id ? (
                  <Button asChild variant="secondary" size="sm" className="rounded-full">
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: trip.conversation_id }}
                    >
                      <MessageSquare className="size-4" /> Open chat
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>

            {parsed?.itinerary ? (
              <ItineraryTimeline itinerary={parsed.itinerary} />
            ) : (
              <div className="whitespace-pre-wrap rounded-2xl border bg-card p-4 text-sm leading-relaxed shadow-soft">
                {trip.itinerary_text}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
