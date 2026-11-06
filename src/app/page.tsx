"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playCountdownBeep, playShutterSound } from "@/lib/audio";
import { generatePhotoStrip, PhotoStripOptions } from "@/lib/photoStrip";

type AppState = "camera" | "countdown" | "processing" | "results" | "permission_denied";

export default function PhotoBooth() {
  const [appState, setAppState] = useState<AppState>("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [stripTheme, setStripTheme] = useState<"white" | "black" | "cream">("white");
  const [stripFilter, setStripFilter] = useState<"normal" | "bw" | "warm">("normal");
  const [stripResult, setStripResult] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showInstallTip, setShowInstallTip] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef<boolean>(false);

  // Check if running as installed standalone PWA
  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(isPWA));
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    // Stop any existing stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAppState("permission_denied");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setAppState("camera");
    } catch (err) {
      console.error("Camera access error:", err);
      setAppState("permission_denied");
    }
  }, [facingMode]);

  // Start camera on mount
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, facingMode]);

  // Toggle front/rear camera
  const toggleCameraFacing = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  // Capture a single frame from the video feed
  const captureCurrentFrame = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    // If front camera, mirror horizontally so saved photo matches preview
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.95);
  };

  // Helper wait function
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sequence to take 4 photos with 3-2-1 countdown for each
  const startPhotoSequence = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setAppState("countdown");
    const photos: string[] = [];

    try {
      for (let shot = 0; shot < 4; shot++) {
        setCurrentShotIndex(shot + 1);

        // 3 - 2 - 1 countdown
        for (let count = 3; count >= 1; count--) {
          setCountdownNumber(count);
          playCountdownBeep(false);
          await wait(900);
        }

        // Shutter instant
        setCountdownNumber(null);
        playCountdownBeep(true);
        playShutterSound();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(60);
        }

        // Screen Flash
        setIsFlashing(true);
        const photoUrl = captureCurrentFrame();
        if (photoUrl) {
          photos.push(photoUrl);
          setCapturedPhotos([...photos]);
        }

        await wait(200);
        setIsFlashing(false);

        // Intermission between shots (except after last shot)
        if (shot < 3) {
          await wait(700);
        }
      }

      // Photos completed -> render strip
      setAppState("processing");
      await wait(300);

      const strip = await generatePhotoStrip(photos, {
        theme: stripTheme,
        filter: stripFilter,
      });

      setStripResult(strip);
      setAppState("results");
    } catch (err) {
      console.error("Sequence error:", err);
      setAppState("camera");
    } finally {
      isCapturingRef.current = false;
      setCountdownNumber(null);
    }
  };

  // Update strip whenever theme or filter changes on results screen
  useEffect(() => {
    if (appState === "results" && capturedPhotos.length === 4) {
      let isCurrent = true;
      generatePhotoStrip(capturedPhotos, {
        theme: stripTheme,
        filter: stripFilter,
      }).then((result) => {
        if (isCurrent) {
          setStripResult(result);
        }
      });
      return () => {
        isCurrent = false;
      };
    }
  }, [stripTheme, stripFilter, appState, capturedPhotos]);

  // Retake: clear photos and go back to camera preview
  const handleRetake = async () => {
    setCapturedPhotos([]);
    setStripResult(null);
    setSaveStatus(null);
    setAppState("camera");
    if (!streamRef.current || !streamRef.current.active) {
      await startCamera(facingMode);
    }
  };

  // Save / Share handler
  const handleSaveOrShare = async () => {
    if (!stripResult) return;

    try {
      const fileName = `photo-strip-${Date.now()}.png`;
      const file = new File([stripResult.blob], fileName, { type: "image/png" });

      // Check if navigator.share supports file sharing (Mobile Safari / Chrome)
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        setSaveStatus("Opening share sheet... Tap 'Save Image'");
        await navigator.share({
          files: [file],
          title: "My Photo Strip",
          text: "Created with Photo Booth",
        });
        setSaveStatus("Shared successfully!");
        setTimeout(() => setSaveStatus(null), 3500);
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        setSaveStatus(null);
        return;
      }
      console.log("Share skipped or not supported, falling back to download", err);
    }

    // Fallback: download directly (Laptop / Desktop browser)
    try {
      const a = document.createElement("a");
      a.href = stripResult.dataUrl;
      a.download = `photo-strip-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSaveStatus("Downloaded to your files!");
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (e) {
      console.error("Download error:", e);
      setSaveStatus("Failed to save image");
    }
  };

  return (
    <main
      className="relative w-full h-full flex flex-col bg-black text-white overflow-hidden select-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* WHITE FLASH OVERLAY */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none animate-flash" />
      )}

      {/* 1. CAMERA VIEW */}
      {(appState === "camera" || appState === "countdown" || appState === "processing") && (
        <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden">
          {/* Live Video Preview (Full Screen) */}
          <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />
          </div>

          {/* Top Bar Header */}
          <div className="relative z-20 w-full pt-3 px-5 flex items-center justify-between">
            {/* App Title badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-semibold tracking-wider uppercase text-white/90">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Photo Booth
            </div>

            {/* Quick Actions (Switch Camera & PWA Install Guide) */}
            <div className="flex items-center gap-2">
              {!isStandalone && (
                <button
                  onClick={() => setShowInstallTip(true)}
                  className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90 active:scale-95 transition-transform"
                >
                  Install App
                </button>
              )}

              <button
                onClick={toggleCameraFacing}
                disabled={appState !== "camera"}
                aria-label="Switch camera"
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-40"
              >
                {/* Switch Camera SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 3-2-1 Countdown & Shot Indicator Center Overlay */}
          {appState === "countdown" && (
            <div className="relative z-30 flex-1 flex flex-col items-center justify-center pointer-events-none">
              {/* Photo X of 4 badge */}
              <div className="mb-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-sm font-semibold tracking-wider uppercase text-white">
                Photo {currentShotIndex} of 4
              </div>

              {/* Big animated countdown number */}
              {countdownNumber !== null ? (
                <div
                  key={`${currentShotIndex}-${countdownNumber}`}
                  className="w-36 h-36 rounded-full bg-black/40 backdrop-blur-xl border border-white/30 flex items-center justify-center text-8xl font-black text-white shadow-2xl animate-countdown-pop drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                >
                  {countdownNumber}
                </div>
              ) : (
                <div className="text-3xl font-extrabold tracking-widest text-white uppercase drop-shadow-lg">
                  Smile!
                </div>
              )}

              {/* 4 dots progress */}
              <div className="mt-8 flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i < currentShotIndex
                        ? "w-8 bg-green-400"
                        : i === currentShotIndex
                        ? "w-8 bg-white animate-pulse"
                        : "w-2.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {appState === "processing" && (
            <div className="relative z-30 flex-1 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-base font-medium tracking-wide">Developing your photo strip...</p>
            </div>
          )}

          {/* Empty spacer when not counting down */}
          {appState === "camera" && <div className="flex-1" />}

          {/* Bottom Shutter Controls */}
          <div className="relative z-20 w-full pb-8 pt-4 flex flex-col items-center justify-center">
            {appState === "camera" && (
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-medium tracking-wider uppercase text-white/70 drop-shadow">
                  Takes 4 photos in a row
                </span>

                {/* Big iOS Style Camera Shutter Button */}
                <button
                  onClick={startPhotoSequence}
                  aria-label="Take 4 photos"
                  className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white p-1 transition-transform active:scale-95 touch-manipulation focus:outline-none"
                >
                  {/* Inner Solid White Shutter Button */}
                  <span className="w-full h-full rounded-full bg-white transition-all duration-150 group-active:scale-90 group-active:bg-neutral-200 shadow-lg" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. RESULTS VIEW */}
      {appState === "results" && stripResult && (
        <div className="relative w-full h-full flex flex-col bg-neutral-950">
          {/* Top Header / Customization Controls */}
          <div className="shrink-0 pt-2 pb-3 px-4 flex flex-col gap-2.5 bg-neutral-900/80 backdrop-blur-xl border-b border-white/10 z-20">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-white/90">
                Photo Strip
              </h2>
              {saveStatus && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {saveStatus}
                </span>
              )}
            </div>

            {/* Customization Selectors: Border Theme & Photo Filter */}
            <div className="flex items-center justify-between gap-2 text-xs">
              {/* Border Color */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                <span className="text-white/50 text-[11px] px-1 font-medium">Border:</span>
                <button
                  onClick={() => setStripTheme("white")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripTheme === "white"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => setStripTheme("cream")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripTheme === "cream"
                      ? "bg-[#FBF8F1] text-stone-900 font-semibold shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Cream
                </button>
                <button
                  onClick={() => setStripTheme("black")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripTheme === "black"
                      ? "bg-neutral-800 text-white font-semibold shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Noir
                </button>
              </div>

              {/* Photo Filter */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                <span className="text-white/50 text-[11px] px-1 font-medium">Filter:</span>
                <button
                  onClick={() => setStripFilter("normal")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripFilter === "normal"
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Color
                </button>
                <button
                  onClick={() => setStripFilter("bw")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripFilter === "bw"
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  B&amp;W
                </button>
                <button
                  onClick={() => setStripFilter("warm")}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    stripFilter === "warm"
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Warm
                </button>
              </div>
            </div>
          </div>

          {/* Photo Strip Scrollable Canvas Preview */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-6 flex items-start justify-center">
            <div className="relative max-w-[320px] w-full rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/10 overflow-hidden transform transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripResult.dataUrl}
                alt="Your 4-photo booth strip"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="shrink-0 p-4 bg-neutral-900/90 backdrop-blur-xl border-t border-white/10 flex items-center gap-3 z-20">
            {/* Retake Button */}
            <button
              onClick={handleRetake}
              className="flex-1 h-13 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-white/80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retake
            </button>

            {/* Save / Share Button */}
            <button
              onClick={handleSaveOrShare}
              className="flex-[2] h-13 rounded-2xl bg-white text-black hover:bg-neutral-100 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Save Strip
            </button>
          </div>
        </div>
      )}

      {/* 3. CAMERA PERMISSION DENIED SCREEN */}
      {appState === "permission_denied" && (
        <div className="relative w-full h-full flex flex-col items-center justify-center px-6 text-center bg-neutral-950">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Camera Access Required</h2>
          <p className="text-neutral-400 text-sm max-w-sm mb-6 leading-relaxed">
            Photo Booth needs access to your front camera to take photo strips.
          </p>

          <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-5 text-left mb-8 space-y-3.5 text-xs text-neutral-300">
            <p className="font-semibold text-white text-sm">How to turn it on in Safari:</p>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">1</span>
              <span>Tap the <strong>&quot;aA&quot;</strong> or Settings icon on the left side of Safari&apos;s address bar.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">2</span>
              <span>Tap <strong>Website Settings</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">3</span>
              <span>Under <strong>Camera</strong>, select <strong>Allow</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">4</span>
              <span>Tap &quot;Try Again&quot; below or refresh this page.</span>
            </div>
          </div>

          <button
            onClick={() => startCamera(facingMode)}
            className="w-full max-w-sm h-14 rounded-2xl bg-white text-black font-bold text-base active:scale-95 transition-transform shadow-lg"
          >
            Try Again
          </button>
        </div>
      )}

      {/* iOS Add to Home Screen Instructions Modal */}
      {showInstallTip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end p-4">
          <div className="w-full bg-neutral-900 border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0-12l-4 4m4-4l4 4m-8 8h8"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Install on iPhone</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Install Photo Booth on your home screen to launch it full screen like a native app without the Safari browser bar:
            </p>
            <div className="text-left text-xs text-neutral-300 space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">1.</span>
                <span>Tap the <strong>Share</strong> button (⎙) at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">2.</span>
                <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">3.</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </div>
            </div>
            <button
              onClick={() => setShowInstallTip(false)}
              className="w-full h-12 rounded-xl bg-white/15 text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
