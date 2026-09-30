import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/route-agent/AppShell";
import { createConversation, listConversations } from "@/lib/trip-data";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Plan a trip — Route Agent" },
      { name: "description", content: "Start a new AI-planned road trip with Route Agent." },
      { property: "og:title", content: "Plan a trip — Route Agent" },
      { property: "og:description", content: "Start a new AI-planned road trip with Route Agent." },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const started = useRef(false);
  const { data, isLoading } = useQuery({ queryKey: ["conversations"], queryFn: listConversations });

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    const existing = data?.[0];
    if (existing) {
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: existing.id },
        replace: true,
      });
      return;
    }
    createConversation()
      .then((conversation) =>
        navigate({
          to: "/chat/$conversationId",
          params: { conversationId: conversation.id },
          replace: true,
        }),
      )
      .catch(() => {
        started.current = false;
        toast.error("Couldn't start a new chat. Please try again.");
      });
  }, [data, isLoading, navigate]);

  return (
    <AppShell className="grid place-items-center">
      <Loader2 className="size-5 animate-spin text-primary" />
    </AppShell>
  );
}
