"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { contactsApi, PlanLimitError, ApiError } from "@/lib/api";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

interface Props {
  workspaceId: string;
  onClose: (didImport: boolean) => void;
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export default function CSVImportModal({ workspaceId, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planLimitError, setPlanLimitError] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
    setPlanLimitError(false);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = await getAccessToken();
      const data = await contactsApi.importCsv(token, workspaceId, file);
      setResult(data);
    } catch (e) {
      if (e instanceof PlanLimitError) {
        setPlanLimitError(true);
        setError(
          `Contact limit reached (${e.current}/${e.limit}). Upgrade to Pro for unlimited contacts.`
        );
      } else {
        setError(
          e instanceof ApiError ? e.message : "Import failed. Please check your file and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose(result !== null && result.imported > 0);
  }

  const hasResult = result !== null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md mx-4 border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Import contacts from CSV</h2>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Format hint */}
          <div className="rounded-md bg-muted/60 border border-border px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Expected CSV columns</p>
            <p>
              <span className="font-medium text-foreground">name</span> (required),{" "}
              job_title, company, email, phone, linkedin_url, notes
            </p>
            <p>The first row must be a header row with column names.</p>
          </div>

          {/* File picker */}
          {!hasResult && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                CSV file
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-3 file:py-1.5 file:px-3
                  file:rounded-md file:border file:border-border
                  file:text-sm file:font-medium file:text-foreground
                  file:bg-background file:cursor-pointer
                  hover:file:bg-accent file:transition-colors"
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="text-foreground font-medium">{file.name}</span>{" "}
                  ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-destructive space-y-1">
              <p>{error}</p>
              {planLimitError && (
                <Link href="/plans" className="underline hover:opacity-75 transition-opacity">
                  View plans
                </Link>
              )}
            </div>
          )}

          {/* Results */}
          {hasResult && (
            <div className="space-y-3">
              {/* Summary row */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-md bg-muted/60 border border-border px-4 py-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{result.imported}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">imported</p>
                </div>
                <div className="flex-1 rounded-md bg-muted/60 border border-border px-4 py-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">skipped</p>
                </div>
                <div className="flex-1 rounded-md bg-muted/60 border border-border px-4 py-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{result.errors.length === 1 ? "error" : "errors"}</p>
                </div>
              </div>

              {/* Per-row errors */}
              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Row errors</p>
                  <div className="overflow-y-auto max-h-[200px] rounded-md border border-border divide-y divide-border">
                    {result.errors.map((err, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">Row {err.row}:</span>{" "}
                        <span className="text-muted-foreground">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.imported > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.imported} {result.imported === 1 ? "contact was" : "contacts were"} added to your workspace.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          {!hasResult ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading || !file}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Importing…" : "Import"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
