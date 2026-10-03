import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all documents sorted by creation date descending
 */
export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("documents").order("desc").collect();
  },
});

/**
 * Find document by unique code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();
  },
});

/**
 * Create a new document with strict 1-code-1-doc uniqueness validation
 */
export const createDocument = mutation({
  args: {
    code: v.string(),
    seqNumber: v.number(),
    typeCode: v.string(),
    divisionCode: v.string(),
    approverCode: v.string(),
    monthRoman: v.string(),
    year: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    revision: v.number(),
    status: v.string(),
    createdBy: v.string(),
    approvedBy: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
    issueDate: v.string(),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
    isManualCode: v.optional(v.boolean()),
    legacyNotes: v.optional(v.string()),
    revisions: v.array(
      v.object({
        revision: v.number(),
        date: v.string(),
        description: v.string(),
        revisedBy: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase();

    // 1 KODE HANYA BERLAKU UNTUK 1 DOKUMEN SAJA
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing) {
      throw new Error(
        `Kode dokumen "${normalizedCode}" sudah digunakan untuk dokumen "${existing.title}". 1 kode surat hanya boleh untuk 1 dokumen.`
      );
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("documents", {
      ...args,
      code: normalizedCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing document
 */
export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    code: v.string(),
    seqNumber: v.number(),
    typeCode: v.string(),
    divisionCode: v.string(),
    approverCode: v.string(),
    monthRoman: v.string(),
    year: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    revision: v.number(),
    status: v.string(),
    createdBy: v.string(),
    approvedBy: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
    issueDate: v.string(),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
    isManualCode: v.optional(v.boolean()),
    legacyNotes: v.optional(v.string()),
    revisions: v.array(
      v.object({
        revision: v.number(),
        date: v.string(),
        description: v.string(),
        revisedBy: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const normalizedCode = data.code.trim().toUpperCase();

    // Verify uniqueness excluding current document
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing && existing._id !== id) {
      throw new Error(
        `Kode dokumen "${normalizedCode}" sudah dipakai oleh dokumen lain (${existing.title}).`
      );
    }

    await ctx.db.patch(id, {
      ...data,
      code: normalizedCode,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Delete document
 */
export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Generate upload URL for file storage in Convex
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
