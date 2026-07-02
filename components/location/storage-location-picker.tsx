"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type StorageLocationPickerOption = {
  id: string;
  code: string;
  name: string;
  type: string;
  quantity?: number;
};

type LocationKind = "cellar" | "shelf" | "other";

type ParsedLocation = StorageLocationPickerOption & {
  kind: LocationKind;
  group: string;
  line: string;
  column: string;
};

type StorageLocationPickerProps = {
  name: string;
  label: string;
  locations: StorageLocationPickerOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  compact?: boolean;
  showQuantity?: boolean;
  className?: string;
};

const selectClass =
  "h-10 min-w-0 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-cellar focus:ring-2 focus:ring-cellar/15";

function parseLocation(location: StorageLocationPickerOption): ParsedLocation {
  const cellarMatch = location.code.match(/^AD(\d+)-L(\d+)-C(\d+)$/i);

  if (cellarMatch) {
    return {
      ...location,
      kind: "cellar",
      group: cellarMatch[1],
      line: cellarMatch[2],
      column: cellarMatch[3]
    };
  }

  const shelfMatch = location.code.match(/^PR(\d+)-N(\d+)$/i);

  if (shelfMatch) {
    return {
      ...location,
      kind: "shelf",
      group: shelfMatch[1],
      line: shelfMatch[2],
      column: ""
    };
  }

  return {
    ...location,
    kind: "other",
    group: location.code,
    line: "",
    column: ""
  };
}

function numberSort(first: string, second: string): number {
  return Number(first) - Number(second) || first.localeCompare(second);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort(numberSort);
}

function optionLabel(prefix: string, value: string): string {
  return `${prefix} ${value.padStart(2, "0")}`;
}

function selectedLabel(
  location: StorageLocationPickerOption | null,
  showQuantity: boolean
): string {
  if (!location) {
    return "Selecione o local";
  }

  if (showQuantity && typeof location.quantity === "number") {
    return `${location.code} - ${location.quantity} un.`;
  }

  return location.code;
}

export function StorageLocationPicker({
  name,
  label,
  locations,
  defaultValue = "",
  value,
  onValueChange,
  required = true,
  compact = false,
  showQuantity = false,
  className = ""
}: StorageLocationPickerProps) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const selectedValue = value ?? defaultValue;
  const parsedLocations = useMemo(
    () => locations.map(parseLocation),
    [locations]
  );
  const defaultLocation = parsedLocations.find(
    (location) => location.id === selectedValue
  );
  const availableKinds = useMemo(() => {
    const currentKinds = new Set(parsedLocations.map((location) => location.kind));

    return (["cellar", "shelf", "other"] as LocationKind[]).filter((kind) =>
      currentKinds.has(kind)
    );
  }, [parsedLocations]);
  const firstKind = defaultLocation?.kind ?? availableKinds[0] ?? "cellar";
  const [kind, setKind] = useState<LocationKind>(firstKind);
  const [cellar, setCellar] = useState(
    defaultLocation?.kind === "cellar" ? defaultLocation.group : ""
  );
  const [cellarLine, setCellarLine] = useState(
    defaultLocation?.kind === "cellar" ? defaultLocation.line : ""
  );
  const [cellarColumn, setCellarColumn] = useState(
    defaultLocation?.kind === "cellar" ? defaultLocation.column : ""
  );
  const [shelf, setShelf] = useState(
    defaultLocation?.kind === "shelf" ? defaultLocation.group : ""
  );
  const [shelfLine, setShelfLine] = useState(
    defaultLocation?.kind === "shelf" ? defaultLocation.line : ""
  );
  const [otherId, setOtherId] = useState(
    defaultLocation?.kind === "other" ? defaultLocation.id : ""
  );
  const [validationMessage, setValidationMessage] = useState("");

  const cellars = parsedLocations.filter((location) => location.kind === "cellar");
  const shelves = parsedLocations.filter((location) => location.kind === "shelf");
  const others = parsedLocations.filter((location) => location.kind === "other");
  const cellarOptions = uniqueSorted(cellars.map((location) => location.group));
  const cellarLineOptions = uniqueSorted(
    cellars
      .filter((location) => location.group === cellar)
      .map((location) => location.line)
  );
  const cellarColumnOptions = uniqueSorted(
    cellars
      .filter(
        (location) =>
          location.group === cellar && location.line === cellarLine
      )
      .map((location) => location.column)
  );
  const shelfOptions = uniqueSorted(shelves.map((location) => location.group));
  const shelfLineOptions = uniqueSorted(
    shelves
      .filter((location) => location.group === shelf)
      .map((location) => location.line)
  );
  const selectedLocation =
    kind === "cellar"
      ? cellars.find(
          (location) =>
            location.group === cellar &&
            location.line === cellarLine &&
            location.column === cellarColumn
        ) ?? null
      : kind === "shelf"
        ? shelves.find(
            (location) =>
              location.group === shelf && location.line === shelfLine
          ) ?? null
        : others.find((location) => location.id === otherId) ?? null;

  useEffect(() => {
    if (!defaultLocation) {
      return;
    }

    setKind(defaultLocation.kind);

    if (defaultLocation.kind === "cellar") {
      setCellar(defaultLocation.group);
      setCellarLine(defaultLocation.line);
      setCellarColumn(defaultLocation.column);
    } else if (defaultLocation.kind === "shelf") {
      setShelf(defaultLocation.group);
      setShelfLine(defaultLocation.line);
    } else {
      setOtherId(defaultLocation.id);
    }
  }, [defaultLocation]);

  useEffect(() => {
    const form = hiddenInputRef.current?.form;

    if (!form || !required) {
      return;
    }

    function handleSubmit(event: Event) {
      if (!hiddenInputRef.current?.value) {
        event.preventDefault();
        setValidationMessage("Selecione um local completo.");
      }
    }

    form.addEventListener("submit", handleSubmit);

    return () => form.removeEventListener("submit", handleSubmit);
  }, [required]);

  useEffect(() => {
    if (selectedLocation) {
      setValidationMessage("");
    }

    onValueChange?.(selectedLocation?.id ?? "");
  }, [onValueChange, selectedLocation]);

  function changeKind(nextKind: LocationKind) {
    setKind(nextKind);
    setValidationMessage("");

    if (nextKind === "cellar") {
      setCellar("");
      setCellarLine("");
      setCellarColumn("");
    } else if (nextKind === "shelf") {
      setShelf("");
      setShelfLine("");
    } else {
      setOtherId("");
    }
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={selectedLocation?.id ?? ""}
        readOnly
      />
      <span
        className={
          compact
            ? "mb-1 block text-xs font-medium text-stone-600"
            : "mb-1 block text-sm font-medium text-stone-700"
        }
      >
        {label}
      </span>
      <div className="space-y-2 rounded-md border border-stone-200 bg-stone-50 p-2">
        {availableKinds.length > 1 ? (
          <div className="grid grid-cols-2 gap-2">
            {availableKinds.map((availableKind) => (
              <button
                key={availableKind}
                type="button"
                onClick={() => changeKind(availableKind)}
                className={
                  kind === availableKind
                    ? "h-9 rounded-md bg-cellar px-3 text-sm font-semibold text-white"
                    : "h-9 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                }
              >
                {availableKind === "cellar"
                  ? "Adega"
                  : availableKind === "shelf"
                    ? "Prateleira"
                    : "Outros"}
              </button>
            ))}
          </div>
        ) : null}

        {kind === "cellar" ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={cellar}
              onChange={(event) => {
                setCellar(event.target.value);
                setCellarLine("");
                setCellarColumn("");
              }}
              className={selectClass}
            >
              <option value="">Adega</option>
              {cellarOptions.map((value) => (
                <option key={value} value={value}>
                  {optionLabel("Adega", value)}
                </option>
              ))}
            </select>
            <select
              value={cellarLine}
              onChange={(event) => {
                setCellarLine(event.target.value);
                setCellarColumn("");
              }}
              disabled={!cellar}
              className={selectClass}
            >
              <option value="">Linha</option>
              {cellarLineOptions.map((value) => (
                <option key={value} value={value}>
                  {optionLabel("Linha", value)}
                </option>
              ))}
            </select>
            <select
              value={cellarColumn}
              onChange={(event) => setCellarColumn(event.target.value)}
              disabled={!cellarLine}
              className={selectClass}
            >
              <option value="">Coluna</option>
              {cellarColumnOptions.map((value) => (
                <option key={value} value={value}>
                  {optionLabel("Coluna", value)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === "shelf" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={shelf}
              onChange={(event) => {
                setShelf(event.target.value);
                setShelfLine("");
              }}
              className={selectClass}
            >
              <option value="">Prateleira</option>
              {shelfOptions.map((value) => (
                <option key={value} value={value}>
                  {optionLabel("Prateleira", value)}
                </option>
              ))}
            </select>
            <select
              value={shelfLine}
              onChange={(event) => setShelfLine(event.target.value)}
              disabled={!shelf}
              className={selectClass}
            >
              <option value="">Linha</option>
              {shelfLineOptions.map((value) => (
                <option key={value} value={value}>
                  {optionLabel("Linha", value)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === "other" ? (
          <select
            value={otherId}
            onChange={(event) => setOtherId(event.target.value)}
            className={selectClass}
          >
            <option value="">Local</option>
            {others.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} - {location.name}
              </option>
            ))}
          </select>
        ) : null}

        <div className="flex min-h-8 items-center rounded-md bg-white px-3 py-1 text-sm font-medium text-stone-700">
          {selectedLabel(selectedLocation, showQuantity)}
        </div>
      </div>
      {validationMessage ? (
        <p className="mt-1 text-xs font-medium text-red-700">
          {validationMessage}
        </p>
      ) : null}
    </div>
  );
}
