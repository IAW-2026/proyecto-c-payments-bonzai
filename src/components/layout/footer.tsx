export function Footer() {
  return (
    <footer className="mt-auto bg-surface-low pb-24">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-headline-md text-primary">
              Bonzai
            </span>
            <span className="text-label-sm text-on-surface-muted">
              Payments
            </span>
          </div>
          <p className="text-body-sm text-on-surface-muted">
            © {new Date().getFullYear()} Bonzai Marketplace. Proyecto IAW 2026.
          </p>
        </div>
      </div>
    </footer>
  );
}
