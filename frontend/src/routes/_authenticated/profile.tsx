import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/route-agent/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProfile, updateProfile } from "@/lib/trip-data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Route Agent" },
      { name: "description", content: "Set your home city and preferred driving pace." },
      { property: "og:title", content: "Your profile — Route Agent" },
      { property: "og:description", content: "Set your home city and preferred driving pace." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [fullName, setFullName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [pace, setPace] = useState("balanced");
  const [maxDailyKm, setMaxDailyKm] = useState("450");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setHomeCity(profile.home_city ?? "");
    setPace(profile.preferred_pace ?? "balanced");
    setMaxDailyKm(String(profile.max_daily_km ?? 450));
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        full_name: fullName.trim() || null,
        home_city: homeCity.trim() || null,
        preferred_pace: pace,
        max_daily_km: Number(maxDailyKm) || 450,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: () => toast.error("Couldn't save your profile."),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <h1 className="font-display text-2xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These details help you describe trips faster in chat.
        </p>

        {isLoading ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="home-city">Home city</Label>
              <Input
                id="home-city"
                value={homeCity}
                onChange={(event) => setHomeCity(event.target.value)}
                placeholder="Bengaluru"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred pace</Label>
              <Select value={pace} onValueChange={setPace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-km">Comfortable driving per day (km)</Label>
              <Input
                id="max-km"
                type="number"
                min={100}
                max={1200}
                value={maxDailyKm}
                onChange={(event) => setMaxDailyKm(event.target.value)}
              />
            </div>
            <Button
              className="w-full rounded-full"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
