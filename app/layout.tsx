import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "A Hora do Vinho | Estoque",
  description: "Gestao de estoque e localizacao da A Hora do Vinho.",
  icons: {
    icon: "/brand/logo-a-hora-do-vinho.webp"
  }
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
