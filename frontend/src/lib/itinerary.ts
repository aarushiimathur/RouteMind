/**
 * Parses the plain-text itinerary produced by the Route Agent backend
 * (TRIP / DAY / LUNCH / FUEL / WASHROOM / OPTIONAL / OVERNIGHT / ARRIVAL /
 * TRAFFIC sections) into a structure the UI can render as a timeline.
 *
 * This never invents data: anything it cannot classify is kept as prose.
 */

export type StopKind = "LUNCH" | "FUEL" | "WASHROOM" | "OPTIONAL" | "OVERNIGHT" | "ARRIVAL";

export const STOP_KINDS: StopKind[] = [
  "LUNCH",
  "FUEL",
  "WASHROOM",
  "OPTIONAL",
  "OVERNIGHT",
  "ARRIVAL",
];

export interface Stop {
  kind: StopKind;
  name: string;
  detail?: string;
  mapsUrl?: string;
}

export interface Day {
  index: number;
  route?: string;
  stats?: string;
  stops: Stop[];
}

export interface Itinerary {
  route?: string;
  stats?: string;
  mapsUrl?: string;
  days: Day[];
  traffic?: string;
  outro?: string;
}

export interface ParsedReply {
  itinerary: Itinerary | null;
  /** Conversational text shown as a normal chat bubble. */
  text: string;
}

const LINK_PREFIX = "LINK:";

function isStopHeader(line: string): StopKind | null {
  const upper = line.trim().toUpperCase();
  return (STOP_KINDS as string[]).includes(upper) ? (upper as StopKind) : null;
}

function dayNumber(line: string): number | null {
  const match = /^DAY\s+(\d+)\s*$/i.exec(line.trim());
  return match ? Number(match[1]) : null;
}

export function parseReply(reply: string): ParsedReply {
  const raw = (reply ?? "").replace(/\r/g, "");
  if (!/^\s*TRIP\s*$/m.test(raw)) {
    return { itinerary: null, text: raw.trim() };
  }

  const lines = raw.split("\n");
  const itinerary: Itinerary = { days: [] };
  const preamble: string[] = [];
  const outro: string[] = [];

  type Section = "pre" | "trip" | "day" | "stop" | "traffic" | "post";
  let section: Section = "pre";
  let day: Day | null = null;
  let stop: Stop | null = null;
  const trafficLines: string[] = [];

  const closeStop = () => {
    if (stop && day) day.stops.push(stop);
    stop = null;
  };
  const closeDay = () => {
    closeStop();
    if (day) itinerary.days.push(day);
    day = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const upper = line.toUpperCase();

    if (upper === "TRIP") {
      closeDay();
      section = "trip";
      continue;
    }

    const dn = dayNumber(line);
    if (dn !== null) {
      closeDay();
      day = { index: dn, stops: [] };
      section = "day";
      continue;
    }

    if (upper === "TRAFFIC") {
      closeStop();
      section = "traffic";
      continue;
    }

    const stopKind = isStopHeader(line);
    if (stopKind && day) {
      closeStop();
      stop = { kind: stopKind, name: "" };
      section = "stop";
      continue;
    }

    if (!line) {
      if (section === "traffic" && trafficLines.length) section = "post";
      continue;
    }

    if (line.toUpperCase().startsWith(LINK_PREFIX)) {
      const url = line.slice(LINK_PREFIX.length).trim();
      if (section === "stop" && stop) stop.mapsUrl = url;
      else if (!itinerary.mapsUrl) itinerary.mapsUrl = url;
      continue;
    }

    switch (section) {
      case "pre":
        preamble.push(line);
        break;
      case "trip":
        if (!itinerary.route) itinerary.route = line;
        else if (!itinerary.stats) itinerary.stats = line;
        else outro.push(line);
        break;
      case "day":
        if (day && !day.route) day.route = line;
        else if (day && !day.stats) day.stats = line;
        break;
      case "stop":
        if (stop && !stop.name) stop.name = line;
        else if (stop) stop.detail = [stop.detail, line].filter(Boolean).join(" ");
        break;
      case "traffic":
        trafficLines.push(line);
        break;
      default:
        outro.push(line);
    }
  }

  closeDay();

  if (trafficLines.length) itinerary.traffic = trafficLines.join(" ");
  if (outro.length) itinerary.outro = outro.join(" ");

  return { itinerary, text: preamble.join("\n").trim() };
}

export const STOP_META: Record<StopKind, { label: string; token: string }> = {
  LUNCH: { label: "Food stop", token: "stop-food" },
  FUEL: { label: "Fuel", token: "stop-fuel" },
  WASHROOM: { label: "Washroom", token: "stop-washroom" },
  OPTIONAL: { label: "Sightseeing", token: "stop-see" },
  OVERNIGHT: { label: "Overnight", token: "stop-stay" },
  ARRIVAL: { label: "Arrival", token: "stop-arrive" },
};

export interface TripSummary {
  title: string;
  origin: string | null;
  destination: string | null;
  distanceKm: number | null;
  durationText: string | null;
  days: number | null;
  mapsUrl: string | null;
}

/** Derives saved-trip fields from a parsed itinerary. Returns only what is present. */
export function summarise(itinerary: Itinerary): TripSummary {
  const route = itinerary.route ?? "";
  const [originRaw, destinationRaw] = route.split(/→|->/).map((part) => part.trim());
  const stats = itinerary.stats ?? "";
  const distance = /([\d,.]+)\s*km/i.exec(stats);
  const duration = /km\s*[•·|]\s*([^•·|]+)/i.exec(stats);
  const days = /(\d+)\s*days?/i.exec(stats);

  return {
    title: route || "Saved trip",
    origin: originRaw || null,
    destination: destinationRaw || null,
    distanceKm: distance?.[1] ? Number(distance[1].replace(/,/g, "")) : null,
    durationText: duration?.[1]?.trim() ?? null,
    days: days?.[1] ? Number(days[1]) : itinerary.days.length || null,
    mapsUrl: itinerary.mapsUrl ?? null,
  };
}
