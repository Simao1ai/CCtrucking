import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles, X, HelpCircle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const NavigateContext = createContext<(path: string) => void>(() => {});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SUGGESTIONS = [
  "What services do you offer?",
  "How do I upload my documents?",
  "What is IFTA and do I need it?",
  "When are my next filings due?",
];

const portalMessagesByUser: Record<string, ChatMessage[]> = {};

function parseMessageContent(content: string) {
  const elements: (string | { type: "link"; url: string; text: string } | { type: "bold"; text: string } | { type: "heading"; text: string } | { type: "listItem"; text: string } | { type: "divider" })[] = [];

  const lines = content.split("\n");
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    if (line.match(/^---+$/)) {
      elements.push({ type: "divider" });
      continue;
    }

    if (line.match(/^###\s+/)) {
      elements.push({ type: "heading", text: line.replace(/^###\s+/, "") });
      continue;
    }

    if (line.match(/^[-•]\s+/)) {
      elements.push({ type: "listItem", text: line.replace(/^[-•]\s+/, "") });
      continue;
    }

    let remaining = line;
    while (remaining.length > 0) {
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      let firstMatch: { index: number; length: number; element: any } | null = null;

      if (linkMatch && linkMatch.index !== undefined) {
        const isExternal = linkMatch[2].startsWith("http");
        firstMatch = {
          index: linkMatch.index,
          length: linkMatch[0].length,
          element: { type: "link" as const, url: linkMatch[2], text: linkMatch[1], isExternal },
        };
      }
      if (boldMatch && boldMatch.index !== undefined) {
        if (!firstMatch || boldMatch.index < firstMatch.index) {
          firstMatch = {
            index: boldMatch.index,
            length: boldMatch[0].length,
            element: { type: "bold" as const, text: boldMatch[1] },
          };
        }
      }

      if (firstMatch) {
        if (firstMatch.index > 0) {
          elements.push(remaining.substring(0, firstMatch.index));
        }
        elements.push(firstMatch.element);
        remaining = remaining.substring(firstMatch.index + firstMatch.length);
      } else {
        elements.push(remaining);
        remaining = "";
      }
    }

    if (li < lines.length - 1) {
      elements.push("\n");
    }
  }

  return elements;
}

function RichContent({ content }: { content: string }) {
  const navigate = useContext(NavigateContext);
  const elements = parseMessageContent(content);

  return (
    <>
      {elements.map((el, i) => {
        if (typeof el === "string") {
          if (el === "\n") return <br key={i} />;
          return <span key={i}>{el}</span>;
        }
        if (el.type === "divider") return <hr key={i} className="my-2 border-border/30" />;
        if (el.type === "heading") return <div key={i} className="font-semibold text-sm mt-2 mb-1">{el.text}</div>;
        if (el.type === "listItem") {
          const parsed = parseMessageContent(el.text);
          return (
            <div key={i} className="flex items-start gap-1.5 ml-1">
              <span className="text-primary/60 mt-0.5">•</span>
              <span>{parsed.map((p, j) => {
                if (typeof p === "string") return <span key={j}>{p}</span>;
                if (p.type === "bold") return <strong key={j} className="font-semibold">{p.text}</strong>;
                if (p.type === "link") {
                  const isExternal = p.url.startsWith("http");
                  if (isExternal) {
                    return <a key={j} href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">{p.text}<ExternalLink className="w-3 h-3" /></a>;
                  }
                  return <button key={j} onClick={() => navigate(p.url)} className="text-primary underline">{p.text}</button>;
                }
                return null;
              })}</span>
            </div>
          );
        }
        if (el.type === "bold") return <strong key={i} className="font-semibold">{el.text}</strong>;
        if (el.type === "link") {
          const isExternal = el.url.startsWith("http");
          if (isExternal) {
            return <a key={i} href={el.url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">{el.text}<ExternalLink className="w-3 h-3" /></a>;
          }
          return <button key={i} onClick={() => navigate(el.url)} className="text-primary underline">{el.text}</button>;
        }
        return null;
      })}
    </>
  );
}

function getServiceBasedSuggestions(tickets: any[]): string[] {
  const suggestions: string[] = [];
  const serviceTypes = new Set(tickets.map(t => t.serviceType?.toLowerCase() || ""));

  if (serviceTypes.has("ifta") || tickets.some(t => t.title?.toLowerCase().includes("ifta"))) {
    suggestions.push("What's the IFTA filing process?");
  }
  if (serviceTypes.has("dot_compliance") || tickets.some(t => t.title?.toLowerCase().includes("dot"))) {
    suggestions.push("What does DOT compliance involve?");
  }
  if (serviceTypes.has("tax_preparation") || tickets.some(t => t.title?.toLowerCase().includes("tax"))) {
    suggestions.push("What do I need for my tax filing?");
  }
  if (serviceTypes.has("bookkeeping") || tickets.some(t => t.title?.toLowerCase().includes("bookkeeping"))) {
    suggestions.push("How does the bookkeeping service work?");
  }
  if (serviceTypes.has("ucr") || tickets.some(t => t.title?.toLowerCase().includes("ucr"))) {
    suggestions.push("What is UCR registration?");
  }
  if (serviceTypes.has("mcs150") || tickets.some(t => t.title?.toLowerCase().includes("mcs-150"))) {
    suggestions.push("When is my MCS-150 update due?");
  }

  const activeCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  if (activeCount > 0) {
    suggestions.push("What's the status of my services?");
  }

  const remaining = DEFAULT_SUGGESTIONS.filter(s => !suggestions.includes(s));
  const combined = [...suggestions, ...remaining];
  return combined.slice(0, 5);
}

export function PortalAiChatWidget() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userId = user?.id?.toString() || "anon";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(portalMessagesByUser[userId] || []);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/tickets"],
    enabled: open,
  });

  const suggestedQuestions = getServiceBasedSuggestions(tickets);

  useEffect(() => {
    setMessages(portalMessagesByUser[userId] || []);
  }, [userId]);

  useEffect(() => {
    portalMessagesByUser[userId] = messages;
  }, [messages, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/portal/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text.trim(), history: messages }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let assistantContent = "";
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                assistantContent += data.content;
                setMessages([...history, { role: "assistant", content: assistantContent }]);
              }
            } catch {}
          }
        }
      }

      if (assistantContent) {
        setMessages([...history, { role: "assistant", content: assistantContent }]);
      }
    } catch (err) {
      setMessages([...history, { role: "assistant", content: "I'm sorry, I couldn't process your request right now. Please try again or contact our team through the Messages page." }]);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <NavigateContext.Provider value={navigate}>
      <div className="fixed bottom-6 right-6 z-50" data-testid="container-portal-ai-chat">
        {!open && (
          <Button
            onClick={() => setOpen(true)}
            className="rounded-full h-12 px-4 shadow-lg gap-2"
            data-testid="button-portal-ai-toggle"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Help</span>
          </Button>
        )}

        {open && (
          <div className="w-[400px] h-[520px] bg-card border border-card-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <span className="font-semibold text-sm" data-testid="text-portal-ai-title">Help Assistant</span>
                  <p className="text-[10px] text-muted-foreground">Ask me anything about your services</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="h-7 w-7" data-testid="button-portal-ai-close">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary/60" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm" data-testid="text-portal-ai-empty">How can we help you?</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask about your services, documents, or compliance needs</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-[340px]">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-2.5 py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                        data-testid={`button-portal-suggest-${q.slice(0, 20).replace(/[^a-zA-Z]/g, "-").toLowerCase()}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 border border-border/30"
                    }`}
                    data-testid={`message-portal-${msg.role}-${i}`}
                  >
                    {msg.role === "assistant" ? <RichContent content={msg.content} /> : msg.content}
                  </div>
                </div>
              ))}

              {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/30 rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="text-sm"
                disabled={streaming}
                data-testid="input-portal-ai-message"
              />
              <Button type="submit" size="icon" disabled={streaming || !input.trim()} data-testid="button-portal-ai-send">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </NavigateContext.Provider>
  );
}
