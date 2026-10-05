"use client";
import dynamic from "next/dynamic";
import type { OutfitBuilderData } from "./OutfitBuilder";
const OutfitBuilder=dynamic(()=>import("./OutfitBuilder"),{ssr:false,loading:()=> <div className="empty">Preparando el probador…</div>});
export default function OutfitBuilderLoader({data}:{data:OutfitBuilderData}){return <OutfitBuilder {...data}/>}
