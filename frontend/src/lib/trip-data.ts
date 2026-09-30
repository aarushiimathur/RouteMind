import { supabase } from "@/integrations/supabase/client";
import { summarise, type Itinerary } from "@/lib/itinerary";

export interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface TripRow {
  id: string;
  conversation_id: string | null;
  title: string;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  duration_text: string | null;
  days: number | null;
  maps_url: string | null;
  itinerary_text: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  home_city: string | null;
  preferred_pace: string;
  max_daily_km: number;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

export async function listConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function createConversation(title = "New trip") {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ConversationRow | null) ?? null;
}

export async function renameConversation(id: string, title: string) {
  const { error } = await supabase.from("conversations").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function listMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function addMessage(params: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      user_id: userId,
      role: params.role,
      content: params.content,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);
  return data as MessageRow;
}

export async function listTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, conversation_id, title, origin, destination, distance_km, duration_text, days, maps_url, itinerary_text, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TripRow[];
}

export async function getTrip(id: string) {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, conversation_id, title, origin, destination, distance_km, duration_text, days, maps_url, itinerary_text, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as TripRow | null) ?? null;
}

export async function saveTrip(params: {
  conversationId: string;
  itinerary: Itinerary;
  itineraryText: string;
}) {
  const userId = await requireUserId();
  const summary = summarise(params.itinerary);
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      conversation_id: params.conversationId,
      title: summary.title,
      origin: summary.origin,
      destination: summary.destination,
      distance_km: summary.distanceKm,
      duration_text: summary.durationText,
      days: summary.days,
      maps_url: summary.mapsUrl,
      itinerary_text: params.itineraryText,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

export async function getProfile() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, home_city, preferred_pace, max_daily_km")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function updateProfile(patch: {
  full_name?: string | null;
  home_city?: string | null;
  preferred_pace?: string;
  max_daily_km?: number;
}) {
  const userId = await requireUserId();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
