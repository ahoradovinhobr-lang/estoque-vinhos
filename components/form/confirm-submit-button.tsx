"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  message: string;
  className: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  message,
  className,
  children
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
