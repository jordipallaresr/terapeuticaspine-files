// Logo de Terapeutica Spine (mismo icono que el favicon de terapeuticaspine.com):
// cuadrado teal con cruz médica blanca. Se renderiza inline para escalar nítido.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0e7490" />
      <path
        d="M27 12h10a2 2 0 0 1 2 2v11h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H39v11a2 2 0 0 1-2 2H27a2 2 0 0 1-2-2V39H14a2 2 0 0 1-2-2V27a2 2 0 0 1 2-2h11V14a2 2 0 0 1 2-2Z"
        fill="#ffffff"
      />
    </svg>
  );
}
