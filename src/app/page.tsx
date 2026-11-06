"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playCountdownBeep, playShutterSound, getAudioContext } from "@/lib/audio";
import {
  generatePhotoStrip,
  BorderStyle,
  InstagramFilter,
  BORDER_OPTIONS,
  FILTER_OPTIONS,
} from "@/lib/photoStrip";
import GradientWaveBackground from "@/components/GradientWaveBackground";

type AppState = "camera" | "countdown" | "processing" | "results" | "permission_denied";

export default function PhotoBooth() {
  const [appState, setAppState] = useState<AppState>("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isLightFlooding, setIsLightFlooding] = useState<boolean>(false);
  const [selectedBorder, setSelectedBorder] = useState<BorderStyle>("concert");
  const [selectedFilter, setSelectedFilter] = useState<InstagramFilter>("normal");
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
        try {
          await videoRef.current.play();
        } catch (playErr: unknown) {
          if ((playErr as Error)?.name !== "AbortError") {
            throw playErr;
          }
        }
      }

      setAppState("camera");
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Camera access error:", err);
        setAppState("permission_denied");
      }
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
    // Mirror horizontally for front-facing camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.96);
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sequence to take 4 photos with 3-2-1 countdown, sound, and light flood
  const startPhotoSequence = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    getAudioContext();
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

        // Shutter snap instant
        setCountdownNumber(null);
        playCountdownBeep(true);
        playShutterSound();

        // Haptic feedback
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([60, 40, 60]);
        }

        // Trigger Blinding Light Flood
        setIsLightFlooding(true);

        const photoUrl = captureCurrentFrame();
        if (photoUrl) {
          photos.push(photoUrl);
          setCapturedPhotos([...photos]);
        }

        await wait(320);
        setIsLightFlooding(false);

        // Intermission between shots
        if (shot < 3) {
          await wait(800);
        }
      }

      // Photos completed -> render strip
      setAppState("processing");
      await wait(350);

      const strip = await generatePhotoStrip(photos, {
        border: selectedBorder,
        filter: selectedFilter,
      });

      setStripResult(strip);
      setAppState("results");
    } catch (err) {
      console.error("Sequence error:", err);
      setAppState("camera");
    } finally {
      isCapturingRef.current = false;
      setCountdownNumber(null);
      setIsLightFlooding(false);
    }
  };

  // Update strip whenever border or filter changes on results screen
  useEffect(() => {
    if (appState === "results" && capturedPhotos.length === 4) {
      let isCurrent = true;
      generatePhotoStrip(capturedPhotos, {
        border: selectedBorder,
        filter: selectedFilter,
      }).then((result) => {
        if (isCurrent) {
          setStripResult(result);
        }
      });
      return () => {
        isCurrent = false;
      };
    }
  }, [selectedBorder, selectedFilter, appState, capturedPhotos]);

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
      const fileName = `photo-strip-${selectedBorder}-${Date.now()}.png`;
      const file = new File([stripResult.blob], fileName, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        setSaveStatus("Opening share sheet... Tap 'Save Image'");
        await navigator.share({
          files: [file],
          title: "My Photo Booth Strip",
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
      console.log("Share skipped, falling back to download", err);
    }

    // Laptop fallback: download image file
    try {
      const a = document.createElement("a");
      a.href = stripResult.dataUrl;
      a.download = `photo-strip-${selectedBorder}-${Date.now()}.png`;
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
      className="relative w-full h-full flex flex-col bg-transparent text-white overflow-hidden select-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* CONSTANT GENTLE GRADIENT WAVE RIPPLE BACKGROUND */}
      <GradientWaveBackground />

      {/* BLINDING LIGHT FLOOD OVERLAY */}
      {isLightFlooding && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 animate-light-flood"
            style={{
              background:
                "radial-gradient(circle at center, #ffffff 0%, rgba(255, 255, 255, 0.98) 55%, rgba(255, 248, 235, 0.95) 100%)",
            }}
          />
          <div className="w-96 h-96 rounded-full border-8 border-white/60 animate-bloom-ring pointer-events-none" />
        </div>
      )}

      {/* 1. CLEAR DEDICATED PHOTO-TAKING STUDIO VIEW */}
      {(appState === "camera" || appState === "countdown" || appState === "processing") && (
        <div className="relative w-full h-full flex flex-col items-center justify-between p-3 overflow-hidden">
          {/* Top Studio Header */}
          <div className="w-full max-w-md pt-2 px-1 flex items-center justify-between z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FAF6EB]/95 backdrop-blur-md border border-[#F7A87A] text-xs font-semibold tracking-wider uppercase text-[#F7A87A] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#F7A87A] animate-pulse" />
              Photo Studio
            </div>

            <div className="flex items-center gap-2">
              {!isStandalone && (
                <button
                  onClick={() => setShowInstallTip(true)}
                  className="px-3 py-1.5 rounded-md bg-[#FAF6EB]/95 backdrop-blur-md border border-[#F7A87A] text-xs font-medium tracking-wider uppercase text-[#F7A87A] active:scale-95 transition-transform shadow-sm"
                >
                  Install App
                </button>
              )}

              <button
                onClick={toggleCameraFacing}
                disabled={appState !== "camera"}
                aria-label="Switch camera"
                className="w-8 h-8 rounded-md bg-[#FAF6EB]/95 backdrop-blur-md border border-[#F7A87A] flex items-center justify-center text-[#F7A87A] active:scale-90 transition-transform disabled:opacity-40 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
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

          {/* CLEAR DEDICATED VIEWFINDER SECTION */}
          <div className="relative w-full max-w-sm flex-1 my-2 flex flex-col items-center justify-center">
            {/* Viewfinder Outer Frame Bezel */}
            <div className="relative w-full aspect-[3/4] max-h-[64vh] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-2 border-[#FAF6EB]/40 bg-neutral-950 flex items-center justify-center">
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />

              {/* Viewfinder Corner Crop Marks [  ] */}
              <div className="absolute inset-3 pointer-events-none border border-white/10 rounded-xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#F7A87A]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#F7A87A]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#F7A87A]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#F7A87A]" />
              </div>

              {/* Viewfinder Top Status Badge */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/15 text-[10px] font-semibold tracking-widest uppercase text-white/90">
                  {appState === "countdown"
                    ? `SHOT ${currentShotIndex} OF 4`
                    : "STAND BY • 4 SHOTS"}
                </span>

                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/80 text-[10px] font-bold text-white tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  REC
                </span>
              </div>

              {/* Big Animated 3-2-1 Countdown Overlay inside the Viewfinder */}
              {appState === "countdown" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/25 pointer-events-none">
                  {countdownNumber !== null && (
                    <div
                      key={`${currentShotIndex}-${countdownNumber}`}
                      className="w-32 h-32 rounded-2xl bg-[#FAF6EB]/95 backdrop-blur-md border-2 border-[#F7A87A] flex items-center justify-center text-7xl font-black text-[#F7A87A] shadow-2xl animate-countdown-pop drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                    >
                      {countdownNumber}
                    </div>
                  )}

                  {/* Shot progress pills inside viewfinder */}
                  <div className="mt-6 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-white/20">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i < currentShotIndex
                            ? "w-6 bg-[#F7A87A]"
                            : i === currentShotIndex
                            ? "w-6 bg-white animate-pulse"
                            : "w-2 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Developing / Processing Overlay */}
              {appState === "processing" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md">
                  <div className="w-12 h-12 border-4 border-[#FAF6EB]/30 border-t-[#F7A87A] rounded-full animate-spin mb-4" />
                  <p className="text-xs font-semibold tracking-wider uppercase text-[#FAF6EB]">
                    Developing Paper Strip...
                  </p>
                </div>
              )}
            </div>

            {/* Live 4-Photo Thumbnail Strip Slots underneath viewfinder */}
            <div className="w-full max-w-sm mt-3 flex items-center justify-between gap-2 px-2">
              {[0, 1, 2, 3].map((idx) => {
                const photo = capturedPhotos[idx];
                const isCurrent = appState === "countdown" && currentShotIndex === idx + 1;
                return (
                  <div
                    key={idx}
                    className={`flex-1 aspect-[4/3] rounded-md border overflow-hidden flex items-center justify-center relative transition-all ${
                      photo
                        ? "border-[#F7A87A] shadow-xs"
                        : isCurrent
                        ? "border-[#FAF6EB] bg-white/20 animate-pulse"
                        : "border-white/15 bg-black/40"
                    }`}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={`Shot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-white/40">
                        0{idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEDICATED BOTTOM SHUTTER CONTROLS DOCK */}
          <div className="relative z-20 w-full max-w-sm pb-4 pt-1 flex flex-col items-center justify-center">
            {appState === "camera" && (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  onClick={startPhotoSequence}
                  aria-label="Take 4 photos"
                  className="w-full h-14 rounded-md bg-[#FAF6EB] border-1.5 border-[#F7A87A] flex items-center justify-center gap-3 text-sm font-semibold tracking-wider uppercase text-[#F7A87A] active:scale-98 transition-all shadow-lg hover:bg-[#F5F0DF]"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-[#F7A87A] bg-[#F7A87A]/20 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F7A87A]" />
                  </span>
                  Take 4 Photos In A Row
                </button>
                <span className="text-[10px] font-medium tracking-wide text-[#FAF6EB]/70 drop-shadow">
                  3-2-1 countdown &bull; screen flash &bull; real paper finish
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. RESULTS VIEW (Floating Real Paper Strip on Gradient Wave Background) */}
      {appState === "results" && stripResult && (
        <div className="relative w-full h-full flex flex-col bg-transparent overflow-hidden">
          {/* Top Customization Panel */}
          <div className="shrink-0 pt-2 pb-2 px-3 flex flex-col gap-2 bg-[#FAF6EB]/95 backdrop-blur-xl border-b border-[#D9D3C1] z-20 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold tracking-wider uppercase text-[#736B5E]">
                Select Frame Style
              </h2>
              {saveStatus && (
                <span className="text-[10px] font-semibold text-[#F7A87A] bg-[#FAF6EB] border border-[#F7A87A] px-2 py-0.5 rounded-md shadow-xs">
                  {saveStatus}
                </span>
              )}
            </div>

            {/* 1. Realistic Frame Styles Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-medium text-[#8F8778] tracking-wider px-1">
                Frame Style
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                {BORDER_OPTIONS.map((opt, idx) => {
                  const isActive = selectedBorder === opt.id;
                  return (
                    <div key={opt.id} className="flex items-center shrink-0">
                      <button
                        onClick={() => setSelectedBorder(opt.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all ${
                          isActive
                            ? "bg-[#F7A87A] text-[#FAF6EB] border border-[#F7A87A] font-semibold shadow-xs"
                            : "bg-[#FAF6EB] text-[#F7A87A] border border-[#F7A87A] hover:bg-[#F5F0DF]"
                        }`}
                      >
                        <span className="text-sm font-bold">{opt.icon}</span>
                        <span>{opt.name}</span>
                      </button>
                      {idx < BORDER_OPTIONS.length - 1 && (
                        <span className="h-4 w-px bg-[#D9D3C1] mx-1.5 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Instagram Filters Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-medium text-[#8F8778] tracking-wider px-1">
                Instagram Filter
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                {FILTER_OPTIONS.map((f, idx) => {
                  const isActive = selectedFilter === f.id;
                  return (
                    <div key={f.id} className="flex items-center shrink-0">
                      <button
                        onClick={() => setSelectedFilter(f.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all ${
                          isActive
                            ? "bg-[#F7A87A] text-[#FAF6EB] border border-[#F7A87A] font-semibold shadow-xs"
                            : "bg-[#FAF6EB] text-[#F7A87A] border border-[#F7A87A] hover:bg-[#F5F0DF]"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: f.previewColor }}
                        />
                        <span>{f.name}</span>
                      </button>
                      {idx < FILTER_OPTIONS.length - 1 && (
                        <span className="h-4 w-px bg-[#D9D3C1] mx-1.5 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* REALISTIC PHYSICAL PAPER PREVIEW (Fitted 100% within screen height - NO SCROLLING NEEDED) */}
          <div className="flex-1 min-h-0 w-full p-3 sm:p-4 flex items-center justify-center overflow-hidden">
            <div className="relative h-full w-full max-h-full max-w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripResult.dataUrl}
                alt="Realistic photo booth strip"
                className="max-h-full max-w-full h-auto w-auto object-contain rounded-xs select-none block transition-transform"
                style={{
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 20px 40px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.15)",
                }}
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="shrink-0 p-3 sm:p-4 bg-[#FAF6EB]/95 backdrop-blur-xl border-t border-[#D9D3C1] flex items-center gap-3 z-20 shadow-lg">
            <button
              onClick={handleRetake}
              className="flex-1 h-11 sm:h-12 rounded-md bg-[#FAF6EB] border border-[#F7A87A] text-[#F7A87A] hover:bg-[#F5F0DF] active:scale-98 transition-all flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase shadow-xs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retake
            </button>

            <button
              onClick={handleSaveOrShare}
              className="flex-[2] h-11 sm:h-12 rounded-md bg-[#F7A87A] border border-[#F7A87A] text-[#FAF6EB] hover:bg-[#F59E6C] active:scale-98 transition-all flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-[#FAF6EB]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.4"
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
        <div className="relative w-full h-full flex flex-col items-center justify-center px-6 text-center bg-black/40 backdrop-blur-md">
          <div className="w-20 h-20 rounded-2xl bg-[#FAF6EB]/90 border border-[#F7A87A] flex items-center justify-center text-[#F7A87A] mb-6 shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-9 h-9"
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

          <h2 className="text-2xl font-bold text-[#FAF6EB] mb-2 drop-shadow">Camera Access Required</h2>
          <p className="text-neutral-300 text-sm max-w-sm mb-6 leading-relaxed">
            Photo Booth needs access to your front camera to take photo strips.
          </p>

          <div className="w-full max-w-sm bg-[#FAF6EB]/95 border border-[#D9D3C1] rounded-xl p-5 text-left mb-8 space-y-3.5 text-xs text-[#736B5E] shadow-xl">
            <p className="font-semibold text-[#3D372E] text-sm">How to turn it on in Safari:</p>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-[#FAF6EB] border border-[#F7A87A] flex items-center justify-center font-bold text-[#F7A87A] shrink-0">1</span>
              <span>Tap the <strong>&quot;aA&quot;</strong> or Settings icon in Safari&apos;s address bar.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-[#FAF6EB] border border-[#F7A87A] flex items-center justify-center font-bold text-[#F7A87A] shrink-0">2</span>
              <span>Tap <strong>Website Settings</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-[#FAF6EB] border border-[#F7A87A] flex items-center justify-center font-bold text-[#F7A87A] shrink-0">3</span>
              <span>Under <strong>Camera</strong>, select <strong>Allow</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-[#FAF6EB] border border-[#F7A87A] flex items-center justify-center font-bold text-[#F7A87A] shrink-0">4</span>
              <span>Tap &quot;Try Again&quot; below or refresh this page.</span>
            </div>
          </div>

          <button
            onClick={() => startCamera(facingMode)}
            className="w-full max-w-sm h-13 rounded-md bg-[#F7A87A] border border-[#F7A87A] text-[#FAF6EB] font-bold text-sm tracking-wider uppercase active:scale-95 transition-transform shadow-lg"
          >
            Try Again
          </button>
        </div>
      )}

      {/* iOS Add to Home Screen Instructions Modal */}
      {showInstallTip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col justify-end p-4">
          <div className="w-full bg-[#FAF6EB] border border-[#D9D3C1] rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-[#FAF6EB] border border-[#F7A87A] mx-auto flex items-center justify-center text-[#F7A87A]">
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
            <h3 className="text-lg font-bold text-[#3D372E]">Install on iPhone</h3>
            <p className="text-xs text-[#736B5E] leading-relaxed">
              Install Photo Booth to your home screen to launch full screen like a native app without the Safari address bar:
            </p>
            <div className="text-left text-xs text-[#736B5E] space-y-2.5 bg-[#FAF6EB] p-4 rounded-xl border border-[#D9D3C1]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F7A87A]">1.</span>
                <span>Tap the <strong>Share</strong> button (⎙) at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F7A87A]">2.</span>
                <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F7A87A]">3.</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </div>
            </div>
            <button
              onClick={() => setShowInstallTip(false)}
              className="w-full h-12 rounded-md bg-[#F7A87A] border border-[#F7A87A] text-[#FAF6EB] font-semibold text-xs tracking-wider uppercase active:scale-95 transition-transform shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
