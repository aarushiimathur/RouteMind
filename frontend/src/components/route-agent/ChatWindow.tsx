import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, Loader2, SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ItineraryTimeline } from "@/components/route-agent/ItineraryTimeline";
import { Logo } from "@/components/route-agent/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseReply, type Itinerary } from "@/lib/itinerary";
import { RouteAgentError, sendChat } from "@/lib/route-agent-api";
import {
  addMessage,
  listMessages,
  renameConversation,
  saveTrip,
  type MessageRow,
} from "@/lib/trip-data";

const SUGGESTIONS = [
  "Plan a 3-day road trip from Bengaluru to Goa",
  "Delhi to Jaipur this weekend, 2 people, relaxed pace",
  "Mumbai to Udaipur in 2 days with good food stops",
];

function Thinking() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
      <Loader2 className="size-4 animate-spin text-primary" />
      Mapping your route, checking traffic and finding stops…
    </div>
  );
}

function SaveTripButton({
  conversationId,
  itinerary,
  itineraryText,
}: {
  conversationId: string;
  itinerary: Itinerary;
  itineraryText: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => saveTrip({ conversationId, itinerary, itineraryText }),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip saved");
      navigate({ to: "/trips/$tripId", params: { tripId: trip.id } });
    },
    onError: () => toast.error("Couldn't save this trip. Please try again."),
  });

  return (
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <BookmarkPlus className="size-4" />
      )}
      Save trip
    </Button>
  );
}

function AssistantMessage({
  content,
  conversationId,
}: {
  content: string;
  conversationId: string;
}) {
  const parsed = useMemo(() => parseReply(content), [content]);

  if (!parsed.itinerary) {
    return (
      <div className="max-w-[46rem] whitespace-pre-wrap rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm leading-relaxed shadow-soft">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[46rem] space-y-3">
      {parsed.text ? (
        <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm leading-relaxed shadow-soft">
          {parsed.text}
        </div>
      ) : null}
      <ItineraryTimeline itinerary={parsed.itinerary} />
      <SaveTripButton
        conversationId={conversationId}
        itinerary={parsed.itinerary}
        itineraryText={content}
      />
    </div>
  );
}

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(conversationId),
  });

  const messages = messagesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      await addMessage({ conversationId, role: "user", content: text });
      if (messages.length === 0) {
        await renameConversation(conversationId, text.slice(0, 60));
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      const response = await sendChat({ message: text, conversationId });
      await addMessage({ conversationId, role: "assistant", content: response.reply });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof RouteAgentError
          ? error.message
          : "Something went wrong sending your message.",
      );
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId, mutation.isPending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, mutation.isPending]);

  function submit() {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setInput("");
    mutation.mutate(text);
  }

  const pendingUserMessage = mutation.isPending ? (mutation.variables as string) : null;
  const showEmptyState = !messagesQuery.isLoading && messages.length === 0 && !pendingUserMessage;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {showEmptyState ? (
            <div className="mt-6 text-center">
              <Logo showWordmark={false} className="mb-3" />
              <h2 className="font-display text-2xl font-semibold text-balance-tight">
                Where are we driving?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Tell me your start, destination, dates and pace. I'll build a day-by-day plan with
                real stops, live traffic and map links.
              </p>
              <div className="mx-auto mt-5 flex max-w-md flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border bg-card px-4 py-2.5 text-left text-sm shadow-soft transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message: MessageRow) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <AssistantMessage content={message.content} conversationId={conversationId} />
              </div>
            ),
          )}

          {pendingUserMessage && !messages.some((m) => m.content === pendingUserMessage) ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground opacity-80">
                {pendingUserMessage}
              </div>
            </div>
          ) : null}

          {mutation.isPending ? (
            <div className="flex justify-start">
              <Thinking />
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Bengaluru to Goa, 3 days, relaxed pace…"
            className="max-h-40 min-h-11 resize-none rounded-2xl bg-card"
          />
          <Button
            size="icon"
            className="size-11 shrink-0 rounded-2xl"
            onClick={submit}
            disabled={!input.trim() || mutation.isPending}
            aria-label="Send message"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
