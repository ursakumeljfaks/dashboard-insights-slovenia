import { ArrowLeft, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center bg-background px-6 py-16"
      aria-labelledby="not-found-title"
    >
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MapPin className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Napaka 404
        </p>
        <h1 id="not-found-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Te strani ni mogoče najti
        </h1>
        <p className="mt-4 text-muted-foreground">
          Naslov <span className="break-all font-medium text-foreground">{location.pathname}</span> ne vodi do
          obstoječe strani. Vrnite se na pregled slovenskega nepremičninskega trga.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Nazaj na pregled
        </Link>
      </section>
    </div>
  );
};

export default NotFound;
