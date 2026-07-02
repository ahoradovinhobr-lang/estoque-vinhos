"use client";

import { Camera, Focus, Search, X, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ScanControls = {
  stop: () => void;
};

type CameraState = "idle" | "starting" | "scanning";
type BarcodeSource = "input" | "camera";

type CameraCapabilities = {
  canTorch: boolean;
  canZoom: boolean;
  maxZoom: number;
  minZoom: number;
  stepZoom: number;
};

type ExtendedMediaTrackCapabilities = MediaTrackCapabilities & {
  exposureMode?: string[];
  focusMode?: string[];
  torch?: boolean;
  whiteBalanceMode?: string[];
  zoom?: {
    max: number;
    min: number;
    step?: number;
  };
};

type ExtendedMediaTrackConstraintSet = MediaTrackConstraintSet & {
  exposureMode?: string;
  focusMode?: string;
  torch?: boolean;
  whiteBalanceMode?: string;
  zoom?: number;
};

const emptyCameraCapabilities: CameraCapabilities = {
  canTorch: false,
  canZoom: false,
  maxZoom: 1,
  minZoom: 1,
  stepZoom: 0.1
};

function looksLikeBarcode(value: string): boolean {
  const normalized = value.replace(/\s+/g, "");
  return /^\d{6,}$/.test(normalized);
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Acesso a camera negado. Verifique a permissao da camera e use o endereco HTTPS do app no celular.";
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

function secureCameraUrl(): string {
  const host = window.location.hostname;

  if (!host) {
    return "o endereco HTTPS do app";
  }

  const path = window.location.pathname || "/leitura";
  const search = window.location.search || "";

  return `https://${host}:3443${path}${search}`;
}

export function BarcodeReader({
  initialValue
}: {
  initialValue: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScanControls | null>(null);
  const lastDecodedRef = useRef("");
  const [term, setTerm] = useState(initialValue);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraCapabilities, setCameraCapabilities] =
    useState<CameraCapabilities>(emptyCameraCapabilities);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraCapabilities(emptyCameraCapabilities);
    setCameraState("idle");
    setTorchEnabled(false);
    focusInput();
  }

  function activeVideoTrack(): MediaStreamTrack | null {
    const stream = videoRef.current?.srcObject;

    if (!(stream instanceof MediaStream)) {
      return null;
    }

    return stream.getVideoTracks()[0] ?? null;
  }

  async function tuneCamera({
    nextTorch,
    nextZoom
  }: {
    nextTorch?: boolean;
    nextZoom?: number;
  } = {}) {
    const track = activeVideoTrack();

    if (!track) {
      return;
    }

    const capabilities =
      track.getCapabilities() as ExtendedMediaTrackCapabilities;
    const advanced: ExtendedMediaTrackConstraintSet[] = [];

    if (capabilities.focusMode?.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    } else if (capabilities.focusMode?.includes("single-shot")) {
      advanced.push({ focusMode: "single-shot" });
    }

    if (capabilities.exposureMode?.includes("continuous")) {
      advanced.push({ exposureMode: "continuous" });
    }

    if (capabilities.whiteBalanceMode?.includes("continuous")) {
      advanced.push({ whiteBalanceMode: "continuous" });
    }

    const canZoom = Boolean(capabilities.zoom);
    const minZoom = capabilities.zoom?.min ?? 1;
    const maxZoom = capabilities.zoom?.max ?? 1;
    const stepZoom = capabilities.zoom?.step ?? 0.1;
    const requestedZoom =
      nextZoom ??
      (canZoom ? Math.min(maxZoom, Math.max(minZoom, 1.6)) : zoomLevel);

    if (canZoom) {
      advanced.push({
        zoom: Math.min(maxZoom, Math.max(minZoom, requestedZoom))
      });
    }

    if (capabilities.torch && nextTorch !== undefined) {
      advanced.push({ torch: nextTorch });
    }

    if (advanced.length > 0) {
      await track.applyConstraints({ advanced });
    }

    setCameraCapabilities({
      canTorch: Boolean(capabilities.torch),
      canZoom,
      maxZoom,
      minZoom,
      stepZoom
    });

    if (canZoom) {
      setZoomLevel(Math.min(maxZoom, Math.max(minZoom, requestedZoom)));
    }

    if (capabilities.torch && nextTorch !== undefined) {
      setTorchEnabled(nextTorch);
    }
  }

  async function retuneFocus() {
    try {
      await tuneCamera();
    } catch {
      setErrorMessage(
        "Este aparelho nao permite ajuste manual de foco pelo navegador. Afaste um pouco a camera e mantenha o codigo bem iluminado."
      );
    }
  }

  async function changeZoom(value: number) {
    try {
      await tuneCamera({ nextZoom: value });
    } catch {
      setErrorMessage("Nao foi possivel ajustar o zoom da camera.");
    }
  }

  async function toggleTorch() {
    try {
      await tuneCamera({ nextTorch: !torchEnabled });
    } catch {
      setErrorMessage("Nao foi possivel alterar a lanterna da camera.");
    }
  }

  function goToValue(value: string, source: BarcodeSource) {
    const normalized = value.trim();
    const params = new URLSearchParams();

    setTerm(normalized);

    if (!normalized) {
      const queryString = params.toString();

      router.push(queryString ? `/leitura?${queryString}` : "/leitura");
      focusInput();
      return;
    }

    if (source === "input" && !looksLikeBarcode(normalized)) {
      params.set("q", normalized);
      router.push(`/leitura?${params.toString()}`);
      return;
    }

    params.set("codigo", normalized);
    params.set("fonte", source);
    router.push(`/leitura?${params.toString()}`);
  }

  async function startCamera() {
    setErrorMessage(null);

    if (!window.isSecureContext) {
      setErrorMessage(
        `No celular, a camera exige HTTPS. Acesse ${secureCameraUrl()} para usar a leitura por camera.`
      );
      focusInput();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Camera indisponivel neste navegador. Use Chrome, Safari ou Edge atualizado pelo endereco HTTPS do app."
      );
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
            facingMode: { ideal: "environment" },
            height: { ideal: 1080 },
            width: { ideal: 1920 }
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
          goToValue(decoded, "camera");
        }
      );

      controlsRef.current = controls;
      await tuneCamera();
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
    setTerm(initialValue);
    focusInput();
  }, [initialValue]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <section className="rounded-md border border-cellar/25 bg-white p-4 shadow-sm">
      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          stopCamera();
          goToValue(term, "input");
        }}
      >
        <label>
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Busca ou codigo de barras
          </span>
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            autoFocus
            type="search"
            autoComplete="off"
            placeholder="Bipar, digitar nome, uva, pais, fornecedor ou codigo"
            className="h-12 w-full rounded-md border border-stone-300 px-3 text-base outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15"
          />
        </label>
        <div className="flex items-end">
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-cellar px-5 text-base font-semibold text-white hover:bg-cellarDark lg:w-auto"
          >
            <Search aria-hidden className="h-4 w-4" />
            Buscar
          </button>
        </div>
        <div className="flex items-end">
          {cameraState === "idle" ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 text-base font-medium text-stone-700 hover:bg-stone-50 lg:w-auto"
            >
              <Camera aria-hidden className="h-4 w-4" />
              Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 text-base font-medium text-stone-700 hover:bg-stone-50 lg:w-auto"
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

      {cameraState !== "idle" ? (
        <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={retuneFocus}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              <Focus aria-hidden className="h-4 w-4" />
              Ajustar foco
            </button>
            {cameraCapabilities.canTorch ? (
              <button
                type="button"
                onClick={toggleTorch}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                {torchEnabled ? (
                  <ZapOff aria-hidden className="h-4 w-4" />
                ) : (
                  <Zap aria-hidden className="h-4 w-4" />
                )}
                {torchEnabled ? "Desligar luz" : "Ligar luz"}
              </button>
            ) : null}
          </div>
          {cameraCapabilities.canZoom ? (
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Zoom da camera
              </span>
              <input
                type="range"
                min={cameraCapabilities.minZoom}
                max={cameraCapabilities.maxZoom}
                step={cameraCapabilities.stepZoom}
                value={zoomLevel}
                onChange={(event) => changeZoom(Number(event.target.value))}
                className="w-full accent-cellar"
              />
            </label>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">
            Para codigos pequenos, mantenha a garrafa a 15-30 cm da camera e use
            o zoom se o aparelho permitir.
          </p>
        </div>
      ) : null}
    </section>
  );
}
