import { Droplets, ExternalLink, Fuel, MapPin, Mountain, Route, TriangleAlert, UtensilsCrossed, BedDouble, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STOP_META, type Itinerary, type Stop, type StopKind } from "@/lib/itinerary";

const ICONS: Record<StopKind, typeof Fuel> = {
  LUNCH: UtensilsCrossed,
  FUEL: Fuel,
  WASHROOM: Droplets,
  OPTIONAL: Mountain,
  OVERNIGHT: BedDouble,
  ARRIVAL: Flag,
};

const DOT_CLASS: Record<StopKind, string> = {
  LUNCH: "bg-stop-food/12 text-stop-food ring-stop-food/25",
  FUEL: "bg-stop-fuel/12 text-stop-fuel ring-stop-fuel/25",
  WASHROOM: "bg-stop-washroom/12 text-stop-washroom ring-stop-washroom/25",
  OPTIONAL: "bg-stop-see/12 text-stop-see ring-stop-see/25",
  OVERNIGHT: "bg-stop-stay/12 text-stop-stay ring-stop-stay/25",
  ARRIVAL: "bg-stop-arrive/12 text-stop-arrive ring-stop-arrive/25",
};

function MapsLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      Open in Maps <ExternalLink className="size-3" />
    </a>
  );
}

function StopRow({ stop, last }: { stop: Stop; last: boolean }) {
  const Icon = ICONS[stop.kind];
  const meta = STOP_META[stop.kind];
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last ? (
        <span className="absolute left-[15px] top-9 bottom-0 w-px bg-border" aria-hidden />
      ) : null}
      <span
        className={cn(
          "relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-1",
          DOT_CLASS[stop.kind],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </p>
        <p className="font-medium leading-snug">{stop.name}</p>
        {stop.detail ? (
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{stop.detail}</p>
        ) : null}
        {stop.mapsUrl ? <MapsLink url={stop.mapsUrl} /> : null}
      </div>
    </li>
  );
}

export function ItineraryTimeline({
  itinerary,
  className,
}: {
  itinerary: Itinerary;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Route className="size-3.5" /> Trip
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold text-balance-tight">
              {itinerary.route ?? "Your route"}
            </h3>
            {itinerary.stats ? (
              <p className="mt-1 text-sm text-muted-foreground">{itinerary.stats}</p>
            ) : null}
          </div>
          {itinerary.mapsUrl ? (
            <a
              href={itinerary.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <MapPin className="size-3.5" /> Full route
            </a>
          ) : null}
        </div>

        {itinerary.traffic ? (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-traffic/30 bg-traffic/10 p-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-traffic" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-traffic">Traffic</p>
              <p className="mt-0.5 text-sm leading-relaxed">{itinerary.traffic}</p>
            </div>
          </div>
        ) : null}
      </div>

      {itinerary.days.map((day) => (
        <div key={day.index} className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-primary px-2.5 text-primary-foreground hover:bg-primary">
              Day {day.index}
            </Badge>
            {day.stats ? (
              <span className="text-xs text-muted-foreground">{day.stats}</span>
            ) : null}
          </div>
          {day.route ? (
            <p className="mb-4 font-display text-base font-semibold text-balance-tight">
              {day.route}
            </p>
          ) : null}
          {day.stops.length ? (
            <ol className="m-0 list-none p-0">
              {day.stops.map((stop, i) => (
                <StopRow
                  key={`${day.index}-${stop.kind}-${i}`}
                  stop={stop}
                  last={i === day.stops.length - 1}
                />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No stops listed for this day.</p>
          )}
        </div>
      ))}

      {itinerary.outro ? (
        <p className="px-1 text-sm text-muted-foreground">{itinerary.outro}</p>
      ) : null}
    </div>
  );
}
