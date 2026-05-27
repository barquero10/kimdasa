import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAiChat, useCreateLead } from "@workspace/api-client-react";
import type { AiChatResponse, AiChatRequestMessagesItem, AiChatRequestAgentType } from "@workspace/api-client-react";
import { MessageSquare, X, Send, Loader2, Volume2, VolumeX, Mic, MicOff, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  hasContract?: boolean;
};

const DISMISSED_KEY = "kim_dismissed_v1";

export function ChatWidget() {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const greeting = useMemo<Message>(
    () => ({ role: "assistant", content: t.chat.greeting }),
    [t.chat.greeting],
  );
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [capturedName, setCapturedName] = useState<string | null>(null);
  const [capturedPhone, setCapturedPhone] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingTtsIndex, setLoadingTtsIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useAiChat();
  const createLead = useCreateLead();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [greeting];
      }
      return prev;
    });
  }, [greeting]);

  // Auto-open Kim after 4 s on first visit this session.
  // If the visitor manually closed it, don't reopen (sessionStorage flag).
  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    const pulseTimer = setTimeout(() => setShowPulse(true), 2000);
    const openTimer = setTimeout(() => {
      if (!sessionStorage.getItem(DISMISSED_KEY)) setIsOpen(true);
    }, 4000);
    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(openTimer);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingIndex(null);
  }, []);

  const playMessageAudio = useCallback(
    async (index: number, text: string) => {
      if (playingIndex === index) {
        stopAudio();
        return;
      }
      stopAudio();
      setLoadingTtsIndex(index);
      try {
        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });
        if (!res.ok) throw new Error(`TTS request failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingIndex(index);
        audio.onended = () => {
          setPlayingIndex((cur) => (cur === index ? null : cur));
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setPlayingIndex((cur) => (cur === index ? null : cur));
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch (err) {
        console.error("TTS playback error", err);
        setPlayingIndex(null);
      } finally {
        setLoadingTtsIndex((cur) => (cur === index ? null : cur));
      }
    },
    [lang, playingIndex, stopAudio],
  );

  const tryCaptureLead = (content: string, allMessages: Message[]) => {
    const phoneMatch = content.match(/(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
    const emailMatch = content.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const namePatterns = [
      /(?:my name is|i am|i'm|me llamo|soy|mi nombre es|me puedes llamar)\s+([A-Za-z]+(?: [A-Za-z]+)?)/i,
      /^([A-Z][a-z]+(?: [A-Z][a-z]+)+)(?:\.|,|\s|$)/,
      /^([A-Za-z]+ [A-Za-z]+)$/,
    ];
    const serviceMatch = content.match(
      /\b(roof(?:ing)?|siding|vinyl|hardie|window(?:s)?|door(?:s)?|gutter(?:s)?|soffit|fascia|capping|repair(?:s)?|remodel(?:ing)?|masonry|skylight(?:s)?|kitchen|bath(?:room)?|drywall|painting|flooring|tile|carpentry|closet(?:s)?|basement|attic|demolition)\b/i,
    );

    let resolvedName = capturedName;
    let resolvedPhone = capturedPhone;

    for (const pattern of namePatterns) {
      const m = content.match(pattern);
      if (m && !capturedName) {
        resolvedName = m[1];
        setCapturedName(m[1]);
        break;
      }
    }
    if (phoneMatch && !capturedPhone) {
      resolvedPhone = phoneMatch[1];
      setCapturedPhone(phoneMatch[1]);
    }

    const fullHistory = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");
    const combinedPhone = resolvedPhone ?? fullHistory.match(/(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/)?.[1];
    const combinedEmail = emailMatch?.[0] ?? fullHistory.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0];

    const hasEnough = (resolvedName || combinedEmail) && combinedPhone;
    if (hasEnough && !createLead.isSuccess && !createLead.isPending) {
      const serviceType = serviceMatch?.[1] ?? undefined;
      createLead.mutate({
        data: {
          name: resolvedName ?? "Chat Lead",
          phone: combinedPhone!,
          email: combinedEmail,
          serviceType,
          source: "chatbot",
          language: lang,
          comments: `Captured via chatbot. Full chat context: ${fullHistory.slice(0, 300)}`,
        },
      });
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.slice(0, 4).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImages((prev) => [...prev, reader.result as string].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, []);

  const sendMessage = useCallback(
    (userMessage: string, overrideImages?: string[]) => {
      const trimmed = userMessage.trim();
      const imgs = overrideImages ?? pendingImages;
      if (!trimmed && imgs.length === 0) return;
      if (chatMutation.isPending) return;

      const newMsg: Message = {
        role: "user",
        content: trimmed || t.chat.photoSent,
        images: imgs.length > 0 ? [...imgs] : undefined,
      };

      const updatedMessages: Message[] = [...messages, newMsg];
      setMessages(updatedMessages);
      setPendingImages([]);

      if (trimmed) tryCaptureLead(trimmed, updatedMessages);

      const apiMessages: AiChatRequestMessagesItem[] = updatedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      chatMutation.mutate(
        {
          data: {
            agentType: "seller" as AiChatRequestAgentType,
            messages: apiMessages,
            language: lang,
            ...(imgs.length > 0 && { images: imgs }),
          } as any,
        },
        {
          onSuccess: (data: AiChatResponse) => {
            let reply = (data as any).reply ?? "";
            const hasLeadCapture = reply.includes("[LEAD_CAPTURED]");
            const hasShowBooking = reply.includes("[SHOW_BOOKING]");
            const hasContract = reply.includes("[CONTRACT_OFFERED]");
            reply = reply
              .replace(/\[LEAD_CAPTURED\]/g, "")
              .replace(/\[SHOW_BOOKING\]/g, "")
              .replace(/\[CONTRACT_OFFERED\]/g, "")
              .trim();
            if (hasLeadCapture || hasShowBooking) {
              setTimeout(() => {
                setIsOpen(false);
                const bookingEl = document.getElementById("booking");
                if (bookingEl) bookingEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 1200);
            }
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: reply, hasContract },
            ]);
          },
          onError: () => {
            setMessages((prev) => [...prev, { role: "assistant", content: t.chat.error }]);
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, chatMutation, lang, t.chat.error, t.chat.photoSent, pendingImages],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value && pendingImages.length === 0) return;
    setInput("");
    sendMessage(value);
  };

  const openContractWindow = (content: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Kimdasa – Contract</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 20px; line-height: 1.7; color: #111; }
  h1 { font-size: 1.4rem; border-bottom: 2px solid #c27b2c; padding-bottom: 8px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 0.95rem; }
  .btn { margin-top: 24px; padding: 10px 24px; background: #c27b2c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
  @media print { .btn { display: none; } }
</style>
</head><body>
<h1>Kimdasa Construction — Service Agreement</h1>
<pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
<button class="btn" onclick="window.print()">🖨️ ${t.chat.contractPrint}</button>
</body></html>`);
    win.document.close();
  };

  const startRecording = useCallback(async () => {
    setMicError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(t.chat.micUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        if (blob.size < 1000) return;
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              const b64 = result.split(",")[1] ?? "";
              resolve(b64);
            };
            reader.onerror = () => reject(reader.error);
          });
          reader.readAsDataURL(blob);
          const audioBase64 = await base64Promise;
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64, mimeType: blob.type, lang }),
          });
          if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
          const data = (await res.json()) as { text: string };
          const text = data.text?.trim();
          if (text) {
            sendMessage(text);
          }
        } catch (err) {
          console.error("Transcription error", err);
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic permission denied", err);
      setMicError(t.chat.micPermission);
    }
  }, [lang, sendMessage, t.chat.micPermission, t.chat.micUnsupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      <Button
        onClick={() => { setIsOpen(true); setShowPulse(false); }}
        data-testid="button-open-chat"
        className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-2xl p-0 flex items-center justify-center z-[60] transition-all duration-300 ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label={t.chat.open}
      >
        <MessageSquare className="h-6 w-6" />
        {showPulse && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-60" aria-hidden="true" />
        )}
      </Button>

      <div
        className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border shadow-2xl rounded-sm flex flex-col overflow-hidden z-[60] transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        }`}
        style={{ height: "540px", maxHeight: "calc(100vh - 5rem)" }}
        data-testid="chat-widget-window"
      >
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold leading-tight">{t.chat.title}</h3>
            <p className="text-xs text-primary-foreground/80">{t.chat.online}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsOpen(false); sessionStorage.setItem(DISMISSED_KEY, "1"); }}
            className="text-primary-foreground hover:bg-black/20"
            data-testid="button-close-chat"
            aria-label={t.chat.close}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`chat-message-${i}`}
            >
              <div
                className={`max-w-[85%] rounded-sm p-3 text-sm whitespace-pre-wrap relative group ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {msg.images.map((img, j) => (
                      <img
                        key={j}
                        src={img}
                        alt=""
                        className="h-20 w-20 object-cover rounded-sm border border-white/20"
                      />
                    ))}
                  </div>
                )}
                {msg.content}
                {msg.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => playMessageAudio(i, msg.content)}
                    className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors align-middle"
                    aria-label={playingIndex === i ? t.chat.stopListening : t.chat.listen}
                    data-testid={`button-tts-${i}`}
                  >
                    {loadingTtsIndex === i ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : playingIndex === i ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {msg.hasContract && (
                  <button
                    type="button"
                    onClick={() => openContractWindow(msg.content)}
                    className="mt-2 flex items-center gap-1.5 w-full text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-sm px-3 py-1.5 font-medium transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    {t.chat.contractView}
                  </button>
                )}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground rounded-sm p-3 flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t.chat.typing}
              </div>
            </div>
          )}
          {isTranscribing && (
            <div className="flex justify-end">
              <div className="bg-primary/20 text-foreground rounded-sm p-3 flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t.chat.micRecording}
              </div>
            </div>
          )}
        </div>

        {micError && (
          <div className="px-3 py-1 text-xs text-destructive bg-destructive/10 border-t border-destructive/20 shrink-0">
            {micError}
          </div>
        )}

        {pendingImages.length > 0 && (
          <div className="px-3 pt-2 flex gap-2 flex-wrap border-t border-border shrink-0">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="" className="h-14 w-14 object-cover rounded-sm border border-border" />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold leading-none"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-border bg-background shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "secondary"}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={isRecording ? stopRecording : undefined}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              disabled={chatMutation.isPending || isTranscribing}
              data-testid="button-mic-chat"
              aria-label={isRecording ? t.chat.micStop : t.chat.micStart}
              title={isRecording ? t.chat.micStop : t.chat.micStart}
              className="shrink-0"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={chatMutation.isPending || isRecording}
              aria-label={t.chat.photoUpload}
              title={t.chat.photoUpload}
              className="shrink-0"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? t.chat.micRecording : t.chat.placeholder}
              className="flex-1 bg-card text-sm"
              disabled={chatMutation.isPending || isRecording || isTranscribing}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!input.trim() && pendingImages.length === 0) || chatMutation.isPending}
              data-testid="button-send-chat"
              aria-label={t.chat.send}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
