export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="planta">
              🌱
            </span>
            <span className="text-sm font-semibold text-foreground">
              Bonzai Payments
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bonzai Marketplace. Proyecto IAW 2026.
          </p>
        </div>
      </div>
    </footer>
  );
}
