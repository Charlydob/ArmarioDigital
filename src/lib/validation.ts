import { z } from "zod";

export const zones = ["HEAD", "TORSO", "LEGS", "FEET", "ACCESSORY"] as const;
export const garmentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  brand: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  zone: z.enum(zones),
  subtype: z.string().trim().min(1).max(50),
  status: z.enum(["OWNED", "WISHLIST"]),
});

export const outfitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional(),
  poseId: z.string().min(1).nullable(),
  items: z.array(z.object({
    garmentId: z.string().min(1), zone: z.enum(zones), layerOrder: z.number().int().min(0),
    x: z.number().finite(), y: z.number().finite(), scaleX: z.number().min(.05).max(8), scaleY: z.number().min(.05).max(8),
    rotation: z.number().min(-180).max(180), opacity: z.number().min(.05).max(1),
  })).max(100),
}).superRefine((outfit, context) => {
  const seen = new Set<string>();
  outfit.items.forEach((item, index) => {
    if (seen.has(item.garmentId)) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "garmentId"],
        message: "Una prenda no puede repetirse en el mismo conjunto",
      });
    }
    seen.add(item.garmentId);
  });
});

export const realPhotoOutfitSchema = z.object({
  name: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  garmentIds: z.array(z.string().min(1)).max(100).default([]),
});
