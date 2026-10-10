import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    code: v.string(), // e.g. "0001-SOP-ENG-CTO-IX-2026"
    seqNumber: v.number(),
    typeCode: v.string(), // SOP, WIK, MNL, KB
    divisionCode: v.string(), // GNR, ENG, OPR, FNC
    approverCode: v.string(), // CEO, CTO, COO, CFO, MNG, SPV
    monthRoman: v.string(),
    year: v.number(),
    
    title: v.string(),
    description: v.optional(v.string()),
    revision: v.number(),
    status: v.string(), // Draft, In Review, Approved, Published, Archived
    
    createdBy: v.string(),
    approvedBy: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
    issueDate: v.string(),
    
    // File storage (Convex storage ID, original name, size, type)
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
    driveFolderId: v.optional(v.string()),
    driveFolderUrl: v.optional(v.string()),
    isFixed: v.optional(v.boolean()),
    
    // Legacy / Backdating flag
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
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_type", ["typeCode"])
    .index("by_division", ["divisionCode"])
    .index("by_status", ["status"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
