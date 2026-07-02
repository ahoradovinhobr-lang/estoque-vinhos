"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import clsx from "clsx";

type ProductPhotoProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function ProductPhoto({ src, alt, className }: ProductPhotoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-white",
        className
      )}
    >
      {showImage ? (
        <img
          src={src ?? ""}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <ImageIcon aria-hidden className="h-5 w-5 text-stone-400" />
      )}
    </div>
  );
}
