"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Two-step direct-to-storage upload: 1) ask the server for a signed upload
 * URL (this app's API route checks the caller is an institution_admin and
 * points at the exact storage path — see app/api/portal/logo-upload/route.ts),
 * 2) upload the file's bytes directly to Supabase Storage from the browser.
 * The file never passes through this app's server, which is what makes
 * larger files practical (not just tiny logos).
 */
export default function LogoUpload({
  institutionId,
  currentLogoUrl,
  compact = false,
}: {
  institutionId: string;
  currentLogoUrl: string | null;
  /** Sidebar placement (PortalShell's logoUpload slot): smaller, light-on-dark text. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/portal/logo-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, fileName: file.name }),
      });
      if (!signRes.ok) {
        setError("Upload failed. Please try again.");
        return;
      }
      const { path, token } = (await signRes.json()) as { path: string; token: string };
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from("institution-logos")
        .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
      if (uploadErr) {
        setError("Upload failed. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.68rem", letterSpacing: "0.4px", color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
          {currentLogoUrl ? "CHANGE LOGO" : "UPLOAD LOGO"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 6, fontSize: "0.72rem", color: "rgba(255,255,255,0.7)" }}
            disabled={uploading}
          />
        </label>
        {uploading && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>Uploading…</span>}
        {error && <span style={{ color: "#f28b82", fontSize: "0.72rem" }}>{error}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {currentLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentLogoUrl} alt="Current logo" style={{ height: 44, width: "auto", borderRadius: 8 }} />
      )}
      <label>
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} disabled={uploading} />
      </label>
      {uploading && <span className="muted">Uploading…</span>}
      {error && <span style={{ color: "#c0392b" }}>{error}</span>}
    </div>
  );
}
