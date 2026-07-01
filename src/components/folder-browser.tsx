"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Folder,
  FolderSearch,
  Loader2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Maximum number of patients shown per page. */
const PAGE_SIZE = 50;

/** Removes accents/diacritics and lowercases to compare without accents. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** First letter of each word uppercase, the rest lowercase. */
function titleCase(s: string): string {
  return s
    .toLocaleLowerCase("es")
    .replace(/(^|[\s\-/.,(])(\p{L})/gu, (_m, sep, ch) =>
      sep + ch.toLocaleUpperCase("es"),
    );
}

export function FolderBrowser({ folders }: { folders: string[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return folders;
    return folders.filter((f) => normalize(f).includes(q));
  }, [folders, query]);

  // Clamp instead of trusting `page`: the filtered list can shrink (e.g. while
  // typing a search) and leave `page` pointing past the last page.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
    // Bring the top of the list back into view after switching pages.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDownload(folder: string) {
    if (downloading) return; // prevents double click / overlapping downloads
    setDownloading(folder);

    const url = `/api/download?prefix=${encodeURIComponent(folder)}`;
    // Navigating to a response with Content-Disposition: attachment triggers the
    // download without leaving the page.
    window.location.href = url;

    // There's no reliable "download started" event; we clear the state after a
    // delay so the user sees the feedback.
    window.setTimeout(() => {
      setDownloading((cur) => (cur === folder ? null : cur));
    }, 5000);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          inputMode="search"
          autoFocus
          placeholder="Buscar paciente…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // A new search invalidates the current position in the results.
            setPage(1);
          }}
          className="h-11 pl-9 text-base"
          aria-label="Buscar paciente"
        />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length === folders.length
          ? `${folders.length.toLocaleString("es")} pacientes`
          : `${filtered.length.toLocaleString("es")} de ${folders.length.toLocaleString("es")} pacientes`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {pageItems.map((folder) => {
            const isDownloading = downloading === folder;
            const isDisabled = downloading !== null && !isDownloading;
            return (
              <li key={folder}>
                <button
                  type="button"
                  onClick={() => handleDownload(folder)}
                  disabled={downloading !== null}
                  aria-busy={isDownloading}
                  className={cn(
                    "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    "disabled:cursor-not-allowed",
                    isDisabled && "opacity-50",
                  )}
                >
                  <Folder className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {titleCase(folder)}
                  </span>
                  {isDownloading ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Preparando…
                    </span>
                  ) : (
                    <Download className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Paginación de pacientes"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft />
            Anterior
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Página {currentPage.toLocaleString("es")} de{" "}
            {totalPages.toLocaleString("es")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <FolderSearch className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No hay resultados</p>
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? `Ningún paciente coincide con «${query.trim()}».`
            : "No hay pacientes disponibles."}
        </p>
      </div>
    </div>
  );
}
