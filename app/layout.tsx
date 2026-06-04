import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Estoque Vinhos",
  description: "Gestao de estoque e localizacao para loja de vinhos."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
