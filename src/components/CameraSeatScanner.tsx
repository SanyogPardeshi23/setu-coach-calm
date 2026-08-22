import { useEffect, useRef, useState } from "react";

// Loaded from CDN at runtime — deliberately kept out of package.json/the
// build pipeline to avoid touching an already-fragile build tonight.
const TFJS_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
const COCO_SSD_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface SeatScanResult {
  totalSeats: number;
  occupiedSeats: number;
  emptySeats: number;
}

/** A "seat" (chair) is treated as occupied if a detected person's box overlaps it. */
function scoreSeats(detections: Detection[]): SeatScanResult {
  const chairs = detections.filter((d) => d.class === "chair" && d.score > 0.5);
  const people = detections.filter((d) => d.class === "person" && d.score > 0.5);

  function overlaps(a: Detection, b: Detection): boolean {
    const [ax, ay, aw, ah] = a.bbox;
    const [bx, by, bw, bh] = b.bbox;
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  const occupied = chairs.filter((chair) =>
    people.some((person) => overlaps(chair, person)),
  ).length;

  return {
    totalSeats: chairs.length,
    occupiedSeats: occupied,
    emptySeats: chairs.length - occupied,
  };
}

export function CameraSeatScanner({
  onScan,
}: {
  onScan: (result: SeatScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState
    "idle" | "loading" | "ready" | "scanning" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SeatScanResult | null>(null);
  const modelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setStatus("loading");
    setError(null);
    try {
      await loadScript(TFJS_URL);
      await loadScript(COCO_SSD_URL);

      // @ts-expect-error — loaded onto window by the CDN scripts above
      modelRef.current = await window.cocoSsd.load();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Camera or model failed to load",
      );
      setStatus("error");
    }
  }

  async function scanOnce() {
    if (!videoRef.current || !modelRef.current) return;
    setStatus("scanning");
    const predictions: Detection[] = await modelRef.current.detect(videoRef.current);
    const result = scoreSeats(predictions);
    setLastResult(result);
    onScan(result);
    setStatus("ready");
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }

  return (
    <div className="card-surface p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold tracking-tight">
          Camera Seat Scan (Proof of Concept)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Uses your phone or laptop camera with a general-purpose
          object-detection model to count occupied vs. empty chairs in
          frame — a stand-in for a future in-coach CCTV feed. Detects
          standard "person" and "chair" categories, not actual train
          seats specifically.
        </p>
      </div>

      {status === "idle" && (
        <button
          onClick={start}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start Camera Scan
        </button>
      )}

      {status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading detection model…</p>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error} — camera-based scanning isn't available right now.
        </p>
      )}

      {(status === "ready" || status === "scanning") && (
        <>
          <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
          <div className="flex gap-2">
            <button
              onClick={scanOnce}
              disabled={status === "scanning"}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {status === "scanning" ? "Scanning…" : "Scan Now"}
            </button>
            <button
              onClick={stop}
              className="rounded-xl border border-border px-4 py-3 text-sm font-semibold"
            >
              Stop
            </button>
          </div>
        </>
      )}

      {lastResult && (
        <div className="rounded-lg bg-secondary/70 p-3 text-sm">
          <span className="font-semibold">
            {lastResult.emptySeats}/{lastResult.totalSeats}
          </span>{" "}
          seats empty (detected {lastResult.occupiedSeats} occupied)
        </div>
      )}
    </div>
  );
}
