import { useState, useRef, useEffect, useMemo } from "react";
import { useAiChat } from "@workspace/api-client-react";
import type { AiChatRequestAgentType } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type InternalAgentKey = Exclude<AiChatRequestAgentType, "seller">;

type Agent = {
  key: InternalAgentKey;
  label: string;
  color: string;
  description: string;
  systemHint: string;
};

const AGENT_COLORS: Record<InternalAgentKey, string> = {
  sales: "bg-primary",
  estimator: "bg-blue-500",
  project_manager: "bg-green-500",
  admin: "bg-purple-500",
  marketing: "bg-amber-500",
};
const AGENT_KEYS: InternalAgentKey[] = ["sales", "estimator", "project_manager", "admin", "marketing"];

function ChatPanel({ agent, lang }: { agent: Agent; lang: "en" | "es" | "pt" }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.aiAssistants.greeting(agent.label, agent.systemHint) }
  ]);
  const [input, setInput] = useState("");
  const chatMutation = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);

    chatMutation.mutate({
      data: {
        agentType: agent.key,
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        language: lang,
      }
    }, {
      onSuccess: (res) => {
        setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: "assistant", content: t.aiAssistants.errorReply }]);
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", agent.color)}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">{agent.label} {t.aiAssistants.assistantSuffix}</p>
          <p className="text-xs text-muted-foreground">{agent.description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold", agent.color)}>
                AI
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-2.5">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold", agent.color)}>AI</div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={t.aiAssistants.messagePlaceholder(agent.label)}
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={send} disabled={!input.trim() || chatMutation.isPending} size="icon" className="rounded-xl h-10 w-10 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AiAssistantsPage() {
  const { t, lang } = useLanguage();
  const agents = useMemo<Agent[]>(() => AGENT_KEYS.map(key => ({
    key,
    label: t.aiAssistants.agents[key].label,
    description: t.aiAssistants.agents[key].description,
    systemHint: t.aiAssistants.agents[key].systemHint,
    color: AGENT_COLORS[key],
  })), [t]);

  const [activeKey, setActiveKey] = useState<InternalAgentKey>("sales");
  const activeAgent = agents.find(a => a.key === activeKey) ?? agents[0];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-48 shrink-0 border-r border-border bg-muted/20 flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.aiAssistants.sectionLabel}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {agents.map(agent => (
            <button
              key={agent.key}
              onClick={() => setActiveKey(agent.key)}
              className={cn(
                "w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeKey === agent.key
                  ? "bg-card border border-border shadow-xs text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full shrink-0", agent.color)} />
              {agent.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatPanel key={`${activeAgent.key}-${lang}`} agent={activeAgent} lang={lang} />
      </div>
    </div>
  );
}
