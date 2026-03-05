import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, X, MessageSquare, ExternalLink } from "lucide-react";

const NavigateContext = createContext<(path: string) => void>(() => {});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Show overdue invoices",
  "Revenue this month",
  "List active clients",
  "Open tickets summary",
  "Top revenue clients",
];

let globalMessages: ChatMessage[] = [];

function parseMessageContent(content: string) {
  const elements: (string | { type: "link"; url: string; text: string } | { type: "bold"; text: string } | { type: "heading"; text: string } | { type: "listItem"; text: string } | { type: "divider" })[] = [];

  const lines = content.split("\n");
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    if (line.match(/^---+$/)) {
      elements.push({ type: "divider" });
      continue;
    }

    if (line.match(/^#{1,3}\s+/)) {
      elements.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
      continue;
    }

    if (line.match(/^[\-\*•]\s+/)) {
      elements.push({ type: "listItem", text: line.replace(/^[\-\*•]\s+/, "") });
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      elements.push({ type: "listItem", text: line });
      continue;
    }

    if (li > 0) elements.push("\n");
    elements.push(line);
  }

  return elements;
}

function RichContent({ content }: { content: string }) {
  const parsed = parseMessageContent(content);

  return (
    <div className="text-sm space-y-1">
      {parsed.map((el, i) => {
        if (typeof el === "string") {
          if (el === "\n") return <br key={i} />;
          return <InlineContent key={i} text={el} />;
        }
        if (el.type === "divider") {
          return <hr key={i} className="border-border/50 my-2" />;
        }
        if (el.type === "heading") {
          return (
            <p key={i} className="font-semibold text-sm mt-2 mb-1">
              <InlineContent text={el.text} />
            </p>
          );
        }
        if (el.type === "listItem") {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
              <span><InlineContent text={el.text} /></span>
            </div>
          );
        }
        if (el.type === "bold") {
          return <strong key={i}>{el.text}</strong>;
        }
        return null;
      })}
    </div>
  );
}

function InlineContent({ text }: { text: string }) {
  const navigate = useContext(NavigateContext);
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|\$[\d,.]+)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/^\*\*(.+)\*\*$/)) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const isInternal = linkMatch[2].startsWith("/");
          return (
            <a
              key={i}
              href={linkMatch[2]}
              onClick={(e) => {
                e.preventDefault();
                if (isInternal) {
                  navigate(linkMatch[2]);
                } else {
                  window.open(linkMatch[2], "_blank");
                }
              }}
              className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium cursor-pointer"
              data-testid={`link-ai-${i}`}
            >
              {linkMatch[1]}
              {!isInternal && <ExternalLink className="w-3 h-3" />}
            </a>
          );
        }
        if (part.match(/^https?:\/\/[^\s]+$/)) {
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {part}
            </a>
          );
        }
        if (part.match(/^\$[\d,.]+$/)) {
          return <span key={i} className="font-semibold text-green-600 dark:text-green-400">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function AiChatWidget() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(globalMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    globalMessages = messages;
  }, [messages]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const history = [...messages, userMessage];

    setMessages(history);
    setInputValue("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...history, assistantMessage]);

    try {
      const response = await fetch("/api/admin/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                setIsStreaming(false);
                return;
              }
              if (data.content) {
                accumulated += data.content;
                const currentContent = accumulated;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: currentContent };
                  return updated;
                });
              }
            } catch {
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(inputValue);
  };

  const clearChat = () => {
    setMessages([]);
    globalMessages = [];
  };

  return (
    <NavigateContext.Provider value={setLocation}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-3 hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          data-testid="button-ai-chat-toggle"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-medium">AI Assistant</span>
          {messages.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0" data-testid="badge-ai-message-count">
              {messages.length}
            </Badge>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          data-testid="container-ai-chat-widget"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm" data-testid="text-ai-widget-title">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">CC Trucking Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearChat}
                  data-testid="button-ai-clear-chat"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                data-testid="button-ai-chat-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3" data-testid="container-ai-messages">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm" data-testid="text-ai-empty-state">How can I help you today?</p>
                  <p className="text-xs text-muted-foreground mt-1">Ask about clients, invoices, tickets, or revenue</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[320px]">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                      onClick={() => sendMessage(q)}
                      data-testid={`button-suggestion-${q.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/70 rounded-bl-md"
                      }`}
                      data-testid={`chat-message-${i}`}
                    >
                      {msg.role === "assistant" ? (
                        msg.content === "" && isStreaming ? (
                          <div className="flex items-center gap-1.5 py-1" data-testid="indicator-typing">
                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          <RichContent content={msg.content} />
                        )
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                disabled={isStreaming}
                className="rounded-xl text-sm"
                data-testid="input-ai-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isStreaming}
                className="rounded-xl flex-shrink-0"
                data-testid="button-ai-send-message"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </NavigateContext.Provider>
  );
}
