import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { supabase } from "../lib/supabase";
import { requireAuth } from "./middleware";
import { z } from "zod";

const router = Router();
const BUCKET = "deal-documents";
const DOWNLOAD_TTL = 60 * 60; // 1h signed download links

// ---------------------------------------------------------------------------
// Deal documents (LOIs, etc.) backed by Supabase Storage. Upload uses a signed
// upload URL: the server (service role) issues a one-time URL the client PUTs
// the file to, then records the row. Downloads are short-lived signed URLs.
// The bucket is private; all access is service-role-mediated.
// ---------------------------------------------------------------------------

function storageOrError(res: Response): NonNullable<typeof supabase> | null {
  if (!supabase) {
    res.status(503).json({ error: "Document storage is not configured (SUPABASE_URL / service role key)." });
    return null;
  }
  return supabase;
}

const safe = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";

// Issue a signed upload URL for a new document on this deal.
router.post("/api/deals/:id/documents/sign", requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = storageOrError(res);
    if (!sb) return;
    const { tenantId } = (req as any).ctx;
    const { fileName } = z.object({ fileName: z.string().min(1), mimeType: z.string().optional() }).parse(req.body);

    const deal = await storage.getUserPropertyById(tenantId, req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const path = `${tenantId}/${req.params.id}/${randomUUID()}-${safe(fileName)}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return res.status(500).json({ error: error?.message || "Could not create upload URL" });

    res.json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ error: "fileName is required" });
    console.error("Sign document upload error:", error);
    res.status(500).json({ error: error.message || "Failed to sign upload" });
  }
});

// Record a document after the client has uploaded it to `path`.
router.post("/api/deals/:id/documents", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;
    const body = z
      .object({
        path: z.string().min(1),
        fileName: z.string().min(1),
        mimeType: z.string().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        documentType: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const deal = await storage.getUserPropertyById(tenantId, req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const doc = await storage.createDocument({
      userPropertyId: req.params.id,
      tenantId,
      userId,
      documentType: body.documentType || "document",
      fileName: body.fileName,
      fileUrl: body.path, // storage path; downloads use signed URLs
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      notes: body.notes,
    });
    res.status(201).json(doc);
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ error: error.errors?.[0]?.message || "Invalid document" });
    console.error("Record document error:", error);
    res.status(500).json({ error: error.message || "Failed to record document" });
  }
});

// List documents for a deal, each with a short-lived signed download URL.
router.get("/api/deals/:id/documents", requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = storageOrError(res);
    if (!sb) return;
    const { tenantId } = (req as any).ctx;
    const docs = await storage.listDocuments(tenantId, req.params.id);
    const withUrls = await Promise.all(
      docs.map(async (d) => {
        const { data } = await sb.storage.from(BUCKET).createSignedUrl(d.fileUrl, DOWNLOAD_TTL);
        return { ...d, downloadUrl: data?.signedUrl ?? null };
      }),
    );
    res.json({ documents: withUrls });
  } catch (error: any) {
    console.error("List documents error:", error);
    res.status(500).json({ error: error.message || "Failed to list documents" });
  }
});

// Delete a document (storage object + row).
router.delete("/api/deals/:id/documents/:docId", requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = storageOrError(res);
    if (!sb) return;
    const { tenantId } = (req as any).ctx;
    const doc = await storage.getDocument(tenantId, req.params.docId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await sb.storage.from(BUCKET).remove([doc.fileUrl]);
    await storage.deleteDocument(tenantId, req.params.docId);
    res.json({ deleted: true });
  } catch (error: any) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: error.message || "Failed to delete document" });
  }
});

export default router;
