"use client";
import { useState } from "react";
import OutfitBuilderLoader from "@/components/OutfitBuilderLoader";
import FavoriteGrid from "@/components/FavoriteGrid";
import PwaRegister from "@/components/PwaRegister";
import { defaultAnchors } from "@/lib/labels";
export default function MobileFixture() {
  const [favorites] = useState<Record<string, boolean>>(() => typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem("fixture-favorites") || "{}"));
  const garments = Array.from({length: 9}, (_, i) => ({id: `top-${i}`, name: `Camiseta ${i}`, brand: `Marca ${i}`, favorite: favorites[`garment/top-${i}`] || false, zone: "TORSO", subtype: "TSHIRT", status: "OWNED", mediaId: `top-${i}`, thumbId: `top-${i}`, placements: [{poseId: "pose", x: 430, y: 480, scaleX: .52, scaleY: .58, rotation: 3, opacity: 1}]}));
  return <main style={{padding: 8}}><PwaRegister/><OutfitBuilderLoader data={{userId: "fixture", poses: [{ id: "pose", name: "Pose", favorite: favorites["pose/pose"] || false, mediaId: "pose", anchors: defaultAnchors }], garments, outfit: null, aiTryOnEnabled: false}}/>
    <FavoriteGrid kind="outfit" entries={[{id: "outfit", favorite: favorites["outfit/outfit"] || false, content: <article className="card">Conjunto de prueba</article>}]}/>
  </main>;
}
