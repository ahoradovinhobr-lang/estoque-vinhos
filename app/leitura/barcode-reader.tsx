"use client";

import { Camera, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ScanControls = {
  stop: () => void;
};

type CameraState = "idle" | "starting" | "scanning";
type BarcodeSource = "input" | "camera";

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Acesso a camera negado pelo navegador.";
    }

    if (error.name === "NotFoundError") {
      return "Nenhuma camera disponivel neste dispositivo.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel iniciar a camera.";
}

export function BarcodeReader({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScanControls | null>(null);
  const lastDecodedRef = useRef("");
  const [code, setCode] = useState(initialCode);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("idle");
    focusInput();
  }

  function goToCode(value: string, source: BarcodeSource) {
    const normalized = value.trim();

    setCode(normalized);

    if (!normalized) {
      router.push("/leitura");
      focusInput();
      return;
    }

    router.push(
      `/leitura?codigo=${encodeURIComponent(normalized)}&fonte=${source}`
    );
  }

  async function startCamera() {
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera indisponivel neste navegador.");
      focusInput();
      return;
    }

    if (!videoRef.current) {
      setErrorMessage("Leitor de camera indisponivel.");
      focusInput();
      return;
    }

    try {
      lastDecodedRef.current = "";
      setCameraState("starting");

      const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatOneDReader();
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" }
          }
        },
        videoRef.current,
        (result) => {
          const decoded = result?.getText().trim() ?? "";

          if (!decoded || decoded === lastDecodedRef.current) {
            return;
          }

          lastDecodedRef.current = decoded;
          stopCamera();
          goToCode(decoded, "camera");
        }
      );

      controlsRef.current = controls;
      setCameraState("scanning");
    } catch (error) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraState("idle");
      setErrorMessage(cameraErrorMessage(error));
      focusInput();
    }
  }

  useEffect(() => {
    setCode(initialCode);
    focusInput();
  }, [initialCode]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <section className="rounded-md border border-stone-200 bg-white p-4">
      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          stopCamera();
          goToCode(code, "input");
        }}
      >
        <label>
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Codigo de barras
          </span>
          <input
            ref={inputRef}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            placeholder="Escaneie ou digite o codigo"
            className="h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          />
        </label>
        <div className="flex items-end">
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cellar px-4 text-sm font-semibold text-white hover:bg-[#4f2733] lg:w-auto">
            <Search aria-hidden className="h-4 w-4" />
            Buscar
          </button>
        </div>
        <div className="flex items-end">
          {cameraState === "idle" ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 lg:w-auto"
            >
              <Camera aria-hidden className="h-4 w-4" />
              Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 lg:w-auto"
            >
              <X aria-hidden className="h-4 w-4" />
              Parar
            </button>
          )}
        </div>
      </form>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div
        className={
          cameraState === "idle"
            ? "hidden"
            : "mt-4 overflow-hidden rounded-md border border-stone-200 bg-stone-950"
        }
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full object-cover"
        />
        <div className="border-t border-stone-800 px-3 py-2 text-sm text-stone-100">
          {cameraState === "starting" ? "Abrindo camera..." : "Lendo codigo..."}
        </div>
      </div>
    </section>
  );
}
