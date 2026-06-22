type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/brand/logo-a-hora-do-vinho.webp"
      alt="A Hora do Vinho"
      className={className}
    />
  );
}
