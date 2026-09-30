import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/route-agent/AppShell";
import { ChatWindow } from "@/components/route-agent/ChatWindow";
import { Button } from "@/components/ui/button";
import { createConversation, deleteConversation, listConversations } from "@/lib/trip-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  head: () => ({
    meta: [
      { title: "Trip chat — Route Agent" },
      { name: "description", content: "Chat with Route Agent to shape your road trip itinerary." },
      { property: "og:title", content: "Trip chat — Route Agent" },
      {
        property: "og:description",
        content: "Chat with Route Agent to shape your road trip itinerary.",
      },
    ],
  }),
  component: ChatPage,
});

function ConversationList({ activeId }: { activeId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["conversations"], queryFn: listConversations });

  const create = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
    },
    onError: () => toast.error("Couldn't start a new chat."),
  });

  const remove = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (id === activeId) navigate({ to: "/chat", replace: true });
    },
    onError: () => toast.error("Couldn't delete that chat."),
  });

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-card/40 lg:flex lg:flex-col">
      <div className="p-3">
        <Button
          className="w-full rounded-xl"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus className="size-4" /> New trip chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {(data ?? []).map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg px-2 transition-colors hover:bg-secondary",
              conversation.id === activeId && "bg-secondary",
            )}
          >
            <Link
              to="/chat/$conversationId"
              params={{ conversationId: conversation.id }}
              className="min-w-0 flex-1 truncate py-2.5 text-sm"
            >
              {conversation.title}
            </Link>
            <button
              type="button"
              aria-label="Delete chat"
              onClick={() => remove.mutate(conversation.id)}
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ChatPage() {
  const { conversationId } = useParams({ from: "/_authenticated/chat/$conversationId" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
    },
  });

  return (
    <AppShell className="flex min-h-0">
      <div className="mx-auto flex h-[calc(100vh-7.5rem)] w-full max-w-6xl sm:h-[calc(100vh-3.5rem)]">
        <ConversationList activeId={conversationId} />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2 lg:hidden">
            <span className="text-sm font-medium text-muted-foreground">Trip chat</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => create.mutate()}
              disabled={create.isPending}
            >
              <Plus className="size-4" /> New
            </Button>
          </div>
          <ChatWindow key={conversationId} conversationId={conversationId} />
        </div>
      </div>
    </AppShell>
  );
}
