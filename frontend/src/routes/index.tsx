import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Fuel,
  MapPinned,
  Route as RouteIcon,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/route-agent/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Route Agent — AI road trip planner for India" },
      {
        name: "description",
        content:
          "Plan Indian road trips with an AI co-pilot: day-by-day routes, real food, fuel and overnight stops, live traffic and map links.",
      },
      {
        property: "og:title",
        content: "Route Agent — AI road trip planner for India",
      },
      {
        property: "og:description",
        content:
          "Tell Route Agent where you're driving. Get a day-by-day plan with real stops, live traffic and map links.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: RouteIcon,
    title: "Day-by-day routes",
    body: "Real driving distances and times split into sensible days.",
  },
  {
    icon: UtensilsCrossed,
    title: "Stops that exist",
    body: "Food, washroom and sightseeing stops pulled from live place data.",
  },
  {
    icon: Fuel,
    title: "Fuel planning",
    body: "Refuel points placed along the actual road, not guessed.",
  },
  {
    icon: TriangleAlert,
    title: "Live traffic",
    body: "Current conditions on your route before you leave.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        navigate({ to: "/chat", replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: "/chat", replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function signIn() {
    setBusy(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("Google sign-in error:", error);
      setBusy(false);
      toast.error(error.message || "Google sign-in failed.");
    }
  }

  return (
    <div className="min-h-screen bg-road-grid">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Logo />

        <Button variant="ghost" size="sm" onClick={signIn} disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-16">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-soft">
            <MapPinned className="size-3.5 text-primary" />
            Built for Indian highways
          </p>

          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-balance-tight sm:text-6xl">
            Your road trip, planned stop by stop.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tell Route Agent where you're driving and when. It builds a
            day-by-day itinerary with real food, fuel, washroom and overnight
            stops, checks traffic and hands you map links for every single one.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="rounded-full px-6"
              onClick={signIn}
              disabled={busy}
            >
              {busy ? "Signing in..." : "Continue with Google"}
            </Button>

            <span className="text-xs text-muted-foreground">
              Your trips and chats stay private to your account.
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5 shadow-soft">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 font-display text-base font-semibold">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}