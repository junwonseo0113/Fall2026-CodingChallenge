import * as React from "react";
import { Mic, Square, RotateCcw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PROMPTS = [
  "To whoever sees this a year from now...",
  "What were you really thinking when this photo was taken?",
  "The funniest thing that happened that day",
  "Something you never told anyone about this moment",
];

const MAX_SECONDS = 30;

/** Records a short voice memo via the browser's mic and hands back a base64
 * data URL -- no server, no signaling, nothing but the standard MediaRecorder API. */
export function VoiceRecorder({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (audioData: string, durationSeconds: number) => Promise<void>;
}) {
  const [promptIndex, setPromptIndex] = React.useState(0);
  const [recording, setRecording] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);

  function reset() {
    setRecording(false);
    setElapsed(0);
    setAudioUrl(null);
  }

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Always release the mic, even if the dialog is closed mid-recording.
  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find(
        (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result as string);
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      toast.error("Couldn't access your microphone -- check your browser's permission settings");
    }
  }

  async function handleSave() {
    if (!audioUrl) return;
    setSaving(true);
    try {
      await onSave(audioUrl, elapsed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a voice note</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          <p className="rounded-xl bg-[var(--muted)] px-4 py-3 text-center text-sm italic text-[var(--muted-foreground)]">
            "{PROMPTS[promptIndex]}"
          </p>
          <button
            type="button"
            className="-mt-2 flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
          >
            <Shuffle className="h-3 w-3" /> Try another prompt
          </button>

          {audioUrl ? (
            <div className="flex w-full flex-col items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={audioUrl} controls className="w-full" />
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Re-record
              </Button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={recording ? "Stop recording" : "Start recording"}
              onClick={recording ? stopRecording : startRecording}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                recording
                  ? "bg-red-600 shadow-[0_0_0_8px_rgba(220,38,38,0.15)]"
                  : "bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
              }`}
            >
              {recording ? (
                <Square className="h-7 w-7 fill-white text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </button>
          )}

          <div className="font-mono text-sm tabular-nums text-[var(--muted-foreground)]">
            {recording
              ? `${elapsed}s / ${MAX_SECONDS}s`
              : audioUrl
              ? "Ready to save"
              : `Tap to record (max ${MAX_SECONDS}s)`}
          </div>

          {audioUrl && (
            <Button type="button" className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save voice note"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
