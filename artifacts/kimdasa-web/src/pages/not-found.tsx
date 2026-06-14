export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-6xl font-black uppercase tracking-tight mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page Not Found</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm text-center">
        The page you're looking for doesn't exist. Please check the URL or return to the home page.
      </p>
      <a
        href="/"
        className="bg-primary text-primary-foreground px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-primary/90 transition-colors rounded-sm"
      >
        Back to Home
      </a>
    </div>
  );
}
