import { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, PerspectiveCamera, Html, useTexture, ContactShadows, Sky, Stars } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, Vignette, ToneMapping, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { Wand2, RotateCcw, Loader2, Box, Home, Check, ChevronDown, ChevronRight, Settings2, Camera, Sun, Sunset, Moon, Download, Layers, Building2, MessageSquare, Send, DollarSign, ExternalLink, MapPin, Search, X, Sparkles, ZoomIn } from "lucide-react";

// ─── Product Catalogs ─────────────────────────────────────────────────────────

interface Product {
  id: string;
  brand: string;
  name: string;
  detail: string;
  matType: string;
  suggestedColors?: string[];
}

const SIDING_PRODUCTS: Product[] = [
  { id: "hardie_lap",    brand: "James Hardie", name: "HardiePlank®",        detail: "Lap siding — fibrocemento",   matType: "hardie",  suggestedColors: ["#E8D5B7","#F4F1EC","#8A8A8A","#4A6741","#8B3A3A"] },
  { id: "hardie_shake",  brand: "James Hardie", name: "HardieShingle®",      detail: "Staggered shake",             matType: "hardie_shake", suggestedColors: ["#C4A882","#8A8A8A","#5A3A1A","#4A4A4A"] },
  { id: "hardie_panel",  brand: "James Hardie", name: "HardiePanel®",        detail: "Vertical grooved panel",      matType: "hardie_panel", suggestedColors: ["#E8D5B7","#4A4A4A","#8B6914","#5B7D8A"] },
  { id: "hardie_board",  brand: "James Hardie", name: "HardieTrim®",         detail: "Board & batten",              matType: "hardie_batten", suggestedColors: ["#F4F1EC","#2C2C2C","#E8D5B7"] },
  { id: "ct_mainstreet", brand: "CertainTeed",  name: "Mainstreet®",         detail: "Vinyl siding doble 4\"",      matType: "vinyl",   suggestedColors: ["#F4F1EC","#E8D5B7","#8A8A8A","#5B7D8A"] },
  { id: "ct_monogram",   brand: "CertainTeed",  name: "Monogram®",           detail: "Vinyl insulated D5",          matType: "vinyl",   suggestedColors: ["#F4F1EC","#C4A882","#8A8A8A","#4A4A4A"] },
  { id: "alside_prism",  brand: "Alside",       name: "Prism®",              detail: "Vinyl premium triple 4\"",    matType: "vinyl",   suggestedColors: ["#F4F1EC","#E8D5B7","#5B7D8A","#8A8A8A"] },
  { id: "lp_smartside",  brand: "LP Building",  name: "LP SmartSide®",       detail: "Engineered wood lap",         matType: "lp",      suggestedColors: ["#C4A882","#8B6914","#4A6741","#5B7D8A"] },
  { id: "cedar_shake",   brand: "Cedar",        name: "Cedar Shake",         detail: "Shake de cedro natural",      matType: "wood",    suggestedColors: ["#C4A882","#8B6914","#A87848","#5A3A1A"] },
  { id: "metal_panel",   brand: "Metal",        name: "Metal Panel",         detail: "Paneles metálicos acero",     matType: "metal",   suggestedColors: ["#8A8A8A","#4A4A4A","#2C2C2C","#5B7D8A","#4A6741"] },
];

const ROOFING_PRODUCTS: Product[] = [
  { id: "gaf_timberline",   brand: "GAF",          name: "Timberline HDZ®",     detail: "Architectural shingles",      matType: "asphalt", suggestedColors: ["#2C2C2C","#5A4A3A","#4A4A4A","#6A5A4A","#3A2A1A"] },
  { id: "ct_landmark",      brand: "CertainTeed",  name: "Landmark®",           detail: "Shingles laminados 30 yr",    matType: "asphalt", suggestedColors: ["#2C2C2C","#5A4A3A","#8A8A8A","#4A3A2A","#2D4A2D"] },
  { id: "oc_duration",      brand: "Owens Corning", name: "Duration®",           detail: "SureNail® Tech shingles",     matType: "asphalt", suggestedColors: ["#2C2C2C","#4A3A2A","#5A4A3A","#8A8A8A"] },
  { id: "iko_cambridge",    brand: "IKO",          name: "Cambridge®",          detail: "Laminated shingles",          matType: "asphalt", suggestedColors: ["#2C2C2C","#5A4A3A","#4A4A4A","#8B2222"] },
  { id: "metal_standing",   brand: "Metal",        name: "Standing Seam",       detail: "Metal laminado calibre 26",   matType: "metal",   suggestedColors: ["#4A4A4A","#8A8A8A","#B8B8B8","#2D4A2D","#8B2222","#2C2C2C"] },
  { id: "metal_corrugated", brand: "Metal",        name: "Corrugated Metal",    detail: "Galvanizado / pintado",       matType: "metal_corr", suggestedColors: ["#8A8A8A","#B8B8B8","#4A4A4A","#2D4A2D"] },
  { id: "tpo_carlisle",     brand: "Carlisle",     name: "TPO Sure-Weld®",      detail: "Membrana flat roofing",       matType: "tpo",     suggestedColors: ["#E8E8E8","#C8C8C8","#D0C8B8"] },
  { id: "epdm_firestone",   brand: "Firestone",    name: "EPDM RubberGard™",    detail: "Goma vulcanizada flat",       matType: "tpo",     suggestedColors: ["#2C2C2C","#4A4A4A","#1A1A1A"] },
  { id: "cedar_roof",       brand: "Cedar",        name: "Cedar Shake Roof",    detail: "Shake de cedro premium",      matType: "wood",    suggestedColors: ["#C4A882","#8B6914","#A87848","#5A3A1A"] },
];

const FLOOR_PRODUCTS: Product[] = [
  { id: "daltile_porcelain",brand: "Daltile",      name: "Porcelain Tile",      detail: "12×24\" / 24×24\"",           matType: "tile",     suggestedColors: ["#F0EEEA","#9A9A9A","#C8BEA8","#4A4A4A","#E8E0D8"] },
  { id: "msi_ceramic",      brand: "MSI",          name: "Ceramic Tile",        detail: "12×12\" / 16×16\"",           matType: "tile",     suggestedColors: ["#F2F0F0","#9A9A9A","#C8BEA8","#A0A0A0"] },
  { id: "shaw_lvp",         brand: "Shaw Floors",  name: "Floorté® LVP",        detail: "Luxury Vinyl Plank 6mm",      matType: "lvp",      suggestedColors: ["#C8A878","#A87848","#B8A888","#8A6848","#5A4A3A"] },
  { id: "lifeproof_lvp",    brand: "LifeProof",    name: "LVP Waterproof",      detail: "Interlocking 7mm w/ pad",     matType: "lvp",      suggestedColors: ["#C8A878","#A87848","#B8A888","#5A3A1A"] },
  { id: "pergo_eng",        brand: "Pergo",        name: "Engineered Hardwood",  detail: "3/8\" tongue & groove",       matType: "hardwood", suggestedColors: ["#C8A878","#A87848","#5A3A1A","#8B6914"] },
  { id: "bruce_hardwood",   brand: "Bruce",        name: "Solid Hardwood",      detail: "3/4\" select & better",       matType: "hardwood", suggestedColors: ["#A87848","#5A3A1A","#8B6914","#C8A878"] },
  { id: "shaw_carpet",      brand: "Shaw Floors",  name: "Carpet",              detail: "Berber / plush / frieze",     matType: "carpet",   suggestedColors: ["#C8BEA8","#A0A0A0","#8A8A8A","#D4C4AA","#B8B0A0"] },
  { id: "mohawk_carpet",    brand: "Mohawk",       name: "SmartStrand® Carpet", detail: "Forever Clean™ fiber",        matType: "carpet",   suggestedColors: ["#C8BEA8","#A0A0A0","#D4C4AA","#8A8A8A"] },
  { id: "concrete_polish",  brand: "Custom",       name: "Polished Concrete",   detail: "Slurry seal + grind",         matType: "concrete", suggestedColors: ["#8A8A8A","#A0A0A0","#9A9090","#6A6A6A"] },
];

// ─── Real Market Pricing — NJ/PA 2025-2026 ───────────────────────────────────
// Sources: contractor surveys, HomeAdvisor NJ, Angi NJ/PA, manufacturer dealer data
// All prices = fully installed (materials + labor), NJ market rates

interface PriceRange { min: number; avg: number; premium: number; unit: string; note: string; }

const SIDING_PRICING: Record<string, PriceRange> = {
  // James Hardie — $9–$14/sqft installed NJ (Warner Exteriors, Future Remodeling NJ data)
  hardie_lap:    { min: 9.00,  avg: 11.50, premium: 14.00, unit: "sqft", note: "James Hardie — fibrocemento, 50-year warranty" },
  hardie_shake:  { min: 12.00, avg: 14.00, premium: 16.00, unit: "sqft", note: "James Hardie HardieShingle® — staggered shake" },
  hardie_panel:  { min: 10.00, avg: 12.00, premium: 14.00, unit: "sqft", note: "James Hardie HardiePanel® — vertical grooved" },
  hardie_batten: { min: 11.00, avg: 13.00, premium: 15.00, unit: "sqft", note: "James Hardie HardieTrim® — board & batten" },
  // CertainTeed vinyl — $5–$11/sqft installed NJ
  vinyl:         { min: 5.00,  avg: 7.00,  premium: 11.00, unit: "sqft", note: "CertainTeed Mainstreet®/Monogram® — vinyl lap" },
  // Alside Prism® premium vinyl — $6–$9/sqft installed
  // (mapped by matType; product-level override via productId below)
  // LP SmartSide® — $7–$12/sqft installed NJ/PA
  lp:            { min: 7.00,  avg: 9.50,  premium: 12.00, unit: "sqft", note: "LP SmartSide® — engineered wood, 5/50 warranty" },
  // Cedar natural — $12–$18/sqft installed NJ
  wood:          { min: 12.00, avg: 15.00, premium: 18.00, unit: "sqft", note: "Cedar shake natural — premium, high maintenance" },
  // Metal panel cladding — $9–$14/sqft installed
  metal:         { min: 9.00,  avg: 11.50, premium: 14.00, unit: "sqft", note: "Steel panel cladding — commercial grade" },
};

const SIDING_PRICING_BY_PRODUCT: Record<string, PriceRange> = {
  ct_mainstreet: { min: 5.00,  avg: 6.00,  premium: 7.00,  unit: "sqft", note: "CertainTeed Mainstreet® — doble 4\", entry level" },
  ct_monogram:   { min: 7.00,  avg: 9.00,  premium: 11.00, unit: "sqft", note: "CertainTeed Monogram® — vinyl insulated D5" },
  alside_prism:  { min: 6.00,  avg: 7.50,  premium: 9.00,  unit: "sqft", note: "Alside Prism® — premium triple 4\" vinyl" },
};

// Roofing: price per SQUARE (100 sqft) installed, NJ 2025
const ROOFING_PRICING: Record<string, PriceRange> = {
  // GAF Timberline HDZ® — $350–$500/sq installed NJ
  gaf_timberline:   { min: 350,  avg: 425,  premium: 500,  unit: "square", note: "GAF Timberline HDZ® — StainGuard Plus™, 30 yr" },
  // CertainTeed Landmark® — $320–$480/sq installed NJ
  ct_landmark:      { min: 320,  avg: 400,  premium: 480,  unit: "square", note: "CertainTeed Landmark® — laminado 30 yr" },
  // Owens Corning Duration® — $360–$520/sq installed NJ
  oc_duration:      { min: 360,  avg: 440,  premium: 520,  unit: "square", note: "Owens Corning Duration® — SureNail® technology" },
  // IKO Cambridge® — $300–$450/sq installed NJ
  iko_cambridge:    { min: 300,  avg: 375,  premium: 450,  unit: "square", note: "IKO Cambridge® — laminated architectural" },
  // Standing seam metal — $10–$16/sqft = $1,000–$1,600/sq installed NJ
  metal_standing:   { min: 1000, avg: 1300, premium: 1600, unit: "square", note: "Standing seam metal — calibre 26, 40-50 yr life" },
  metal_corrugated: { min: 800,  avg: 1000, premium: 1200, unit: "square", note: "Corrugated metal — galvanizado/pintado" },
  // Flat membrane — TPO/EPDM
  tpo_carlisle:     { min: 700,  avg: 950,  premium: 1200, unit: "square", note: "Carlisle TPO Sure-Weld® — flat roof membrane" },
  epdm_firestone:   { min: 500,  avg: 700,  premium: 900,  unit: "square", note: "Firestone EPDM RubberGard™ — vulcanized rubber" },
  // Cedar shake roof — $10–$16/sqft = $1,000–$1,600/sq installed
  cedar_roof:       { min: 1000, avg: 1300, premium: 1600, unit: "square", note: "Cedar shake roof — premium natural, 25-30 yr" },
};

// Fallback for matType if no product match
const ROOFING_PRICING_BY_MATTYPE: Record<string, PriceRange> = {
  asphalt: { min: 330,  avg: 410,  premium: 500,  unit: "square", note: "Asphalt architectural shingles — NJ market avg" },
  metal:   { min: 1000, avg: 1300, premium: 1600, unit: "square", note: "Metal roofing — NJ market avg" },
  metal_corr: { min: 800, avg: 1000, premium: 1200, unit: "square", note: "Corrugated metal — NJ market avg" },
  tpo:     { min: 600,  avg: 825,  premium: 1050, unit: "square", note: "Flat membrane roofing — NJ market avg" },
  wood:    { min: 1000, avg: 1300, premium: 1600, unit: "square", note: "Cedar shake roof — NJ market avg" },
};

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function calculateLocalEstimate(s: {
  widthFt: number; depthFt: number; wallHeightFt: number; stories: number;
  roofType: string; roofMaterial: string; roofProductId?: string;
  wallMaterial: string; wallProductId?: string;
  hasChimney?: boolean; hasPorch?: boolean; doorCount?: number; windowCount?: number;
}): string {
  const stories = s.stories === 2 ? 2 : 1;
  const W = s.widthFt, D = s.depthFt, H = s.wallHeightFt;

  // Roof area — slope multiplier 1.18 for pitched, 1.02 for flat
  const slopeMultiplier = s.roofType === "flat" ? 1.02 : 1.18;
  const roofAreaSqft = Math.round(W * D * slopeMultiplier);
  const roofSquares  = roofAreaSqft / 100;

  // Wall area — perimeter × height × stories, minus typical door/window area
  const doors = s.doorCount ?? 1;
  const windows = s.windowCount ?? 4;
  const wallAreaGross = Math.round(2 * (W + D) * H * stories);
  const openingsArea  = Math.round(doors * 21 + windows * 15); // avg 3×7 door, ~3×5 window
  const wallAreaNet   = Math.max(wallAreaGross - openingsArea, wallAreaGross * 0.88);

  // Trim/fascia/soffit — perimeter linear feet × avg 2 ft exposure = sqft
  const perimeterLf = Math.round(2 * (W + D));
  const trimSqft    = perimeterLf * 2;

  // ── Siding pricing lookup (by product ID first, then matType)
  const sidingProd = s.wallProductId;
  const sidingP: PriceRange =
    (sidingProd && SIDING_PRICING_BY_PRODUCT[sidingProd]) ||
    SIDING_PRICING[s.wallMaterial] ||
    { min: 6, avg: 8, premium: 11, unit: "sqft", note: "Vinyl/fibrocemento — NJ avg" };

  // ── Roofing pricing lookup
  const roofProd = s.roofProductId;
  const roofP: PriceRange =
    (roofProd && ROOFING_PRICING[roofProd]) ||
    ROOFING_PRICING_BY_MATTYPE[s.roofMaterial] ||
    { min: 350, avg: 425, premium: 500, unit: "square", note: "Asphalt shingles NJ avg" };

  // ── Roof costs
  const roofMin     = Math.round(roofSquares * roofP.min);
  const roofAvg     = Math.round(roofSquares * roofP.avg);
  const roofPremium = Math.round(roofSquares * roofP.premium);
  const roofTearOff = Math.round(roofAreaSqft * 2.50); // $2.50/sqft tear-off NJ avg

  // ── Siding costs
  const sidingMin     = Math.round(wallAreaNet * sidingP.min);
  const sidingAvg     = Math.round(wallAreaNet * sidingP.avg);
  const sidingPremium = Math.round(wallAreaNet * sidingP.premium);
  const sidingTearOff = Math.round(wallAreaNet * 0.75); // $0.75/sqft removal NJ avg

  // ── Trim / fascia / soffit — vinyl standard $4/sqft, premium $6/sqft
  const trimMin = Math.round(trimSqft * 3.50);
  const trimAvg = Math.round(trimSqft * 4.50);
  const trimPremium = Math.round(trimSqft * 6.00);

  // ── Totals
  const totalMin     = roofMin     + roofTearOff + sidingMin     + sidingTearOff + trimMin;
  const totalAvg     = roofAvg     + roofTearOff + sidingAvg     + sidingTearOff + trimAvg;
  const totalPremium = roofPremium + roofTearOff + sidingPremium + sidingTearOff + trimPremium;

  const sidingBrand = sidingP.note.split("—")[0].trim();
  const roofBrand   = roofP.note.split("—")[0].trim();

  const roofLabel = s.roofType === "flat" ? "plano" : s.roofType === "hip" ? "hip" : s.roofType === "gambrel" ? "gambrel" : "2 aguas";

  return [
    `ESTIMADO EXTERIOR — NJ/PA 2025`,
    `Dimensiones: ${W}′ × ${D}′ · ${H}′ pared · ${stories} piso(s) · Techo ${roofLabel}`,
    ``,
    `─ TECHO (${roofAreaSqft.toLocaleString()} sqft · ${roofSquares.toFixed(1)} squares)`,
    `  Producto: ${roofBrand}`,
    `  Instalación:   Min ${fmt(roofMin)}  ·  Prom ${fmt(roofAvg)}  ·  Premium ${fmt(roofPremium)}`,
    `  Demolición:    ${fmt(roofTearOff)}  (tear-off ~$2.50/sqft NJ avg)`,
    ``,
    `─ SIDING (${Math.round(wallAreaNet).toLocaleString()} sqft neto)`,
    `  Producto: ${sidingBrand}`,
    `  Instalación:   Min ${fmt(sidingMin)}  ·  Prom ${fmt(sidingAvg)}  ·  Premium ${fmt(sidingPremium)}`,
    `  Demolición:    ${fmt(sidingTearOff)}  (remoción ~$0.75/sqft NJ avg)`,
    ``,
    `─ TRIM / FASCIA / SOFFIT (~${trimSqft} sqft)`,
    `  Vinilo estándar — Min ${fmt(trimMin)}  ·  Prom ${fmt(trimAvg)}  ·  Premium ${fmt(trimPremium)}`,
    ``,
    `─ TOTAL ESTIMADO`,
    `  Mínimo:   ${fmt(totalMin)}`,
    `  Promedio: ${fmt(totalAvg)}`,
    `  Premium:  ${fmt(totalPremium)}`,
    ``,
    `Precios basados en datos de mercado NJ/PA 2025-2026.`,
    `Incluyen materiales + mano de obra + demolición.`,
    `No incluyen: permisos (~$500-$1,500 NJ), scaffolding, reparaciones estructurales.`,
  ].join("\n");
}

const WALL_FINISH_PRODUCTS: Product[] = [
  { id: "sw_paint",         brand: "Sherwin-Williams", name: "Emerald® Paint",   detail: "Interior latex — 1 coat",     matType: "paint",       suggestedColors: ["#F8F5F0","#E0D8CC","#D4C4AA","#8A9AAA","#9AAA8A","#2A3A5A"] },
  { id: "bm_paint",         brand: "Benjamin Moore",  name: "Aura® Paint",      detail: "Interior premium — 0 VOC",    matType: "paint",       suggestedColors: ["#F8F5F0","#F0EDE8","#E0D8CC","#C8C8C8","#9AAA8A","#2A3A5A"] },
  { id: "daltile_subway",   brand: "Daltile",       name: "Subway Tile",        detail: "3×6\" ceramic glazed",        matType: "tile",        suggestedColors: ["#F2F0F0","#E8E8E8","#C8C8C8","#9A9A9A","#4A4A4A"] },
  { id: "msi_large_tile",   brand: "MSI",           name: "Large Format Tile",  detail: "24×48\" / 12×24\" rect",      matType: "tile",        suggestedColors: ["#F0EEEA","#9A9A9A","#C8BEA8","#4A4A4A","#E8E0D8"] },
  { id: "shiplap_oak",      brand: "Custom",        name: "Shiplap — White Oak", detail: "1×6\" painted/stained",       matType: "shiplap",     suggestedColors: ["#F8F5F0","#E0D8CC","#C8A878","#A87848","#2A3A5A","#2C2C2C"] },
  { id: "wainscoting_md",   brand: "Custom",        name: "Wainscoting MDF",    detail: "Raised panel + chair rail",   matType: "wainscoting", suggestedColors: ["#F8F5F0","#F4F1EC","#E0D8CC","#D4C4AA"] },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type WallFace = "front" | "back" | "left" | "right";
interface WindowPlacement { wall: WallFace; offsetX: number; }
interface DoorPlacement   { wall: WallFace; offsetX: number; widthFt: number; heightFt: number; }

interface StructureParams {
  type: string;
  widthFt: number;
  depthFt: number;
  wallHeightFt: number;
  stories?: 1 | 2;
  foundationHeightFt?: number;
  roofType: "gable" | "flat" | "hip" | "gambrel";
  ridgeAxis: "w" | "d";
  ridgeHeightFt: number;
  roofOverhang: number;
  wallProductId: string;
  wallMaterial: string;
  wallColor: string;
  roofProductId: string;
  roofMaterial: string;
  roofColor: string;
  trimColor?: string;
  fasciaColor?: string;
  soffitColor?: string;
  soffitMatType?: string;
  windowTrimColor?: string;
  shutterColor?: string;
  shuttersEnabled?: boolean;
  lightsEnabled?: boolean;
  gableVentEnabled?: boolean;
  windowStyle?: "single" | "double" | "arched" | "picture";
  doorStyle?: "single" | "double" | "sidelite" | "garage";
  hasPorch?: boolean;
  porchWidthFt?: number;
  porchDepthFt?: number;
  hasChimney?: boolean;
  chimneyX?: number;
  hasDormer?: boolean;
  dormerCount?: 1 | 2 | 3;
  doorCount: number;
  doorWall: WallFace;
  doorOffsetX: number;
  doorPlacements: DoorPlacement[];
  windowCount: number;
  windowPlacements: WindowPlacement[];
  description: string;
}

interface InteriorParams {
  type: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  floorProductId: string;
  floorMaterial: string;
  floorColor: string;
  wallProductId: string;
  wallMaterial: string;
  wallColor: string;
  ceilingColor: string;
  description: string;
}

const DEFAULT_WINDOW_PLACEMENTS: WindowPlacement[] = [
  { wall: "front", offsetX:  0.45 },
  { wall: "front", offsetX: -0.45 },
  { wall: "right", offsetX:  0.30 },
  { wall: "right", offsetX: -0.30 },
];

const DEFAULT_DOOR_PLACEMENTS: DoorPlacement[] = [
  { wall: "front", offsetX: 0, widthFt: 3, heightFt: 7 },
  { wall: "back",  offsetX: 0, widthFt: 9, heightFt: 7 },
];

const DEFAULT_EXTERIOR: StructureParams = {
  type: "house", widthFt: 30, depthFt: 24, wallHeightFt: 9,
  stories: 1, foundationHeightFt: 1.5,
  roofType: "gable", ridgeAxis: "w", ridgeHeightFt: 6, roofOverhang: 1.5,
  wallProductId: "hardie_lap", wallMaterial: "hardie", wallColor: "#E8D5B7",
  roofProductId: "gaf_timberline", roofMaterial: "asphalt", roofColor: "#2C2C2C",
  trimColor: "#F4F1EC", fasciaColor: "#F4F1EC", soffitColor: "#F4F1EC", soffitMatType: "soffit_panel",
  windowTrimColor: "#F4F1EC", shutterColor: "#2A3A58",
  shuttersEnabled: true, lightsEnabled: true, gableVentEnabled: true,
  windowStyle: "single", doorStyle: "single",
  hasPorch: false, porchWidthFt: 12, porchDepthFt: 6,
  hasChimney: false, chimneyX: 0.3,
  hasDormer: false, dormerCount: 2,
  doorCount: 1, doorWall: "front", doorOffsetX: 0,
  doorPlacements: [{ wall: "front", offsetX: 0, widthFt: 3.5, heightFt: 8 }, { wall: "back", offsetX: 0, widthFt: 9, heightFt: 7 }],
  windowCount: 4, windowPlacements: DEFAULT_WINDOW_PLACEMENTS,
  description: "30×24 casa residencial — HardiePlank / GAF Timberline",
};

const DEFAULT_INTERIOR: InteriorParams = {
  type: "kitchen", widthFt: 14, depthFt: 12, heightFt: 9,
  floorProductId: "daltile_porcelain", floorMaterial: "tile", floorColor: "#C8BEA8",
  wallProductId: "sw_paint", wallMaterial: "paint", wallColor: "#F0EDE8",
  ceilingColor: "#F8F7F5",
  description: "14×12 kitchen — Daltile porcelain / SW Emerald",
};

// ─── Trim color palette ───────────────────────────────────────────────────────
const TRIM_COLORS = [
  { label: "Blanco",      hex: "#F8F6F2" }, { label: "Off-White",   hex: "#F4F1EC" },
  { label: "Crema",       hex: "#E8D5B7" }, { label: "Gris Claro",  hex: "#D1D5DB" },
  { label: "Gris",        hex: "#9CA3AF" }, { label: "Gris Osc.",   hex: "#4A4A4A" },
  { label: "Negro",       hex: "#1C1C1C" }, { label: "Navy",        hex: "#1E3A5F" },
  { label: "Verde Osc.",  hex: "#2D4A2D" }, { label: "Marrón",      hex: "#8B6914" },
];

// ─── Master Color Palette — independent of material ──────────────────────────

const MASTER_COLOR_PALETTE: Array<{ group: string; short: string; colors: Array<{ label: string; hex: string }> }> = [
  {
    group: "James Hardie ColorPlus®", short: "Hardie",
    colors: [
      { label: "Arctic White",    hex: "#F4F1EC" }, { label: "Sailcloth",       hex: "#E8DDD0" },
      { label: "Pearl Gray",      hex: "#C0BCBA" }, { label: "Cobblestone",     hex: "#B0A898" },
      { label: "Navajo Beige",    hex: "#D2B898" }, { label: "Classic Cream",   hex: "#E8D5B7" },
      { label: "Sandstone Beige", hex: "#C8AA88" }, { label: "Autumn Tan",      hex: "#C09070" },
      { label: "Timber Bark",     hex: "#887060" }, { label: "Aged Pewter",     hex: "#888080" },
      { label: "Iron Gray",       hex: "#4A4A4A" }, { label: "Night Sky",       hex: "#2A2A36" },
      { label: "Boothbay Blue",   hex: "#5B7D8A" }, { label: "Deep Ocean",      hex: "#2A4858" },
      { label: "Woodstock Brown", hex: "#5A4030" }, { label: "Heathered Moss",  hex: "#6A7A5A" },
      { label: "Evening Blue",    hex: "#3A4A6A" }, { label: "Barn Red",        hex: "#8B3A3A" },
    ],
  },
  {
    group: "Sherwin-Williams", short: "SW",
    colors: [
      { label: "Extra White",     hex: "#F5F4EE" }, { label: "Alabaster",       hex: "#EDE8DC" },
      { label: "Creamy",          hex: "#F0E8D8" }, { label: "Accessible Beige",hex: "#D4C8B4" },
      { label: "Agreeable Gray",  hex: "#CCC4B4" }, { label: "Repose Gray",     hex: "#C0BDB8" },
      { label: "Mindful Gray",    hex: "#B4B0A8" }, { label: "Peppercorn",      hex: "#686058" },
      { label: "Urbane Bronze",   hex: "#6A5E50" }, { label: "Iron Ore",        hex: "#484848" },
      { label: "Tricorn Black",   hex: "#282826" }, { label: "Naval",           hex: "#2A3A58" },
      { label: "Evergreen Fog",   hex: "#8A9888" }, { label: "Sea Salt",        hex: "#A8B8A8" },
      { label: "Oyster Bay",      hex: "#8A9898" }, { label: "Sage",            hex: "#9AAA8A" },
    ],
  },
  {
    group: "Benjamin Moore", short: "BM",
    colors: [
      { label: "Simply White",    hex: "#F8F5EE" }, { label: "Chantilly Lace",  hex: "#F6F4F2" },
      { label: "White Dove",      hex: "#F2EEE6" }, { label: "Ballet White",    hex: "#F0E8D8" },
      { label: "Pale Oak",        hex: "#E4D8C8" }, { label: "Revere Pewter",   hex: "#C4BDB0" },
      { label: "Coventry Gray",   hex: "#B0A8A0" }, { label: "Chelsea Gray",    hex: "#8C8884" },
      { label: "Wrought Iron",    hex: "#484848" }, { label: "Hale Navy",       hex: "#2A3A50" },
      { label: "Van Deusen Blue", hex: "#2A4A68" }, { label: "Dried Thyme",     hex: "#7A8A6A" },
      { label: "Nantucket Gray",  hex: "#909898" }, { label: "Green Smoke",     hex: "#7A8A70" },
    ],
  },
  {
    group: "Roofing — GAF / CertainTeed", short: "Roofing",
    colors: [
      { label: "Charcoal",        hex: "#2C2C2C" }, { label: "Barkwood",        hex: "#5A4A3A" },
      { label: "Driftwood",       hex: "#6A5A4A" }, { label: "Pewter Gray",     hex: "#8A8A8A" },
      { label: "Weathered Wood",  hex: "#78684A" }, { label: "Shakewood",       hex: "#504038" },
      { label: "Fox Hollow Gray", hex: "#6A7878" }, { label: "Oyster Gray",     hex: "#9A9888" },
      { label: "Desert Tan",      hex: "#D4B890" }, { label: "Hunter Green",    hex: "#2D4A2D" },
      { label: "Rustic Red",      hex: "#8B2222" }, { label: "Weathered Slate", hex: "#686888" },
      { label: "Silver",          hex: "#B8B8B8" }, { label: "White",           hex: "#E8E8E8" },
    ],
  },
  {
    group: "Metal — Roofing & Panels", short: "Metal",
    colors: [
      { label: "Galvalume",       hex: "#B8B8B8" }, { label: "Ash Gray",        hex: "#8A8A8A" },
      { label: "Charcoal Metal",  hex: "#4A4A4A" }, { label: "Matte Black",     hex: "#2A2A2A" },
      { label: "Forest Green",    hex: "#2D4A2D" }, { label: "Barn Red",        hex: "#8B2222" },
      { label: "Ocean Blue",      hex: "#2A4858" }, { label: "Copper Patina",   hex: "#7A9878" },
      { label: "Sandstone",       hex: "#D4B890" }, { label: "Bronze",          hex: "#6A5A3A" },
    ],
  },
  {
    group: "Interior Paint & Finishes", short: "Interior",
    colors: [
      { label: "Pure White",      hex: "#F8F7F2" }, { label: "Warm White",      hex: "#F4F1EA" },
      { label: "Linen",           hex: "#F0EAE0" }, { label: "Alabaster",       hex: "#EAE4D8" },
      { label: "Creamy",          hex: "#F0E8D8" }, { label: "Pale Oak",        hex: "#E0D8C8" },
      { label: "Accessible Beige",hex: "#D4C8B4" }, { label: "Agreeable Gray",  hex: "#CAC2B4" },
      { label: "Repose Gray",     hex: "#BEB8B0" }, { label: "Revere Pewter",   hex: "#C0B8B0" },
      { label: "Gray Area",       hex: "#A8A8A0" }, { label: "Peppercorn",      hex: "#686058" },
      { label: "Slate Blue",      hex: "#8A9AAA" }, { label: "Sage Green",      hex: "#9AAA8A" },
      { label: "Dusty Blue",      hex: "#7A8A9A" }, { label: "Dried Thyme",     hex: "#7A8A6A" },
      { label: "Naval",           hex: "#2A3A5A" }, { label: "Charcoal",        hex: "#3A3A3A" },
      { label: "Cream",           hex: "#F2EDE4" }, { label: "Light Gray",      hex: "#E0E0E0" },
      { label: "Navy",            hex: "#1A2A4A" }, { label: "Black",           hex: "#1A1A1A" },
    ],
  },
];

// ─── Procedural Texture Generator ────────────────────────────────────────────

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}
function hexToRgb(hex: string): [number,number,number] {
  const n = parseInt(hex.replace("#",""), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}
function addGrain(ctx: CanvasRenderingContext2D, size: number, count: number, maxA: number) {
  for (let i = 0; i < count; i++) {
    const bright = Math.random() > 0.5;
    ctx.fillStyle = bright
      ? `rgba(255,255,255,${(Math.random()*maxA).toFixed(3)})`
      : `rgba(0,0,0,${(Math.random()*maxA).toFixed(3)})`;
    ctx.fillRect(Math.random()*size, Math.random()*size, 1+Math.random(), 1+Math.random());
  }
}

function createProceduralTexture(material: string, colorHex: string, rX = 2, rY = 2, canvasSize = 1024): THREE.CanvasTexture {
  const size = canvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  const [r, g, b] = hexToRgb(colorHex);
  const vary = (v: number, amt: number) => Math.max(0, Math.min(255, v + (Math.random()-0.5)*amt*2));

  switch (material) {

    // ── LAP SIDING (HardiePlank / LP SmartSide / Vinyl) ──
    case "hardie":
    case "lp":
    case "vinyl": {
      // Fiber cement / engineered wood / vinyl horizontal lap siding
      const isVinyl = material === "vinyl";
      const planks = isVinyl ? 20 : 18;
      const pH = size / planks;
      for (let i = 0; i < planks; i++) {
        const y = i * pH;
        // Main plank face — subtle per-plank color variation
        const cv = isVinyl ? 4 : 6;
        ctx.fillStyle = `rgb(${vary(r,cv)|0},${vary(g,cv)|0},${vary(b,cv)|0})`;
        ctx.fillRect(0, y, size, pH);
        // Face gradient: bright at top bevel → neutral → darker at bottom
        const face = ctx.createLinearGradient(0, y, 0, y + pH);
        face.addColorStop(0.00, "rgba(255,255,255,0.30)");
        face.addColorStop(0.06, "rgba(255,255,255,0.12)");
        face.addColorStop(0.45, "rgba(0,0,0,0.00)");
        face.addColorStop(0.85, "rgba(0,0,0,0.08)");
        face.addColorStop(1.00, "rgba(0,0,0,0.22)");
        ctx.fillStyle = face; ctx.fillRect(0, y, size, pH);
        // CRITICAL — overlap shadow at TOP of each plank — strong + crisp for photorealism
        const lapShadow = ctx.createLinearGradient(0, y, 0, y + pH * 0.18);
        lapShadow.addColorStop(0.0, "rgba(0,0,0,0.82)");
        lapShadow.addColorStop(0.35, "rgba(0,0,0,0.38)");
        lapShadow.addColorStop(1.0, "rgba(0,0,0,0.00)");
        ctx.fillStyle = lapShadow; ctx.fillRect(0, y, size, pH * 0.18);
        // Hard seam line at bottom (butt joint / lower edge) — crisp dark cut
        ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(0, y + pH - 5, size, 5);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(0, y + pH - 0.5, size, 1.5);
        if (!isVinyl) {
          // Fiber cement micro-texture: faint horizontal grain lines
          for (let n = 0; n < 5; n++) {
            const ly = y + pH * 0.18 + Math.random() * pH * 0.64;
            ctx.fillStyle = `rgba(0,0,0,${(0.012 + Math.random()*0.022).toFixed(3)})`;
            ctx.fillRect(0, ly, size, 0.5 + Math.random() * 0.8);
          }
          // Random butt joint (vertical seam between planks)
          if (Math.random() > 0.60) {
            const jx = size * (0.25 + Math.random() * 0.50);
            ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(jx - 1, y + 3, 2.5, pH - 6);
            ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(jx + 1.5, y + 3, 1, pH - 6);
          }
        } else {
          // Vinyl: plastic sheen band near top of each plank
          const sheen = ctx.createLinearGradient(0, y + pH*0.04, 0, y + pH*0.26);
          sheen.addColorStop(0, "rgba(255,255,255,0.18)");
          sheen.addColorStop(1, "rgba(255,255,255,0.00)");
          ctx.fillStyle = sheen; ctx.fillRect(0, y + pH*0.04, size, pH * 0.22);
        }
      }
      // Fine sandy grain for fiber cement; minimal for vinyl
      addGrain(ctx, size, isVinyl ? 500 : 10000, isVinyl ? 0.012 : 0.030);
      break;
    }

    // ── CEDAR SHAKE / SHINGLE ──
    case "hardie_shake": {
      const rows = 9; const rH = size / rows;
      for (let row = 0; row < rows; row++) {
        const y = row * rH;
        const offset = row % 2 === 0 ? 0 : size / 16;
        const shakeW = size / 8;
        // Shadow at top of row (overlap shadow)
        const rowSh = ctx.createLinearGradient(0, y, 0, y + rH*0.18);
        rowSh.addColorStop(0, "rgba(0,0,0,0.42)"); rowSh.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rowSh; ctx.fillRect(0, y, size, rH*0.18);
        for (let s = -1; s < 10; s++) {
          const x = s * shakeW + offset;
          ctx.fillStyle = `rgb(${vary(r,18)|0},${vary(g,14)|0},${vary(b,10)|0})`;
          ctx.fillRect(x+1, y+rH*0.14, shakeW-2, rH*0.84);
          // Side seam
          ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(x, y, 2, rH);
          ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(x+2, y, 1, rH);
          // Shake face gradient
          const sg = ctx.createLinearGradient(x, y, x+shakeW, y);
          sg.addColorStop(0,   "rgba(255,255,255,0.10)");
          sg.addColorStop(0.5, "rgba(0,0,0,0.00)");
          sg.addColorStop(1,   "rgba(0,0,0,0.12)");
          ctx.fillStyle = sg; ctx.fillRect(x, y+rH*0.14, shakeW, rH*0.84);
        }
      }
      addGrain(ctx, size, 4000, 0.05);
      break;
    }

    // ── VERTICAL GROOVED PANEL ──
    case "hardie_panel": {
      const grooves = 4; const gW = size / grooves;
      for (let i = 0; i < grooves; i++) {
        const x = i * gW;
        ctx.fillStyle = `rgb(${vary(r,5)|0},${vary(g,5)|0},${vary(b,5)|0})`;
        ctx.fillRect(x+7, 0, gW-7, size);
        const pg = ctx.createLinearGradient(x+7, 0, x+gW, 0);
        pg.addColorStop(0,   "rgba(255,255,255,0.10)");
        pg.addColorStop(0.5, "rgba(0,0,0,0.00)");
        pg.addColorStop(1,   "rgba(0,0,0,0.08)");
        ctx.fillStyle = pg; ctx.fillRect(x+7, 0, gW-7, size);
        // V-groove
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x, 0, 4, size);
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x+4, 0, 3, size);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x+7, 0, 2, size);
      }
      addGrain(ctx, size, 2500, 0.03);
      break;
    }

    // ── BOARD & BATTEN ──
    case "hardie_batten": {
      const boards = 5; const bW = size / boards; const batW = 14;
      for (let i = 0; i < boards; i++) {
        const x = i * bW;
        ctx.fillStyle = `rgb(${vary(r,6)|0},${vary(g,6)|0},${vary(b,6)|0})`;
        ctx.fillRect(x + batW/2, 0, bW - batW, size);
        const bg = ctx.createLinearGradient(x, 0, x+bW, 0);
        bg.addColorStop(0, "rgba(255,255,255,0.07)"); bg.addColorStop(0.5, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(0,0,0,0.07)");
        ctx.fillStyle = bg; ctx.fillRect(x+batW/2, 0, bW-batW, size);
      }
      for (let i = 0; i <= boards; i++) {
        const x = i * bW - batW/2;
        ctx.fillStyle = darken(colorHex, 10); ctx.fillRect(x, 0, batW, size);
        ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x+2, 0, 3, size);
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x, 0, 2, size);
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x+batW-2, 0, 2, size);
      }
      addGrain(ctx, size, 2000, 0.03);
      break;
    }

    // ── METAL STANDING SEAM ──
    case "metal": {
      const seams = 5; const sW = size / seams; const capW = 13;
      for (let i = 0; i < seams; i++) {
        const x = i * sW;
        // Brushed metal horizontal lines
        for (let ln = 0; ln < size; ln += 3) {
          ctx.fillStyle = ln%2===0 ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.014)";
          ctx.fillRect(x+capW, ln, sW-capW*2, 1.5);
        }
        // Specular sweep
        const spec = ctx.createLinearGradient(x+capW, 0, x+sW-capW, 0);
        spec.addColorStop(0,    "rgba(255,255,255,0.22)");
        spec.addColorStop(0.30, "rgba(255,255,255,0.06)");
        spec.addColorStop(0.65, "rgba(0,0,0,0.03)");
        spec.addColorStop(1,    "rgba(0,0,0,0.14)");
        ctx.fillStyle = spec; ctx.fillRect(x+capW, 0, sW-capW*2, size);
        // Standing seam cap
        ctx.fillStyle = darken(colorHex, 14); ctx.fillRect(x, 0, capW, size);
        ctx.fillStyle = "rgba(255,255,255,0.38)"; ctx.fillRect(x+2, 0, 3, size);
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x+capW-2, 0, 2, size);
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x, 0, 2, size);
      }
      // Horizontal panel seams
      [size*0.33, size*0.66].forEach(y => {
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0, y-1, size, 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0, y+1, size, 1);
      });
      break;
    }

    // ── CORRUGATED METAL ──
    case "metal_corr": {
      const ridges = 10; const rW = size / ridges;
      for (let i = 0; i < ridges; i++) {
        const x = i * rW;
        const rg = ctx.createLinearGradient(x, 0, x+rW, 0);
        rg.addColorStop(0,    "rgba(0,0,0,0.22)");
        rg.addColorStop(0.18, "rgba(255,255,255,0.28)");
        rg.addColorStop(0.50, "rgba(255,255,255,0.05)");
        rg.addColorStop(0.82, "rgba(0,0,0,0.18)");
        rg.addColorStop(1,    "rgba(0,0,0,0.24)");
        ctx.fillStyle = rg; ctx.fillRect(x, 0, rW, size);
      }
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.03)"; ctx.fillRect(0, y, size, 1);
      }
      break;
    }

    // ── CEDAR / WOOD SIDING ──
    case "wood": {
      const planks = 9; const pH = size / planks;
      for (let i = 0; i < planks; i++) {
        const y = i * pH;
        ctx.fillStyle = `rgb(${vary(r,22)|0},${vary(g,16)|0},${vary(b,10)|0})`;
        ctx.fillRect(0, y, size, pH - 3);
        // Wood grain lines (wavy)
        ctx.save();
        for (let n = 0; n < 18; n++) {
          const gy = y + (n/18)*(pH-3);
          ctx.strokeStyle = `rgba(0,0,0,${(0.025+Math.random()*0.085).toFixed(3)})`;
          ctx.lineWidth = 0.5 + Math.random()*1.5;
          ctx.beginPath(); ctx.moveTo(0, gy+Math.sin(n*0.4)*2);
          for (let sx = 0; sx <= size; sx += 70) ctx.lineTo(sx, gy+(Math.random()-0.5)*4);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.34)"; ctx.fillRect(0, y+pH-3, size, 3);
        ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(0, y+pH, size, 1);
      }
      // Knot
      const kx=size*0.62, ky=size*0.33, kr=16;
      const kg = ctx.createRadialGradient(kx,ky,0, kx,ky,kr);
      kg.addColorStop(0,"rgba(0,0,0,0.50)"); kg.addColorStop(0.5,"rgba(0,0,0,0.18)"); kg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=kg; ctx.beginPath(); ctx.ellipse(kx,ky,kr,kr*0.7,0,0,Math.PI*2); ctx.fill();
      break;
    }

    // ── ASPHALT ARCHITECTURAL / DIMENSIONAL SHINGLES (GAF Timberline style) ──
    case "asphalt": {
      const rows = 5; const rowH = size / rows;
      const tabW = size / 3;        // 3 tabs per shingle width
      const headlapFrac = 0.44;     // top 44% covered by next row — the headlap zone
      const expFrac = 1 - headlapFrac;

      for (let row = 0; row < rows; row++) {
        const y = row * rowH;
        const off = row % 2 === 0 ? 0 : tabW * 0.5;
        const headH = rowH * headlapFrac;
        const expY = y + headH;      // start of exposure zone
        const expH = rowH * expFrac;

        // === HEADLAP ZONE — darker; simulates the laminate/second layer underneath ===
        ctx.fillStyle = `rgb(${Math.max(0,(r-28))|0},${Math.max(0,(g-22))|0},${Math.max(0,(b-18))|0})`;
        ctx.fillRect(0, y, size, headH);

        // === EXPOSURE ZONE — the visible shingle face (3 individual tabs) ===
        for (let t = -1; t <= 3; t++) {
          const tx = t * tabW - off;
          // Single luminance shift keeps shingles monochromatic (no rainbow hue drift)
          const lum = (Math.random() - 0.5) * 34;
          const rv = Math.max(0, Math.min(255, r + lum));
          const gv = Math.max(0, Math.min(255, g + lum));
          const bv = Math.max(0, Math.min(255, b + lum));
          ctx.fillStyle = `rgb(${rv|0},${gv|0},${bv|0})`;
          ctx.fillRect(tx, expY, tabW, expH);
          // Subtle face gradient per tab
          const tg = ctx.createLinearGradient(0, expY, 0, expY + expH);
          tg.addColorStop(0.00, "rgba(255,255,255,0.09)");
          tg.addColorStop(0.25, "rgba(255,255,255,0.00)");
          tg.addColorStop(0.80, "rgba(0,0,0,0.04)");
          tg.addColorStop(1.00, "rgba(0,0,0,0.14)");
          ctx.fillStyle = tg; ctx.fillRect(tx, expY, tabW, expH);
        }

        // === DIMENSIONAL SHADOW LINE — sharp shadow at headlap/exposure boundary ===
        // This is the KEY feature that makes architectural shingles look 3D
        const dimSh = ctx.createLinearGradient(0, expY - rowH*0.10, 0, expY + rowH*0.05);
        dimSh.addColorStop(0.0, "rgba(0,0,0,0.00)");
        dimSh.addColorStop(0.7, "rgba(0,0,0,0.62)");
        dimSh.addColorStop(1.0, "rgba(0,0,0,0.00)");
        ctx.fillStyle = dimSh; ctx.fillRect(0, expY - rowH*0.10, size, rowH*0.15);

        // === TAB SLOT CUTOUTS — rectangular notches at tab boundaries ===
        for (let t = 0; t <= 3; t++) {
          const tx = t * tabW - off;
          // Dark slot background
          ctx.fillStyle = "rgba(0,0,0,0.88)";
          ctx.fillRect(tx - 5, expY - 3, 10, headH + 4);
          // Inner slot shadow for depth
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(tx + 5, expY - 3, 7, headH + 4);
        }

        // === ROW OVERLAP SHADOW at very top of each row ===
        const rowSh = ctx.createLinearGradient(0, y, 0, y + rowH*0.10);
        rowSh.addColorStop(0, "rgba(0,0,0,0.72)");
        rowSh.addColorStop(1, "rgba(0,0,0,0.00)");
        ctx.fillStyle = rowSh; ctx.fillRect(0, y, size, rowH*0.10);

        // Bottom exposure highlight (lower edge of each shingle tab catches light)
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(0, expY + expH - 2.5, size, 2.5);
      }

      // === GRANULAR SURFACE — asphalt granules (essential for realism) ===
      for (let gn = 0; gn < 22000; gn++) {
        const gx = Math.random() * size, gy = Math.random() * size;
        const gs = 0.4 + Math.random() * 2.0;
        const rnd = Math.random();
        let a: number;
        if      (rnd < 0.10) a = 0.14 + Math.random() * 0.14; // bright specular granule
        else if (rnd < 0.28) a = 0.10 + Math.random() * 0.16; // dark granule
        else                 a = 0.02 + Math.random() * 0.05; // fine noise base
        const bright = rnd < 0.10 || (rnd >= 0.28 && Math.random() > 0.5);
        ctx.fillStyle = bright
          ? `rgba(255,255,255,${a.toFixed(3)})`
          : `rgba(0,0,0,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(gx, gy, gs * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }

    // ── TPO / EPDM FLAT MEMBRANE ──
    case "tpo": {
      const tg = ctx.createLinearGradient(0, 0, size, size*0.4);
      tg.addColorStop(0,"rgba(255,255,255,0.14)"); tg.addColorStop(0.5,"rgba(255,255,255,0.02)"); tg.addColorStop(1,"rgba(0,0,0,0.07)");
      ctx.fillStyle = tg; ctx.fillRect(0, 0, size, size);
      [size*0.33, size*0.66].forEach(x => {
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x-3, 0, 6, size);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x-1, 0, 2, size);
      });
      [size*0.5].forEach(y => {
        ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(0, y-2, size, 4);
        ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(0, y+2, size, 2);
      });
      addGrain(ctx, size, 1000, 0.028);
      break;
    }

    // ── PORCELAIN / CERAMIC TILE ──
    case "tile": {
      const tCount = 5; const tSz = size / tCount; const gW = size * 0.028;
      ctx.fillStyle = darken(colorHex, 48); ctx.fillRect(0, 0, size, size);
      for (let row = 0; row < tCount; row++) {
        for (let col = 0; col < tCount; col++) {
          const tx = col*tSz+gW, ty = row*tSz+gW;
          const tw = tSz-gW*2, th = tSz-gW*2;
          const tg2 = ctx.createLinearGradient(tx, ty, tx+tw, ty+th);
          tg2.addColorStop(0,    lighten(colorHex, 25));
          tg2.addColorStop(0.35, lighten(colorHex, 10));
          tg2.addColorStop(0.70, colorHex);
          tg2.addColorStop(1,    darken(colorHex, 15));
          ctx.fillStyle = tg2; ctx.fillRect(tx, ty, tw, th);
          // Specular highlight spot
          const spec = ctx.createRadialGradient(tx+tw*0.22, ty+th*0.22, 0, tx+tw*0.22, ty+th*0.22, tw*0.42);
          spec.addColorStop(0, "rgba(255,255,255,0.22)"); spec.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = spec; ctx.fillRect(tx, ty, tw, th);
          // Grout shadow edge
          ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(tx, ty, tw, 2); ctx.fillRect(tx, ty, 2, th);
        }
      }
      break;
    }

    // ── HARDWOOD / LVP FLOORING ──
    case "hardwood":
    case "lvp": {
      const planks = 8; const pH = size / planks;
      for (let i = 0; i < planks; i++) {
        const y = i * pH;
        ctx.fillStyle = `rgb(${vary(r,28)|0},${vary(g,22)|0},${vary(b,16)|0})`;
        ctx.fillRect(0, y+1, size, pH-2);
        // Wood grain
        ctx.save();
        for (let n = 0; n < 22; n++) {
          const gy = y+1+(n/22)*(pH-2);
          ctx.strokeStyle = `rgba(0,0,0,${(0.025+Math.random()*0.09).toFixed(3)})`;
          ctx.lineWidth = 0.5 + Math.random()*1.5;
          ctx.beginPath(); ctx.moveTo(0, gy);
          for (let sx = 0; sx <= size; sx += 60) ctx.lineTo(sx, gy+(Math.random()-0.5)*4);
          ctx.stroke();
        }
        ctx.restore();
        // Staggered butt joint
        const jx = i % 2 === 0 ? size*0.56 : size*0.38;
        ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(jx, y+1, 2, pH-2);
        ctx.fillStyle = "rgba(255,255,255,0.09)"; ctx.fillRect(jx+2, y+1, 1, pH-2);
        // Board seam
        ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(0, y, size, 1.5);
        // LVP polyurethane sheen
        if (material === "lvp") {
          const sheen = ctx.createLinearGradient(0, y+1, 0, y+pH);
          sheen.addColorStop(0,   "rgba(255,255,255,0.12)");
          sheen.addColorStop(0.3, "rgba(255,255,255,0.02)");
          sheen.addColorStop(1,   "rgba(0,0,0,0.03)");
          ctx.fillStyle = sheen; ctx.fillRect(0, y+1, size, pH-2);
        }
      }
      break;
    }

    // ── CARPET ──
    case "carpet": {
      addGrain(ctx, size, 18000, 0.09);
      for (let y2 = 0; y2 < size; y2 += 2) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.random()*0.028).toFixed(3)})`;
        ctx.fillRect(0, y2, size*(0.2+Math.random()*0.8), 1);
      }
      break;
    }

    // ── POLISHED CONCRETE ──
    case "concrete": {
      addGrain(ctx, size, 5000, 0.055);
      for (let i = 0; i < 100; i++) {
        const ax=Math.random()*size, ay=Math.random()*size, ar=1+Math.random()*3.5;
        ctx.fillStyle = `rgba(${Math.random()>0.5?"255,255,255":"0,0,0"},${(0.06+Math.random()*0.10).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI*2); ctx.fill();
      }
      for (let c = 0; c < 3; c++) {
        ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 1;
        ctx.beginPath();
        let cx=Math.random()*size, cy=Math.random()*size; ctx.moveTo(cx, cy);
        for (let s = 0; s < 6; s++) { cx+=(Math.random()-0.5)*90; cy+=(Math.random()-0.5)*90; ctx.lineTo(cx, cy); }
        ctx.stroke();
      }
      break;
    }

    // ── INTERIOR PAINT ──
    case "paint": {
      const pg2 = ctx.createLinearGradient(0, 0, size*0.4, size);
      pg2.addColorStop(0, "rgba(255,255,255,0.05)"); pg2.addColorStop(1, "rgba(0,0,0,0.04)");
      ctx.fillStyle = pg2; ctx.fillRect(0, 0, size, size);
      addGrain(ctx, size, 500, 0.022);
      break;
    }

    // ── WAINSCOTING ──
    case "wainscoting": {
      const panH = size*0.65; const railH = size*0.08;
      const panels = 3; const pW = size/panels; const inset = 16;
      const railG = ctx.createLinearGradient(0, panH-railH/2, 0, panH+railH/2);
      railG.addColorStop(0,"rgba(255,255,255,0.22)"); railG.addColorStop(0.5,"rgba(0,0,0,0)"); railG.addColorStop(1,"rgba(0,0,0,0.18)");
      ctx.fillStyle = lighten(colorHex,18); ctx.fillRect(0, panH-railH/2, size, railH);
      ctx.fillStyle = railG; ctx.fillRect(0, panH-railH/2, size, railH);
      for (let i = 0; i < panels; i++) {
        const px=i*pW+inset, py=inset, pw=pW-inset*2, ph=panH-railH/2-inset*2;
        ctx.fillStyle = darken(colorHex, 9); ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = lighten(colorHex, 6); ctx.fillRect(px+8, py+8, pw-16, ph-16);
        ctx.fillStyle = "rgba(0,0,0,0.20)"; ctx.fillRect(px, py, pw, 3); ctx.fillRect(px, py, 3, ph);
        ctx.fillStyle = "rgba(255,255,255,0.24)"; ctx.fillRect(px+pw-3, py, 3, ph); ctx.fillRect(px, py+ph-3, pw, 3);
        ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(px+8, py+8, pw-16, 2); ctx.fillRect(px+8, py+8, 2, ph-16);
        ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(px+pw-10, py+8, 2, ph-16); ctx.fillRect(px+8, py+ph-10, pw-16, 2);
      }
      break;
    }

    // ── SHIPLAP ──
    case "shiplap": {
      const boards = 10; const bH = size / boards; const reveal = 4;
      for (let i = 0; i < boards; i++) {
        const y = i * bH;
        ctx.fillStyle = `rgb(${vary(r,6)|0},${vary(g,6)|0},${vary(b,6)|0})`;
        ctx.fillRect(0, y, size, bH-reveal);
        const bg2 = ctx.createLinearGradient(0, y, 0, y+bH-reveal);
        bg2.addColorStop(0,   "rgba(255,255,255,0.10)");
        bg2.addColorStop(0.2, "rgba(255,255,255,0.00)");
        bg2.addColorStop(0.8, "rgba(0,0,0,0.00)");
        bg2.addColorStop(1,   "rgba(0,0,0,0.18)");
        ctx.fillStyle = bg2; ctx.fillRect(0, y, size, bH-reveal);
        ctx.fillStyle = "rgba(0,0,0,0.60)"; ctx.fillRect(0, y+bH-reveal, size, reveal);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0, y, size, 1);
      }
      addGrain(ctx, size, 1200, 0.022);
      break;
    }

    // ── VINYL SOFFIT PANEL — wide horizontal channels with shadow grooves ──
    case "soffit_panel": {
      const panels = 4; // ~4 wide channels visible per panel width
      const pH = size / panels;
      for (let i = 0; i < panels; i++) {
        const y = i * pH;
        // Main channel face — very slight per-panel color variation
        ctx.fillStyle = `rgb(${vary(r,3)|0},${vary(g,3)|0},${vary(b,3)|0})`;
        ctx.fillRect(0, y, size, pH);
        // Bevel highlight at top of each channel
        const hi = ctx.createLinearGradient(0, y, 0, y + pH * 0.14);
        hi.addColorStop(0, "rgba(255,255,255,0.28)");
        hi.addColorStop(1, "rgba(255,255,255,0.00)");
        ctx.fillStyle = hi; ctx.fillRect(0, y, size, pH * 0.14);
        // Subtle sheen band across mid-face (vinyl plastic gloss)
        const sheen = ctx.createLinearGradient(0, y + pH*0.18, 0, y + pH*0.45);
        sheen.addColorStop(0, "rgba(255,255,255,0.10)");
        sheen.addColorStop(1, "rgba(255,255,255,0.00)");
        ctx.fillStyle = sheen; ctx.fillRect(0, y + pH*0.18, size, pH * 0.27);
        // Shadow groove at bottom of each channel
        const groove = ctx.createLinearGradient(0, y + pH*0.78, 0, y + pH);
        groove.addColorStop(0, "rgba(0,0,0,0.00)");
        groove.addColorStop(1, "rgba(0,0,0,0.38)");
        ctx.fillStyle = groove; ctx.fillRect(0, y + pH*0.78, size, pH * 0.22);
        // Hard dark joint line + thin highlight below it
        ctx.fillStyle = "rgba(0,0,0,0.58)"; ctx.fillRect(0, y + pH - 3, size, 3);
        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0, y + pH - 0.5, size, 1.5);
        // Vent perforation slots — evenly spaced along each channel
        const ventW = 10, ventH = 2.5;
        const ventCount = 10;
        for (let vi = 0; vi < ventCount; vi++) {
          const vx = (size / ventCount) * (vi + 0.5) - ventW / 2;
          const vy = y + pH * 0.44;
          ctx.fillStyle = "rgba(0,0,0,0.30)";
          ctx.fillRect(vx, vy, ventW, ventH);
          ctx.fillStyle = "rgba(0,0,0,0.10)";
          ctx.fillRect(vx, vy + ventH, ventW, 1);
        }
      }
      addGrain(ctx, size, 600, 0.007);
      break;
    }

    default:
      addGrain(ctx, size, 500, 0.03);
      break;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rX, rY);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  return tex;
}

// ─── Material physics ─────────────────────────────────────────────────────────

const MAT_PHYSICS: Record<string, { roughness: number; metalness: number; envMapIntensity?: number }> = {
  hardie:       { roughness: 0.87, metalness: 0,    envMapIntensity: 0.45 },
  hardie_shake: { roughness: 0.90, metalness: 0,    envMapIntensity: 0.35 },
  hardie_panel: { roughness: 0.82, metalness: 0,    envMapIntensity: 0.40 },
  hardie_batten:{ roughness: 0.85, metalness: 0,    envMapIntensity: 0.38 },
  vinyl:        { roughness: 0.30, metalness: 0.02, envMapIntensity: 1.10 },
  lp:           { roughness: 0.86, metalness: 0,    envMapIntensity: 0.40 },
  metal:        { roughness: 0.15, metalness: 0.95, envMapIntensity: 2.20 },
  metal_corr:   { roughness: 0.22, metalness: 0.90, envMapIntensity: 2.00 },
  wood:         { roughness: 0.92, metalness: 0,    envMapIntensity: 0.25 },
  asphalt:      { roughness: 0.98, metalness: 0,    envMapIntensity: 0.08 },
  tpo:          { roughness: 0.48, metalness: 0.02, envMapIntensity: 0.50 },
  tile:         { roughness: 0.06, metalness: 0.02, envMapIntensity: 1.60 },
  hardwood:     { roughness: 0.60, metalness: 0,    envMapIntensity: 0.70 },
  lvp:          { roughness: 0.50, metalness: 0.02, envMapIntensity: 0.80 },
  carpet:       { roughness: 0.99, metalness: 0,    envMapIntensity: 0.05 },
  concrete:     { roughness: 0.95, metalness: 0,    envMapIntensity: 0.12 },
  paint:        { roughness: 0.88, metalness: 0,    envMapIntensity: 0.30 },
  wainscoting:  { roughness: 0.72, metalness: 0,    envMapIntensity: 0.45 },
  shiplap:      { roughness: 0.88, metalness: 0,    envMapIntensity: 0.32 },
  soffit_panel: { roughness: 0.28, metalness: 0.02, envMapIntensity: 1.00 },
};

// ─── Normal-map strength per material ────────────────────────────────────────
const MAT_NORMAL_STRENGTH: Record<string, number> = {
  hardie: 5.5, hardie_shake: 5.5, hardie_panel: 3.5, hardie_batten: 4.5,
  vinyl: 3.5, lp: 5.0, wood: 3.2, shiplap: 4.0, wainscoting: 3.0,
  metal: 6.0, metal_corr: 7.0, tpo: 1.5,
  soffit_panel: 3.0,
  asphalt: 5.0, tile: 2.5, hardwood: 2.8, lvp: 2.0,
  carpet: 1.8, concrete: 1.6, paint: 0.6,
};

// ─── Module-level cache: normal maps are colour-independent (per matType+repeat) ──
const normalMapCache = new Map<string, THREE.Texture>();

// ─── Real Photo Textures — PolyHaven CC0 PBR, 1K JPEG, CORS-enabled ──────────
const PH_BASE = "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k";
const PH_THUMB = "https://cdn.polyhaven.com/asset_img/thumbs";
interface PhUrls { id: string; diff: string; nor: string; rough: string; ao: string }
const POLY_URLS: Record<string, PhUrls> = {
  // hardie, hardie_shake, hardie_panel, hardie_batten, vinyl, lp, asphalt — all procedural
  // (PolyHaven has no matching siding/shingle textures; procedural draws the correct patterns)
  wood:       { id: "brown_planks_03",         diff: `${PH_BASE}/brown_planks_03/brown_planks_03_diff_1k.jpg`,                       nor: `${PH_BASE}/brown_planks_03/brown_planks_03_nor_gl_1k.jpg`,         rough: `${PH_BASE}/brown_planks_03/brown_planks_03_rough_1k.jpg`,       ao: `${PH_BASE}/brown_planks_03/brown_planks_03_ao_1k.jpg` },
  shiplap:    { id: "wood_planks_grey",         diff: `${PH_BASE}/wood_planks_grey/wood_planks_grey_diff_1k.jpg`,                     nor: `${PH_BASE}/wood_planks_grey/wood_planks_grey_nor_gl_1k.jpg`,       rough: `${PH_BASE}/wood_planks_grey/wood_planks_grey_rough_1k.jpg`,     ao: `${PH_BASE}/wood_planks_grey/wood_planks_grey_ao_1k.jpg` },
  metal:      { id: "box_profile_metal_sheet",  diff: `${PH_BASE}/box_profile_metal_sheet/box_profile_metal_sheet_diff_1k.jpg`,       nor: `${PH_BASE}/box_profile_metal_sheet/box_profile_metal_sheet_nor_gl_1k.jpg`, rough: `${PH_BASE}/box_profile_metal_sheet/box_profile_metal_sheet_rough_1k.jpg`, ao: `${PH_BASE}/box_profile_metal_sheet/box_profile_metal_sheet_ao_1k.jpg` },
  metal_corr: { id: "corrugated_iron",          diff: `${PH_BASE}/corrugated_iron/corrugated_iron_diff_1k.jpg`,                       nor: `${PH_BASE}/corrugated_iron/corrugated_iron_nor_gl_1k.jpg`,         rough: `${PH_BASE}/corrugated_iron/corrugated_iron_rough_1k.jpg`,       ao: `${PH_BASE}/corrugated_iron/corrugated_iron_ao_1k.jpg` },
  tpo:        { id: "concrete_wall_001",        diff: `${PH_BASE}/concrete_wall_001/concrete_wall_001_diff_1k.jpg`,                   nor: `${PH_BASE}/concrete_wall_001/concrete_wall_001_nor_gl_1k.jpg`,     rough: `${PH_BASE}/concrete_wall_001/concrete_wall_001_rough_1k.jpg`,   ao: `${PH_BASE}/concrete_wall_001/concrete_wall_001_ao_1k.jpg` },
  concrete:   { id: "concrete_wall_007",        diff: `${PH_BASE}/concrete_wall_007/concrete_wall_007_diff_1k.jpg`,                   nor: `${PH_BASE}/concrete_wall_007/concrete_wall_007_nor_gl_1k.jpg`,     rough: `${PH_BASE}/concrete_wall_007/concrete_wall_007_rough_1k.jpg`,   ao: `${PH_BASE}/concrete_wall_007/concrete_wall_007_ao_1k.jpg` },
  hardwood:   { id: "plank_flooring",           diff: `${PH_BASE}/plank_flooring/plank_flooring_diff_1k.jpg`,                         nor: `${PH_BASE}/plank_flooring/plank_flooring_nor_gl_1k.jpg`,           rough: `${PH_BASE}/plank_flooring/plank_flooring_rough_1k.jpg`,         ao: `${PH_BASE}/plank_flooring/plank_flooring_ao_1k.jpg` },
  lvp:        { id: "plank_flooring_02",        diff: `${PH_BASE}/plank_flooring_02/plank_flooring_02_diff_1k.jpg`,                   nor: `${PH_BASE}/plank_flooring_02/plank_flooring_02_nor_gl_1k.jpg`,     rough: `${PH_BASE}/plank_flooring_02/plank_flooring_02_rough_1k.jpg`,   ao: `${PH_BASE}/plank_flooring_02/plank_flooring_02_ao_1k.jpg` },
  paint:      { id: "beige_wall_001",           diff: `${PH_BASE}/beige_wall_001/beige_wall_001_diff_1k.jpg`,                         nor: `${PH_BASE}/beige_wall_001/beige_wall_001_nor_gl_1k.jpg`,           rough: `${PH_BASE}/beige_wall_001/beige_wall_001_rough_1k.jpg`,         ao: `${PH_BASE}/beige_wall_001/beige_wall_001_ao_1k.jpg` },
};

function polyThumbUrl(matType: string): string | null {
  const u = POLY_URLS[matType];
  return u ? `${PH_THUMB}/${u.id}.png?width=64` : null;
}

// Module-level cache: keyed by "url:rX:rY"
const desatCache = new Map<string, THREE.CanvasTexture>();

// Convert a loaded THREE.Texture to a near-white grayscale CanvasTexture
// so the material's `color` prop tints it with the user's chosen colour.
function desaturateToTintable(tex: THREE.Texture, rX: number, rY: number): THREE.CanvasTexture {
  const src = (tex.image as HTMLImageElement | null)?.src ?? tex.uuid;
  const key = `${src}:${rX}:${rY}`;
  const cached = desatCache.get(key);
  if (cached) return cached;

  const W = 1024, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(tex.image as CanvasImageSource, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;

  // Mean luminance for normalisation
  let sum = 0;
  for (let i = 0; i < d.length; i += 4)
    sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
  const mean = sum / (d.length / 4);

  // Desaturate + normalise to ~0.82 so colour tinting stays vivid
  const target = 0.82, contrast = 0.55;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const v = Math.max(0, Math.min(255, Math.round((target + (lum - mean) * contrast) * 255)));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);

  const result = new THREE.CanvasTexture(c);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.repeat.set(rX, rY);
  result.anisotropy = 16;
  result.generateMipmaps = true;
  result.needsUpdate = true;
  desatCache.set(key, result);
  return result;
}

function configureNorTex(t: THREE.Texture, rX: number, rY: number) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rX, rY);
  t.anisotropy = 16;
  t.needsUpdate = true;
  return t;
}

// ─── Sobel-filter normal map from a grayscale canvas ─────────────────────────
function computeNormalMapCanvas(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const { width: W, height: H } = src;
  const srcData = src.getContext("2d")!.getImageData(0, 0, W, H).data;
  const dst = document.createElement("canvas");
  dst.width = W; dst.height = H;
  const dstCtx = dst.getContext("2d")!;
  const dstImg = dstCtx.createImageData(W, H);
  const dd = dstImg.data;

  const L = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(W - 1, x));
    const cy = Math.max(0, Math.min(H - 1, y));
    const i = (cy * W + cx) * 4;
    return (srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114) / 255;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Sobel 3×3
      const tl = L(x-1,y-1), t = L(x,y-1), tr = L(x+1,y-1);
      const l  = L(x-1,y  ),               r  = L(x+1,y  );
      const bl = L(x-1,y+1), b = L(x,y+1), br = L(x+1,y+1);
      const dx = (tr + 2*r + br - tl - 2*l - bl) * strength;
      const dy = (bl + 2*b + br - tl - 2*t - tr) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const i = (y * W + x) * 4;
      dd[i]   = Math.round((dx / len * 0.5 + 0.5) * 255);
      dd[i+1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      dd[i+2] = Math.round((dz / len * 0.5 + 0.5) * 255);
      dd[i+3] = 255;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return dst;
}

// ─── PBR material hook — colour map + Sobel normal map ───────────────────────
function useTextureMaterial(matType: string, colorHex: string, rX = 2, rY = 2, texRotation = 0) {
  const { colorTex, normalTex, ns } = useMemo(() => {
    // Colour map — 2K resolution for crisp siding detail
    const colorTex = createProceduralTexture(matType, colorHex, rX, rY, 2048);
    if (texRotation !== 0) {
      colorTex.rotation = texRotation;
      colorTex.center.set(0.5, 0.5);
    }

    // Normal map — colour-independent, cached per material+repeat
    const nmKey = `${matType}:${rX}:${rY}:${texRotation}`;
    let normalTex = normalMapCache.get(nmKey);
    if (!normalTex) {
      // 512px for crisper normal detail on siding
      const nmSrc = createProceduralTexture(matType, "#909090", rX, rY, 512);
      const nmCanvas = computeNormalMapCanvas(nmSrc.image as HTMLCanvasElement, MAT_NORMAL_STRENGTH[matType] ?? 2.5);
      normalTex = new THREE.CanvasTexture(nmCanvas);
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.repeat.set(rX, rY);
      if (texRotation !== 0) { normalTex.rotation = texRotation; normalTex.center.set(0.5, 0.5); }
      normalTex.anisotropy = 8;
      normalTex.generateMipmaps = true;
      normalMapCache.set(nmKey, normalTex);
    }

    const nStr = Math.min(1.2, (MAT_NORMAL_STRENGTH[matType] ?? 2.5) * 0.38);
    const ns = new THREE.Vector2(nStr, nStr);
    return { colorTex, normalTex, ns };
  }, [matType, colorHex, rX, rY, texRotation]);

  const physics = MAT_PHYSICS[matType] ?? { roughness: 0.85, metalness: 0, envMapIntensity: 0.5 };
  return {
    map: colorTex,
    normalMap: normalTex,
    normalScale: ns,
    roughness: physics.roughness,
    metalness: physics.metalness,
    envMapIntensity: physics.envMapIntensity ?? 0.5,
  };
}

// ─── Material Swatch ──────────────────────────────────────────────────────────

function MaterialSwatch({ material, color, size = 28 }: { material: string; color: string; size?: number }) {
  const thumbUrl = polyThumbUrl(material);

  // Always call useMemo (Rules of Hooks) — skip computation when real thumb is available
  const proceduralSrc = useMemo(() => {
    if (thumbUrl) return "";
    const c = document.createElement("canvas");
    c.width = size * 2; c.height = size * 2;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color; ctx.fillRect(0, 0, size * 2, size * 2);
    const tex = createProceduralTexture(material, color, 1, 1);
    if (tex.image) ctx.drawImage(tex.image as HTMLCanvasElement, 0, 0, size * 2, size * 2);
    return c.toDataURL();
  }, [material, color, size, thumbUrl]);

  if (thumbUrl) {
    return (
      <div className="relative rounded overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
        <img src={thumbUrl} width={size} height={size}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous" alt="" />
        <div className="absolute inset-0 rounded" style={{ backgroundColor: color, mixBlendMode: "multiply", opacity: 0.50 }} />
      </div>
    );
  }

  return (
    <img src={proceduralSrc} width={size} height={size}
      className="rounded flex-shrink-0" style={{ imageRendering: "pixelated" }} />
  );
}

// ─── Product List Selector ────────────────────────────────────────────────────

function ProductSelector({
  products, selectedId, selectedColor, onSelect, onColorChange, label,
}: {
  products: Product[];
  selectedId: string;
  selectedColor: string;
  onSelect: (p: Product) => void;
  onColorChange: (hex: string) => void;
  label: string;
}) {
  const [colorGroup, setColorGroup] = useState("all");
  const selected = products.find(p => p.id === selectedId) ?? products[0];

  const paletteColors = colorGroup === "all"
    ? MASTER_COLOR_PALETTE.flatMap(g => g.colors)
    : (MASTER_COLOR_PALETTE.find(g => g.group === colorGroup)?.colors ?? []);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">{label}</label>

      {/* Scrollable material list */}
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-44 overflow-y-auto">
        {products.map(p => {
          const isActive = p.id === selectedId;
          return (
            <button key={p.id} onClick={() => onSelect(p)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                isActive ? "bg-primary/8 border-l-2 border-l-primary" : ""
              }`}>
              <MaterialSwatch material={p.matType} color={isActive ? selectedColor : (p.suggestedColors?.[0] ?? selectedColor)} size={28} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                  {p.name}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">{p.brand}</p>
                <p className="text-[9px] text-muted-foreground/70 leading-tight">{p.detail}</p>
              </div>
              {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Independent color palette — any color with any material */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-medium">Color — aplica a cualquier material</p>
          <p className="text-[9px] font-mono text-primary font-semibold">{selectedColor.toUpperCase()}</p>
        </div>
        {/* Brand filter pills */}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setColorGroup("all")}
            className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
              colorGroup === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>Todos</button>
          {MASTER_COLOR_PALETTE.map(g => (
            <button key={g.group} onClick={() => setColorGroup(g.group)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
                colorGroup === g.group ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}>{g.short}</button>
          ))}
        </div>
        {/* Color swatches — scrollable grid */}
        <div className="flex flex-wrap gap-1.5 items-start max-h-28 overflow-y-auto pr-0.5 pt-0.5">
          {paletteColors.map(c => (
            <button key={c.hex + c.label} onClick={() => onColorChange(c.hex)} title={c.label}
              className="rounded overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0"
              style={{
                borderColor: selectedColor === c.hex ? "#f97316" : "transparent",
                boxShadow: selectedColor === c.hex ? "0 0 0 1px #f97316" : "none",
              }}>
              <MaterialSwatch material={selected.matType} color={c.hex} size={22} />
            </button>
          ))}
          <input type="color" value={selectedColor} onChange={e => onColorChange(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-border flex-shrink-0" title="Color personalizado" />
        </div>
      </div>
    </div>
  );
}

// ─── 3D Wall Components ───────────────────────────────────────────────────────

// Procedural canvas wall — instant, used as loading fallback
function ProceduralWallMesh({ pos, size, matType, color, repeat }: {
  pos: [number,number,number]; size: [number,number,number];
  matType: string; color: string; repeat: [number,number];
}) {
  const matProps = useTextureMaterial(matType, color, repeat[0], repeat[1]);
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}

// Real photo wall — PolyHaven diffuse + normal + roughness + ao, desaturated for colour tinting
function RealPhotoWallMesh({ pos, size, matType, color, repeat }: {
  pos: [number,number,number]; size: [number,number,number];
  matType: string; color: string; repeat: [number,number];
}) {
  const urls = POLY_URLS[matType]!;
  const [diffTex, norTex, roughTex, aoTex] = useTexture([urls.diff, urls.nor, urls.rough, urls.ao]);
  const physics = MAT_PHYSICS[matType] ?? { roughness: 0.85, metalness: 0, envMapIntensity: 0.5 };
  const grayscaleTex = useMemo(() => desaturateToTintable(diffTex, repeat[0], repeat[1]), [diffTex, repeat]);
  useMemo(() => configureNorTex(norTex, repeat[0], repeat[1]), [norTex, repeat]);
  useMemo(() => configureNorTex(roughTex, repeat[0], repeat[1]), [roughTex, repeat]);
  useMemo(() => configureNorTex(aoTex, repeat[0], repeat[1]), [aoTex, repeat]);
  const nStr = Math.min(1.0, (MAT_NORMAL_STRENGTH[matType] ?? 2.5) * 0.30);
  const ns = useMemo(() => new THREE.Vector2(nStr, nStr), [nStr]);
  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        map={grayscaleTex} normalMap={norTex} normalScale={ns}
        roughnessMap={roughTex} aoMap={aoTex} aoMapIntensity={0.9}
        color={threeColor}
        roughness={physics.roughness} metalness={physics.metalness}
        envMapIntensity={physics.envMapIntensity ?? 0.5}
      />
    </mesh>
  );
}

// Router: shows procedural as fallback while real photo streams in
function TexturedWall(props: {
  pos: [number,number,number]; size: [number,number,number];
  matType: string; color: string; repeat: [number,number];
}) {
  if (!POLY_URLS[props.matType]) return <ProceduralWallMesh {...props} />;
  return (
    <Suspense fallback={<ProceduralWallMesh {...props} />}>
      <RealPhotoWallMesh {...props} />
    </Suspense>
  );
}

// ─── Roof Components ──────────────────────────────────────────────────────────
type RoofProps = { w: number; d: number; wallH: number; riseH: number; color: string; matType: string; overhang?: number; wallColor?: string; trimColor?: string; wallMatType?: string; wallRpt?: [number,number] };

// Gable end wall triangle with siding texture — rY is adjusted so course HEIGHT matches the wall
function GableWallTriangle({ shape, position, matType, color, rX, rY, wallH, riseH }: {
  shape: THREE.Shape; position: [number,number,number];
  matType: string; color: string; rX: number; rY: number;
  wallH: number; riseH: number;
}) {
  // Scale repeat so one siding course in the triangle is the same height as in the wall below
  const adjRY = rY * (riseH / Math.max(wallH, 0.01));
  const matProps = useTextureMaterial(matType, color, rX, adjRY);
  return (
    <mesh position={position}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial {...matProps} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Shared gable geometry — receives matProps from either procedural or real-photo hook
function GableRoofGeometry({ w, d, wallH, riseH, color, overhang = 0.45, matProps, wallColor, trimColor, wallMatType, wallRpt }: RoofProps & { matProps: object }) {
  const halfW = w / 2;
  // rakeOv: tight rake overhang at gable ends (~3 in). Eave overhang (±X) is handled by slopeLen extension.
  const rakeOv = Math.min(0.075, overhang * 0.15);
  const halfD = d / 2 + rakeOv;
  const slopeLen = Math.sqrt(halfW * halfW + riseH * riseH);
  const angle = Math.atan2(riseH, halfW);
  // Gable end triangle uses WALL color (siding), not roof color
  const gableColor = wallColor ?? "#D4C9B0";
  // Rake board (sloped trim) color — use trim/fascia color or white
  const rakeColor = trimColor ?? "#F0EDE8";
  const fH = 0.22, fT = 0.055; // fascia/rake board dims

  const triShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfW, 0); s.lineTo(halfW, 0); s.lineTo(0, riseH); s.closePath();
    return s;
  }, [halfW, riseH]);

  // Gable-end z positions — rake board face and wall faces (siding fill)
  const gableZsOuter = [-(d / 2 + rakeOv), (d / 2 + rakeOv)]; // outer rake face (rake boards)
  const gableZsWall  = [-(d / 2),           (d / 2)];          // wall-face (siding fill above plate)
  // Rake board sits just in FRONT of the slope panel face, not inside it
  const rakeFaceOffset = fT / 2 + 0.01;

  // ── Slope geometry: span from ridge peak to outer eave ───────────────────
  // Extending at the same pitch angle so the bottom outer corner sits at the
  // fascia-top level (wallH − ov·riseH/halfW). Center is the midpoint of that span.
  const totalX      = halfW + overhang;                          // horiz reach (wall→eave)
  const eaveSlopeLen = slopeLen * totalX / halfW;                // true slope-surface length to eave
  const slopeCenterX = totalX / 2;                               // x distance from ridge to center
  const slopeCenterY = wallH + riseH / 2 - overhang * riseH / (2 * halfW); // y of panel center

  return (
    <group>
      {/* Left slope panel — bottom-outer corner lands at (-(halfW+ov), wallH-ov·tanθ) */}
      <mesh position={[-slopeCenterX, slopeCenterY, 0]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[eaveSlopeLen, 0.18, halfD * 2]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right slope panel */}
      <mesh position={[slopeCenterX, slopeCenterY, 0]} rotation={[0, 0, -angle]} castShadow>
        <boxGeometry args={[eaveSlopeLen, 0.18, halfD * 2]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Ridge cap */}
      <mesh position={[0, wallH + riseH, 0]} castShadow>
        <boxGeometry args={[0.22, 0.13, halfD * 2 + 0.08]} />
        <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
      </mesh>
      {/* Gable-end wall triangles AT WALL FACE — fills the siding gap above wall plate, textured */}
      {gableZsWall.map((z, i) => (
        wallMatType
          ? <GableWallTriangle key={`tri-wall-${i}`} shape={triShape} position={[0, wallH, z]}
              matType={wallMatType} color={wallColor ?? gableColor}
              rX={wallRpt?.[0] ?? 2} rY={wallRpt?.[1] ?? 2}
              wallH={wallH} riseH={riseH} />
          : <mesh key={`tri-wall-${i}`} position={[0, wallH, z]}>
              <shapeGeometry args={[triShape]} />
              <meshStandardMaterial color={gableColor} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
            </mesh>
      ))}
      {/* Rake boards — sit on the OUTER face of the slope panel (not inside it) */}
      {gableZsOuter.map((z, gi) => {
        const zFront = gi === 0 ? z - rakeFaceOffset : z + rakeFaceOffset;
        return (
          <group key={`rake-${gi}`}>
            {/* Left-slope rake */}
            <mesh position={[-halfW / 2, wallH + riseH / 2, zFront]} rotation={[0, 0, angle]} castShadow>
              <boxGeometry args={[slopeLen + overhang * 0.5, fH, fT]} />
              <meshStandardMaterial color={rakeColor} roughness={0.65} metalness={0} />
            </mesh>
            {/* Right-slope rake */}
            <mesh position={[halfW / 2, wallH + riseH / 2, zFront]} rotation={[0, 0, -angle]} castShadow>
              <boxGeometry args={[slopeLen + overhang * 0.5, fH, fT]} />
              <meshStandardMaterial color={rakeColor} roughness={0.65} metalness={0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ProceduralGableRoof(p: RoofProps) {
  const texRot = p.matType === "asphalt" ? Math.PI / 2 : 0;
  const matProps = useTextureMaterial(p.matType, p.color, 3, 2, texRot);
  return <GableRoofGeometry {...p} matProps={matProps} />;
}
function RealPhotoGableRoof(p: RoofProps) {
  const urls = POLY_URLS[p.matType]!;
  const [diffTex, norTex, roughTex, aoTex] = useTexture([urls.diff, urls.nor, urls.rough, urls.ao]);
  const physics = MAT_PHYSICS[p.matType] ?? { roughness: 0.85, metalness: 0, envMapIntensity: 0.5 };
  const grayscaleTex = useMemo(() => desaturateToTintable(diffTex, 3, 2), [diffTex]);
  useMemo(() => configureNorTex(norTex, 3, 2), [norTex]);
  useMemo(() => configureNorTex(roughTex, 3, 2), [roughTex]);
  useMemo(() => configureNorTex(aoTex, 3, 2), [aoTex]);
  const nStr = Math.min(1.0, (MAT_NORMAL_STRENGTH[p.matType] ?? 2.5) * 0.30);
  const ns = useMemo(() => new THREE.Vector2(nStr, nStr), [nStr]);
  const threeColor = useMemo(() => new THREE.Color(p.color), [p.color]);
  const matProps = { map: grayscaleTex, normalMap: norTex, normalScale: ns, roughnessMap: roughTex, aoMap: aoTex, aoMapIntensity: 0.9,
    color: threeColor, roughness: physics.roughness, metalness: physics.metalness, envMapIntensity: physics.envMapIntensity ?? 0.5 };
  return <GableRoofGeometry {...p} matProps={matProps} />;
}
function GableRoof(p: RoofProps) {
  if (!POLY_URLS[p.matType]) return <ProceduralGableRoof {...p} />;
  return (
    <Suspense fallback={<ProceduralGableRoof {...p} />}>
      <RealPhotoGableRoof {...p} />
    </Suspense>
  );
}

function ProceduralFlatRoof(p: RoofProps) {
  const matProps = useTextureMaterial(p.matType, p.color, 2, 2);
  const ov = p.overhang ?? 0.45;
  return (
    <mesh position={[0, p.wallH + Math.max(p.riseH, 0.08) / 2, 0]} castShadow>
      <boxGeometry args={[p.w + ov * 2, Math.max(p.riseH, 0.18), p.d + ov * 2]} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}
function RealPhotoFlatRoof(p: RoofProps) {
  const urls = POLY_URLS[p.matType]!;
  const [diffTex, norTex, roughTex, aoTex] = useTexture([urls.diff, urls.nor, urls.rough, urls.ao]);
  const physics = MAT_PHYSICS[p.matType] ?? { roughness: 0.85, metalness: 0, envMapIntensity: 0.5 };
  const grayscaleTex = useMemo(() => desaturateToTintable(diffTex, 2, 2), [diffTex]);
  useMemo(() => configureNorTex(norTex, 2, 2), [norTex]);
  useMemo(() => configureNorTex(roughTex, 2, 2), [roughTex]);
  useMemo(() => configureNorTex(aoTex, 2, 2), [aoTex]);
  const nStr = Math.min(1.0, (MAT_NORMAL_STRENGTH[p.matType] ?? 2.5) * 0.30);
  const ns = useMemo(() => new THREE.Vector2(nStr, nStr), [nStr]);
  const threeColor = useMemo(() => new THREE.Color(p.color), [p.color]);
  const ov = p.overhang ?? 0.45;
  return (
    <mesh position={[0, p.wallH + Math.max(p.riseH, 0.08) / 2, 0]} castShadow>
      <boxGeometry args={[p.w + ov * 2, Math.max(p.riseH, 0.18), p.d + ov * 2]} />
      <meshStandardMaterial
        map={grayscaleTex} normalMap={norTex} normalScale={ns}
        roughnessMap={roughTex} aoMap={aoTex} aoMapIntensity={0.9}
        color={threeColor} roughness={physics.roughness} metalness={physics.metalness}
        envMapIntensity={physics.envMapIntensity ?? 0.5}
      />
    </mesh>
  );
}
function FlatRoof(p: RoofProps) {
  if (!POLY_URLS[p.matType]) return <ProceduralFlatRoof {...p} />;
  return (
    <Suspense fallback={<ProceduralFlatRoof {...p} />}>
      <RealPhotoFlatRoof {...p} />
    </Suspense>
  );
}

// ─── Advanced Architectural Components ────────────────────────────────────────

function FoundationBand({ w, d, foundationHFt = 1.5, SC }: { w: number; d: number; foundationHFt?: number; SC: number }) {
  const fh = Math.max(0.3, foundationHFt) * SC;
  return (
    <group>
      <mesh position={[0, -fh / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.16, fh, d + 0.16]} />
        <meshStandardMaterial color="#7C7870" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[w + 0.23, 0.07, d + 0.23]} />
        <meshStandardMaterial color="#6B6862" roughness={0.92} metalness={0} />
      </mesh>
    </group>
  );
}

function GambrelRoofGeometry({ w, d, wallH, riseH, color, overhang = 0.45, matProps, wallColor, trimColor }: RoofProps & { matProps: object }) {
  const halfW = w / 2;
  const halfD = d / 2 + overhang;
  const kneeX = halfW * 0.50;
  const kneeY = riseH * 0.38;
  const lowerRun = (halfW + overhang) - kneeX;
  const lowerRise = kneeY;
  const lowerLen = Math.sqrt(lowerRun * lowerRun + lowerRise * lowerRise);
  const lowerAngle = Math.atan2(lowerRise, lowerRun);
  const lowerCX = kneeX + lowerRun / 2;
  const lowerCY = wallH + lowerRise / 2;
  const upperRun = kneeX;
  const upperRise = riseH - kneeY;
  const upperLen = Math.sqrt(upperRun * upperRun + upperRise * upperRise);
  const upperAngle = Math.atan2(upperRise, upperRun);
  const upperCX = kneeX / 2;
  const upperCY = wallH + kneeY + upperRise / 2;
  const gambrelShape = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-(halfW + overhang), 0);
    sh.lineTo(-kneeX, kneeY);
    sh.lineTo(0, riseH);
    sh.lineTo(kneeX, kneeY);
    sh.lineTo(halfW + overhang, 0);
    sh.closePath();
    return sh;
  }, [halfW, kneeX, kneeY, riseH, overhang]);
  return (
    <group>
      <mesh position={[-lowerCX, lowerCY, 0]} rotation={[0, 0, lowerAngle]} castShadow><boxGeometry args={[lowerLen, 0.18, halfD * 2]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[lowerCX, lowerCY, 0]} rotation={[0, 0, -lowerAngle]} castShadow><boxGeometry args={[lowerLen, 0.18, halfD * 2]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[-upperCX, upperCY, 0]} rotation={[0, 0, upperAngle]} castShadow><boxGeometry args={[upperLen, 0.18, halfD * 2]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[upperCX, upperCY, 0]} rotation={[0, 0, -upperAngle]} castShadow><boxGeometry args={[upperLen, 0.18, halfD * 2]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[0, wallH + riseH, 0]} castShadow><boxGeometry args={[0.25, 0.15, halfD * 2 + 0.1]} /><meshStandardMaterial color={color} roughness={0.9} metalness={0} /></mesh>
      {[-kneeX, kneeX].map((kx, ki) => (
        <mesh key={ki} position={[kx, wallH + kneeY / 2, 0]} castShadow><boxGeometry args={[0.12, kneeY, halfD * 2]} /><meshStandardMaterial color={color} roughness={0.85} metalness={0} /></mesh>
      ))}
      {[-(d / 2 + overhang) + 0.05, (d / 2 + overhang) - 0.05].map((z, i) => (
        <mesh key={i} position={[0, wallH, z]}><shapeGeometry args={[gambrelShape]} /><meshStandardMaterial color={wallColor ?? "#D4C9B0"} roughness={0.85} metalness={0} side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  );
}
function ProceduralGambrelRoof(p: RoofProps) {
  const matProps = useTextureMaterial(p.matType, p.color, 3, 2);
  return <GambrelRoofGeometry {...p} matProps={matProps} />;
}
function GambrelRoof(p: RoofProps) {
  return <Suspense fallback={<ProceduralGambrelRoof {...p} />}><ProceduralGambrelRoof {...p} /></Suspense>;
}

function FrontPorch({ s, SC }: { s: StructureParams; SC: number }) {
  const halfD = s.depthFt * SC / 2;
  const pw = Math.min(s.widthFt * SC * 0.80, (s.porchWidthFt ?? 12) * SC);
  const pd = (s.porchDepthFt ?? 6) * SC;
  const wh = s.wallHeightFt * SC;
  const roofH = wh * (s.stories === 2 ? 0.50 : 0.88);
  const colH = roofH - 0.09;
  const colR = 0.075;
  const slabH = 0.12;
  const frontZ = -halfD;
  const porchFrontZ = frontZ - pd;
  const midZ = frontZ - pd / 2;
  const trimCol = s.trimColor ?? "#F0EDE8";
  const roofCol = s.roofColor ?? "#2C2C2C";
  const colXArr = [-pw / 2 + colR + 0.06, pw / 2 - colR - 0.06];
  const nBal = Math.max(4, Math.floor(pw / 0.19));
  return (
    <group>
      <mesh position={[0, -slabH / 2, midZ]} receiveShadow><boxGeometry args={[pw + 0.18, slabH, pd]} /><meshStandardMaterial color="#888" roughness={0.96} metalness={0} /></mesh>
      {[0, 1, 2].map(step => (
        <mesh key={step} position={[0, -(slabH + (2 - step) * 0.08 + 0.04), porchFrontZ - (step + 0.5) * 0.28]} receiveShadow>
          <boxGeometry args={[pw + 0.18 + step * 0.16, 0.08, 0.28]} /><meshStandardMaterial color="#7A7570" roughness={0.95} metalness={0} />
        </mesh>
      ))}
      {colXArr.map((cx, ci) => [porchFrontZ, frontZ].map((cz, cji) => (
        <mesh key={`col-${ci}-${cji}`} position={[cx, colH / 2, cz]} castShadow>
          <cylinderGeometry args={[colR, colR * 1.06, colH, 14]} /><meshStandardMaterial color={trimCol} roughness={0.50} metalness={0} />
        </mesh>
      )))}
      {colXArr.map((cx, ci) => [porchFrontZ, frontZ].map((cz, cji) => (
        <group key={`cap-${ci}-${cji}`}>
          <mesh position={[cx, colH + 0.055, cz]}><boxGeometry args={[colR * 3.2, 0.09, colR * 3.2]} /><meshStandardMaterial color={trimCol} roughness={0.50} /></mesh>
          <mesh position={[cx, 0.055, cz]}><boxGeometry args={[colR * 3.2, 0.09, colR * 3.2]} /><meshStandardMaterial color={trimCol} roughness={0.50} /></mesh>
        </group>
      )))}
      <mesh position={[0, colH + 0.045, porchFrontZ]}><boxGeometry args={[pw + 0.12, 0.14, 0.10]} /><meshStandardMaterial color={trimCol} roughness={0.6} /></mesh>
      <mesh position={[0, colH + 0.045, frontZ]}><boxGeometry args={[pw + 0.12, 0.14, 0.10]} /><meshStandardMaterial color={trimCol} roughness={0.6} /></mesh>
      {colXArr.map((cx, ci) => <mesh key={`sb-${ci}`} position={[cx, colH + 0.045, midZ]}><boxGeometry args={[0.10, 0.14, pd]} /><meshStandardMaterial color={trimCol} roughness={0.6} /></mesh>)}
      <mesh position={[0, roofH + 0.07, midZ]} castShadow receiveShadow><boxGeometry args={[pw + 0.30, 0.13, pd + 0.20]} /><meshStandardMaterial color={roofCol} roughness={0.88} metalness={0.05} /></mesh>
      <mesh position={[0, 0.88, porchFrontZ - 0.04]}><boxGeometry args={[pw + 0.04, 0.055, 0.04]} /><meshStandardMaterial color={trimCol} roughness={0.6} /></mesh>
      {Array.from({ length: nBal }).map((_, bi) => (
        <mesh key={bi} position={[-pw / 2 + (bi + 0.5) * (pw / nBal), 0.44, porchFrontZ - 0.04]}>
          <boxGeometry args={[0.028, 0.88, 0.028]} /><meshStandardMaterial color={trimCol} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function Chimney({ s, totalWh, SC }: { s: StructureParams; totalWh: number; SC: number }) {
  const rh = s.ridgeHeightFt * SC;
  const cx = (s.chimneyX ?? 0.3) * s.widthFt * SC / 2;
  const cW = 0.42, cD = 0.30;
  const top = totalWh + rh + 0.55;
  return (
    <group position={[cx, 0, 0]}>
      <mesh position={[0, top / 2, 0]} castShadow><boxGeometry args={[cW, top, cD]} /><meshStandardMaterial color="#8B4A3A" roughness={0.88} metalness={0} /></mesh>
      <mesh position={[0, top + 0.055, 0]}><boxGeometry args={[cW + 0.10, 0.10, cD + 0.10]} /><meshStandardMaterial color="#676460" roughness={0.85} metalness={0} /></mesh>
      <mesh position={[0, top + 0.15, 0]}><boxGeometry args={[0.17, 0.17, 0.13]} /><meshStandardMaterial color="#2A2A2A" roughness={0.8} metalness={0} /></mesh>
    </group>
  );
}

function DogHouseDormers({ s, totalWh, SC }: { s: StructureParams; totalWh: number; SC: number }) {
  const halfD = s.depthFt * SC / 2;
  const ov = (s.roofOverhang ?? 1.5) * SC;
  const rh = s.ridgeHeightFt * SC;
  const count = s.dormerCount ?? 2;
  const slopeRun = halfD + ov;
  const zPos = -(halfD * 0.50);
  const tFrac = (halfD * 0.50) / slopeRun;
  const yBase = totalWh + rh * (1 - tFrac);
  const dW = 0.88, dH = 0.66, dD = 0.58, dRiseH = 0.30;
  const trimCol = s.trimColor ?? "#F0EDE8";
  const roofCol = s.roofColor ?? "#2C2C2C";
  const wallCol = s.wallColor ?? "#E8D5B7";
  const bW = s.widthFt * SC;
  const positions = count === 1 ? [0] : count === 2 ? [-bW * 0.22, bW * 0.22] : [-bW * 0.30, 0, bW * 0.30];
  return (
    <group>
      {positions.map((xPos, di) => (
        <group key={di} position={[xPos, yBase, zPos]}>
          <mesh position={[0, dH / 2, 0]} castShadow><boxGeometry args={[dW, dH, dD]} /><meshStandardMaterial color={wallCol} roughness={0.85} metalness={0} /></mesh>
          <mesh position={[0, dH + dRiseH * 0.5, -dD * 0.26]} rotation={[Math.atan2(dRiseH, dD / 2), 0, 0]} castShadow><boxGeometry args={[dW + 0.06, 0.10, Math.sqrt(dRiseH ** 2 + (dD / 2) ** 2) + 0.04]} /><meshStandardMaterial color={roofCol} roughness={0.87} /></mesh>
          <mesh position={[0, dH + dRiseH * 0.5, -dD * 0.74]} rotation={[-Math.atan2(dRiseH, dD / 2), 0, 0]} castShadow><boxGeometry args={[dW + 0.06, 0.10, Math.sqrt(dRiseH ** 2 + (dD / 2) ** 2) + 0.04]} /><meshStandardMaterial color={roofCol} roughness={0.87} /></mesh>
          <mesh position={[0, dH * 0.55, -(dD / 2 + 0.04)]}><boxGeometry args={[dW * 0.52, dH * 0.52, 0.07]} /><meshStandardMaterial color="#A8C8E8" roughness={0.05} metalness={0.1} transparent opacity={0.62} /></mesh>
          {trimCol && <mesh position={[0, dH * 0.55, -(dD / 2 + 0.068)]}><boxGeometry args={[dW * 0.52 + 0.08, dH * 0.52 + 0.08, 0.05]} /><meshStandardMaterial color={trimCol} roughness={0.65} /></mesh>}
        </group>
      ))}
    </group>
  );
}

// ─── Exterior Building ────────────────────────────────────────────────────────

function wallPos3D(
  wall: WallFace, offsetX: number, y: number,
  halfW: number, halfD: number, gap: number
): [number, number, number] {
  if (wall === "front") return [ offsetX * halfW * 0.82, y, -halfD - gap];
  if (wall === "back")  return [ offsetX * halfW * 0.82, y,  halfD + gap];
  if (wall === "left")  return [-halfW - gap, y,  offsetX * halfD * 0.82];
  return                       [ halfW + gap, y,  offsetX * halfD * 0.82];
}
function isFB(wall: WallFace) { return wall === "front" || wall === "back"; }

// ─── World-axis constants for drag constraint ─────────────────────────────────
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// ─── 3-D Drag Handle ──────────────────────────────────────────────────────────
function DragHandle3D({
  position, color, label, orbitRef, onDragDelta, worldAxis,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  orbitRef: React.MutableRefObject<any>;
  onDragDelta: (delta: number) => void;
  worldAxis: THREE.Vector3;
}) {
  const { camera, size, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);

  return (
    <group
      position={position}
      onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "grab"; }}
      onPointerLeave={e => { e.stopPropagation(); if (!isDragging.current) { setHovered(false); document.body.style.cursor = "auto"; } }}
      onPointerDown={e => {
        e.stopPropagation();
        isDragging.current = true;
        if (orbitRef.current) orbitRef.current.enabled = false;
        document.body.style.cursor = "grabbing";
        const canvas = gl.domElement;
        let lastX = e.clientX, lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - lastX;
          const dy = ev.clientY - lastY;
          lastX = ev.clientX; lastY = ev.clientY;
          const pos3 = new THREE.Vector3(position[0], position[1], position[2]);
          const dist = Math.max(0.5, camera.position.distanceTo(pos3));
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
          const worldPerPx = (2 * Math.tan(fov / 2) * dist) / size.height;
          const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
          const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
          const worldDelta = right.clone().multiplyScalar(dx * worldPerPx).addScaledVector(up, -dy * worldPerPx);
          onDragDelta(worldDelta.dot(worldAxis));
        };
        const onUp = (ev: PointerEvent) => {
          isDragging.current = false;
          if (orbitRef.current) orbitRef.current.enabled = true;
          canvas.releasePointerCapture(ev.pointerId);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          setHovered(false);
          document.body.style.cursor = "auto";
        };
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
      }}
    >
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[hovered ? 0.19 : 0.13, 16, 16]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.18}
          roughness={0.22} metalness={0.05}
        />
      </mesh>
      {/* Ring gizmo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[hovered ? 0.27 : 0.20, 0.022, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.24} roughness={0.4} />
      </mesh>
      {/* Tooltip on hover */}
      {hovered && (
        <Html position={[0, 0.45, 0]} center distanceFactor={8}>
          <div style={{
            background: "rgba(15,15,15,0.86)", color: "#fff",
            padding: "3px 9px", borderRadius: 12, fontSize: 10,
            whiteSpace: "nowrap", pointerEvents: "none",
            fontFamily: "system-ui,sans-serif", letterSpacing: "0.02em",
            border: `1px solid ${color}55`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Click-to-select gizmo system ────────────────────────────────────────────
type SelState = { kind: "door"; idx: number } | { kind: "window"; idx: number } | { kind: "roof" } | null;

const SEL_BTN: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 6,
  color: "#f1f5f9", fontSize: 9.5, padding: "3px 8px", cursor: "pointer",
  fontFamily: "system-ui,sans-serif", whiteSpace: "nowrap",
};
const WALL_CYCLE: WallFace[] = ["front", "right", "back", "left"];

// ─── Exterior Building ────────────────────────────────────────────────────────

// ─── Soffit mesh — applies soffit_panel texture (or flat color) to the horizontal overhang panel ──
function SoffitMesh({ args, position, matType, color }: {
  args: [number, number, number]; position: [number, number, number];
  matType: string; color: string;
}) {
  const panelW = 0.305; // ~12 inches per soffit panel
  const [bW, , bD] = args;
  const rX = Math.max(1, Math.round(bW / panelW * 10) / 10);
  const rY = Math.max(1, Math.round(bD / panelW * 10) / 10);
  const matProps = useTextureMaterial(matType, color, rX, rY);
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}

function ExteriorBuilding({ s, orbitRef, onUpdate }: {
  s: StructureParams;
  orbitRef: React.MutableRefObject<any>;
  onUpdate: (k: keyof StructureParams, v: unknown) => void;
}) {
  const [sel, setSel] = useState<SelState>(null);
  const deselect = () => setSel(null);

  const SC = 0.3;
  const w = s.widthFt * SC, d = s.depthFt * SC;
  const wh = s.wallHeightFt * SC, rh = s.ridgeHeightFt * SC;
  const totalWh = wh * (s.stories === 2 ? 2 : 1);
  const ov = (s.roofOverhang ?? 1.5) * SC;
  const thick = 0.15;
  const halfW = w / 2, halfD = d / 2;
  const wr: [number,number] = [Math.max(1, s.widthFt / 10), Math.max(1, s.wallHeightFt / 6)];
  const dr: [number,number] = [Math.max(1, s.depthFt / 10), Math.max(1, s.wallHeightFt / 6)];

  const placements: WindowPlacement[] = s.windowPlacements?.length
    ? s.windowPlacements
    : DEFAULT_WINDOW_PLACEMENTS;

  const panelBase: React.CSSProperties = {
    background: "rgba(8,10,20,0.94)", borderRadius: 10,
    padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5,
    fontFamily: "system-ui,sans-serif", minWidth: 138, pointerEvents: "auto",
  };

  return (
    <group>
      {/* Large transparent floor — catches "background" clicks to deselect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}
        onClick={e => { e.stopPropagation(); deselect(); }}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Foundation band */}
      <group onClick={e => { e.stopPropagation(); deselect(); }}>
        <FoundationBand w={w} d={d} foundationHFt={s.foundationHeightFt} SC={SC} />
      </group>

      {/* Walls */}
      <TexturedWall pos={[0, totalWh/2, -halfD]} size={[w, totalWh, thick]} matType={s.wallMaterial} color={s.wallColor} repeat={wr} />
      <TexturedWall pos={[0, totalWh/2,  halfD]} size={[w, totalWh, thick]} matType={s.wallMaterial} color={s.wallColor} repeat={wr} />
      <TexturedWall pos={[-halfW, totalWh/2, 0]} size={[thick, totalWh, d]} matType={s.wallMaterial} color={s.wallColor} repeat={dr} />
      <TexturedWall pos={[ halfW, totalWh/2, 0]} size={[thick, totalWh, d]} matType={s.wallMaterial} color={s.wallColor} repeat={dr} />

      {/* Corner trim boards */}
      {s.trimColor && (() => {
        const bS = 0.09; // ~3.6 inch board in scene units
        const corners: [number,number,number][] = [
          [-halfW, totalWh/2, -halfD],
          [-halfW, totalWh/2,  halfD],
          [ halfW, totalWh/2, -halfD],
          [ halfW, totalWh/2,  halfD],
        ];
        return corners.map((pos, ci) => (
          <mesh key={`corner-${ci}`} position={pos} castShadow>
            <boxGeometry args={[bS, totalWh, bS]} />
            <meshStandardMaterial color={s.trimColor} roughness={0.65} metalness={0} />
          </mesh>
        ));
      })()}

      {/* ── Fascia boards at eave edges ── */}
      {/* For gable/gambrel roofs: only front+back eave fascia (rakes are handled inside GableRoofGeometry) */}
      {/* For flat roofs: all 4 sides */}
      {s.fasciaColor && (() => {
        const fH = 0.22, fT = 0.055;
        const rW = w + 2*ov;
        const rD = d + 2*ov;
        const fc = s.fasciaColor;
        const isGable = s.roofType === "gable" || s.roofType === "gambrel" || !s.roofType;
        const ra = s.ridgeAxis ?? "w";
        // For gable roofs the eave drops below the wall plate by ov·tan(pitch)
        // so the fascia must follow the actual rafter-tail level.
        const rh_local = (s.ridgeHeightFt ?? 6) * SC;
        const slopeBase = ra === "w" ? halfW : halfD; // horizontal half-span that creates the pitch
        const eaveDropY = isGable ? ov * rh_local / slopeBase : 0;
        const eaveY  = totalWh - eaveDropY;           // actual y-level at eave
        const fasciaY = eaveY - fH / 2;               // fascia box center (top = eaveY)

        // ridgeAxis="w" → eave LEFT/RIGHT (x=±(halfW+ov)), gable ends z=±halfD → only span d in z
        // ridgeAxis="d" → eave FRONT/BACK (z=±(halfD+ov)), gable ends x=±halfW → only span w in x
        const eaveFront = ra === "d"
          ? <><mesh position={[0, fasciaY, -(halfD + ov + fT/2)]} castShadow>
              <boxGeometry args={[w, fH, fT]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
            <mesh position={[0, fasciaY, halfD + ov + fT/2]} castShadow>
              <boxGeometry args={[w, fH, fT]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh></>
          : <><mesh position={[-(halfW + ov + fT/2), fasciaY, 0]} castShadow>
              <boxGeometry args={[fT, fH, d]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
            <mesh position={[halfW + ov + fT/2, fasciaY, 0]} castShadow>
              <boxGeometry args={[fT, fH, d]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh></>;
        if (isGable) {
          // Gable roofs: eave fascia + bird-box returns at each eave/gable corner
          const rakeOv_bb = Math.min(0.075, ov * 0.15);
          const bbD = rakeOv_bb + fT * 2; // bird-box depth into gable direction (≈6-8 in)

          if (ra === "d") {
            // Eave on FRONT/BACK (z-sides), gable ends on LEFT/RIGHT (x-sides)
            // Bird-box gable-side fascia returns at x=±halfW corners
            const bbFascias = ([-1, 1] as const).flatMap(gx =>
              ([-1, 1] as const).map(gz => (
                <mesh key={`bb-f-${gx}-${gz}`}
                  position={[gx * (halfW + bbD / 2), fasciaY, gz * (halfD + ov / 2 + fT / 2)]}
                  castShadow>
                  <boxGeometry args={[bbD, fH, ov + fT]} />
                  <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
                </mesh>
              ))
            );
            return <>{eaveFront}{bbFascias}</>;
          }
          // ridgeAxis="w": eave on LEFT/RIGHT (x-sides), gable ends on FRONT/BACK (z-sides)
          // Bird-box gable-side fascia returns at z=±halfD corners, spanning the full eave width
          const bbFascias = ([-1, 1] as const).flatMap(gx =>
            ([-1, 1] as const).map(gz => (
              <mesh key={`bb-f-${gx}-${gz}`}
                position={[gx * (halfW + ov / 2 + fT / 2), fasciaY, gz * (halfD + bbD / 2)]}
                castShadow>
                <boxGeometry args={[ov + fT, fH, bbD]} />
                <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
              </mesh>
            ))
          );
          return <>{eaveFront}{bbFascias}</>;
        }
        // Flat / hip: all 4 sides at wall-plate level (no eave drop)
        return (
          <>
            <mesh position={[0, fasciaY, -(halfD + ov + fT/2)]} castShadow>
              <boxGeometry args={[rW + fT*2, fH, fT]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
            <mesh position={[0, fasciaY, halfD + ov + fT/2]} castShadow>
              <boxGeometry args={[rW + fT*2, fH, fT]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
            <mesh position={[-(halfW + ov + fT/2), fasciaY, 0]} castShadow>
              <boxGeometry args={[fT, fH, rD]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
            <mesh position={[halfW + ov + fT/2, fasciaY, 0]} castShadow>
              <boxGeometry args={[fT, fH, rD]} />
              <meshStandardMaterial color={fc} roughness={0.6} metalness={0} />
            </mesh>
          </>
        );
      })()}

      {/* ── Soffit panels (underside of overhang) ── */}
      {ov > 0.05 && (() => {
        const sT = 0.05;
        const fH = 0.22; // must match fascia fH above
        // Eave drops below wall plate the same way the fascia does (pitch × overhang)
        const rh_sof = (s.ridgeHeightFt ?? 6) * SC;
        const ra_sof = s.ridgeAxis ?? "w";
        const isGableRoof = s.roofType === "gable" || s.roofType === "gambrel" || !s.roofType;
        const slopeBaseSof = ra_sof === "w" ? halfW : halfD;
        const eaveDropSof  = isGableRoof ? ov * rh_sof / slopeBaseSof : 0;
        const eaveYSof     = totalWh - eaveDropSof;
        // Soffit sits at the bottom of the fascia
        const soffitY = eaveYSof - fH + sT / 2;
        // Always render soffit — use soffitColor or fall back to fascia/trim color or plain white
        const sc = s.soffitColor ?? s.fasciaColor ?? s.trimColor ?? "#F0EDE8";
        const smt = s.soffitMatType ?? "soffit_panel";
        const isGable = s.roofType === "gable" || s.roofType === "gambrel" || !s.roofType;
        const ra = s.ridgeAxis ?? "w";
        // For gable/gambrel: soffit only on the EAVE sides (2 sides), not the rake/gable ends
        // ridgeAxis="w" → ridge along Z, slopes ±X → eave on LEFT/RIGHT (x-sides)
        // ridgeAxis="d" → ridge along X, slopes ±Z → eave on FRONT/BACK (z-sides)
        if (isGable) {
          const rW = w + 2*ov;
          // Bird-box soffit returns at gable-end corners (same bbD as fascia section)
          const rakeOv_sof = Math.min(0.075, ov * 0.15);
          const bbD_sof = rakeOv_sof + 0.055 * 2; // fT*2
          if (ra === "d") {
            // Eave soffit on FRONT/BACK, bird-box soffit returns at LEFT/RIGHT corners
            return (
              <>
                <SoffitMesh args={[rW, sT, ov]} position={[0, soffitY, -(halfD + ov/2)]} matType={smt} color={sc} />
                <SoffitMesh args={[rW, sT, ov]} position={[0, soffitY,  halfD + ov/2]}  matType={smt} color={sc} />
                {([-1, 1] as const).flatMap(gx => ([-1, 1] as const).map(gz => (
                  <SoffitMesh key={`bb-s-${gx}-${gz}`}
                    args={[bbD_sof, sT, ov]}
                    position={[gx * (halfW + bbD_sof / 2), soffitY, gz * (halfD + ov / 2)]}
                    matType={smt} color={sc} />
                )))}
              </>
            );
          }
          // ridgeAxis="w": eave soffit on LEFT/RIGHT, bird-box soffit returns at FRONT/BACK corners
          return (
            <>
              <SoffitMesh args={[ov, sT, d]} position={[-(halfW + ov/2), soffitY, 0]} matType={smt} color={sc} />
              <SoffitMesh args={[ov, sT, d]} position={[ halfW + ov/2,  soffitY, 0]} matType={smt} color={sc} />
              {([-1, 1] as const).flatMap(gx => ([-1, 1] as const).map(gz => (
                <SoffitMesh key={`bb-s-${gx}-${gz}`}
                  args={[ov, sT, bbD_sof]}
                  position={[gx * (halfW + ov/2), soffitY, gz * (halfD + bbD_sof / 2)]}
                  matType={smt} color={sc} />
              )))}
            </>
          );
        }
        // Flat / hip: soffit on all 4 sides
        const rW = w + 2*ov;
        return (
          <>
            <SoffitMesh args={[rW, sT, ov]} position={[0, soffitY, -(halfD + ov/2)]} matType={smt} color={sc} />
            <SoffitMesh args={[rW, sT, ov]} position={[0, soffitY,  halfD + ov/2]}  matType={smt} color={sc} />
            <SoffitMesh args={[ov, sT, d]}  position={[-(halfW + ov/2), soffitY, 0]} matType={smt} color={sc} />
            <SoffitMesh args={[ov, sT, d]}  position={[ halfW + ov/2,  soffitY, 0]} matType={smt} color={sc} />
          </>
        );
      })()}

      {/* ── Doors — click to select, then drag handles appear ── */}
      {Array.from({ length: Math.min(s.doorCount, 2) }).map((_, i) => {
        const dp: DoorPlacement = s.doorPlacements?.[i] ?? DEFAULT_DOOR_PLACEMENTS[i] ?? { wall: "front", offsetX: 0, widthFt: 3, heightFt: 7 };
        const dW = dp.widthFt * SC;
        const dH = dp.heightFt * SC;
        const dPos = wallPos3D(dp.wall, dp.offsetX, dH / 2, halfW, halfD, 0.05);
        const geo: [number,number,number] = isFB(dp.wall) ? [dW, dH, 0.1] : [0.1, dH, dW];
        const isSel = sel?.kind === "door" && sel.idx === i;
        const doorAxis = isFB(dp.wall) ? AXIS_X : AXIS_Z;
        const doorRange = isFB(dp.wall) ? halfW * 0.82 : halfD * 0.82;
        const widthHandlePos: [number,number,number] = isFB(dp.wall)
          ? [dPos[0] + dW / 2 + 0.32, dH / 2, dPos[2]]
          : [dPos[0], dH / 2, dPos[2] + dW / 2 + 0.32];
        return (
          <group key={`door-${i}`}>
            {/* Door — style variants */}
            {(() => {
              const style = s.doorStyle ?? "single";
              // Garage doors get a white default; entry doors default brown
              const isGarageDoor = style === "garage" || (style === "single" && dp.widthFt >= 8);
              const doorColor = isGarageDoor ? "#EDECEA" : "#5C4033";
              const selClick = (e: React.MouseEvent) => { e.stopPropagation(); setSel(isSel ? null : { kind: "door", idx: i }); };
              const em = { emissive: "#f97316" as const, emissiveIntensity: isSel ? 0.55 : 0 };
              const fb2 = isFB(dp.wall);
              const panelDepth = 0.10;

              if (isGarageDoor) {
                // Sectional garage door — 4 horizontal panels stacked
                const panelCount = 4;
                const panelH = dH / panelCount;
                const panelInset = 0.018; // raised-panel shadow depth
                const lineColor = "#C8C6C2";
                return (
                  <group onClick={selClick}>
                    {/* Main door slab */}
                    <mesh position={dPos}>
                      <boxGeometry args={fb2 ? [dW, dH, panelDepth] : [panelDepth, dH, dW]} />
                      <meshStandardMaterial color={doorColor} roughness={0.55} metalness={0.05} {...em} />
                    </mesh>
                    {/* Horizontal panel divider lines (grooves between sections) */}
                    {Array.from({ length: panelCount - 1 }).map((_, pi) => {
                      const lineY = dPos[1] - dH / 2 + panelH * (pi + 1);
                      return (
                        <mesh key={`gdiv-${pi}`} position={fb2
                          ? [dPos[0], lineY, dPos[2] + panelDepth / 2 + 0.002]
                          : [dPos[0] + panelDepth / 2 + 0.002, lineY, dPos[2]]}>
                          <boxGeometry args={fb2 ? [dW, 0.025, 0.012] : [0.012, 0.025, dW]} />
                          <meshStandardMaterial color={lineColor} roughness={0.7} metalness={0} />
                        </mesh>
                      );
                    })}
                    {/* Raised panel rectangles on each section */}
                    {Array.from({ length: panelCount }).map((_, pi) => {
                      const sectionCenterY = dPos[1] - dH / 2 + panelH * pi + panelH / 2;
                      const panelW = dW * 0.88;
                      const panelIH = panelH * 0.60;
                      return (
                        <mesh key={`gpanel-${pi}`} position={fb2
                          ? [dPos[0], sectionCenterY, dPos[2] + panelDepth / 2 + panelInset]
                          : [dPos[0] + panelDepth / 2 + panelInset, sectionCenterY, dPos[2]]}>
                          <boxGeometry args={fb2 ? [panelW, panelIH, 0.014] : [0.014, panelIH, panelW]} />
                          <meshStandardMaterial color="#D8D6D1" roughness={0.6} metalness={0} />
                        </mesh>
                      );
                    })}
                    {/* Window strip on top panel */}
                    {(() => {
                      const topY = dPos[1] - dH / 2 + panelH * (panelCount - 1) + panelH / 2;
                      const winCount = Math.max(1, Math.round(dp.widthFt / 3));
                      const winW = (dW * 0.78) / winCount;
                      return Array.from({ length: winCount }).map((_, wi) => {
                        const wx = dPos[0] + (wi - (winCount - 1) / 2) * winW * 1.05;
                        return (
                          <mesh key={`gwin-${wi}`} position={fb2
                            ? [wx, topY, dPos[2] + panelDepth / 2 + 0.03]
                            : [dPos[0] + panelDepth / 2 + 0.03, topY, dPos[2] + (wi - (winCount - 1) / 2) * winW * 1.05]}>
                            <boxGeometry args={fb2 ? [winW * 0.82, panelH * 0.52, 0.018] : [0.018, panelH * 0.52, winW * 0.82]} />
                            <meshStandardMaterial color="#B8D4E8" roughness={0.05} metalness={0.08} transparent opacity={0.75} />
                          </mesh>
                        );
                      });
                    })()}
                  </group>
                );
              }
              if (style === "double") {
                const half = fb2 ? dW/2 - 0.025 : 0;
                const halfZ = fb2 ? 0 : dW/2 - 0.025;
                return (
                  <group>
                    <mesh position={[dPos[0]-(fb2?half:0), dPos[1], dPos[2]-(fb2?0:halfZ)]} onClick={selClick}><boxGeometry args={fb2?[dW/2-0.02,dH,panelDepth]:[panelDepth,dH,dW/2-0.02]} /><meshStandardMaterial color={doorColor} roughness={0.82} metalness={0.05} {...em} /></mesh>
                    <mesh position={[dPos[0]+(fb2?half:0), dPos[1], dPos[2]+(fb2?0:halfZ)]} onClick={selClick}><boxGeometry args={fb2?[dW/2-0.02,dH,panelDepth]:[panelDepth,dH,dW/2-0.02]} /><meshStandardMaterial color={doorColor} roughness={0.82} metalness={0.05} {...em} /></mesh>
                    <mesh position={dPos}><boxGeometry args={fb2?[0.055,dH,0.12]:[0.12,dH,0.055]} /><meshStandardMaterial color="#3A2820" roughness={0.85} /></mesh>
                  </group>
                );
              }
              if (style === "sidelite") {
                const sW = dW * 0.17;
                return (
                  <group>
                    <mesh position={dPos} onClick={selClick}><boxGeometry args={fb2?[dW*0.64,dH,panelDepth]:[panelDepth,dH,dW*0.64]} /><meshStandardMaterial color={doorColor} roughness={0.82} metalness={0.05} {...em} /></mesh>
                    <mesh position={fb2?[dPos[0]+dW*0.41,dPos[1],dPos[2]]:[dPos[0],dPos[1],dPos[2]+dW*0.41]}><boxGeometry args={fb2?[sW,dH*0.90,panelDepth]:[panelDepth,dH*0.90,sW]} /><meshStandardMaterial color="#A8C8E8" roughness={0.06} metalness={0.1} transparent opacity={0.65} /></mesh>
                    <mesh position={fb2?[dPos[0]-dW*0.41,dPos[1],dPos[2]]:[dPos[0],dPos[1],dPos[2]-dW*0.41]}><boxGeometry args={fb2?[sW,dH*0.90,panelDepth]:[panelDepth,dH*0.90,sW]} /><meshStandardMaterial color="#A8C8E8" roughness={0.06} metalness={0.1} transparent opacity={0.65} /></mesh>
                  </group>
                );
              }
              /* single entry door — raised panel detail */
              return (
                <group>
                  <mesh position={dPos} onClick={selClick}><boxGeometry args={fb2 ? [dW, dH, panelDepth] : [panelDepth, dH, dW]} /><meshStandardMaterial color={doorColor} roughness={0.82} metalness={0.05} {...em} /></mesh>
                  {/* Frame/casing surround */}
                  {fb2 ? <>
                    <mesh position={[dPos[0], dPos[1], dPos[2]+panelDepth/2+0.014]}><boxGeometry args={[dW+0.08, 0.055, 0.028]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0], dPos[1]+dH/2+0.015, dPos[2]+panelDepth/2+0.014]}><boxGeometry args={[dW+0.08, 0.055, 0.028]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]-dW/2-0.027, dPos[1], dPos[2]+panelDepth/2+0.014]}><boxGeometry args={[0.055, dH+0.04, 0.028]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]+dW/2+0.027, dPos[1], dPos[2]+panelDepth/2+0.014]}><boxGeometry args={[0.055, dH+0.04, 0.028]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    {/* Raised panels */}
                    <mesh position={[dPos[0],dPos[1]+dH*0.18,dPos[2]+panelDepth/2+0.02]}><boxGeometry args={[dW*0.70,dH*0.26,0.022]} /><meshStandardMaterial color="#4A3028" roughness={0.9} /></mesh>
                    <mesh position={[dPos[0],dPos[1]-dH*0.15,dPos[2]+panelDepth/2+0.02]}><boxGeometry args={[dW*0.70,dH*0.38,0.022]} /><meshStandardMaterial color="#4A3028" roughness={0.9} /></mesh>
                    {/* Door knob */}
                    <mesh position={[dPos[0]+dW*0.30, dPos[1]-dH*0.04, dPos[2]+panelDepth/2+0.03]}><sphereGeometry args={[0.025, 10, 8]} /><meshStandardMaterial color="#B8A060" roughness={0.15} metalness={0.9} /></mesh>
                  </> : <>
                    <mesh position={[dPos[0]+panelDepth/2+0.014, dPos[1], dPos[2]]}><boxGeometry args={[0.028, 0.055, dW+0.08]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.014, dPos[1]+dH/2+0.015, dPos[2]]}><boxGeometry args={[0.028, 0.055, dW+0.08]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.014, dPos[1], dPos[2]-dW/2-0.027]}><boxGeometry args={[0.028, dH+0.04, 0.055]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.014, dPos[1], dPos[2]+dW/2+0.027]}><boxGeometry args={[0.028, dH+0.04, 0.055]} /><meshStandardMaterial color="#3A2820" roughness={0.7} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.02,dPos[1]+dH*0.18,dPos[2]]}><boxGeometry args={[0.022,dH*0.26,dW*0.70]} /><meshStandardMaterial color="#4A3028" roughness={0.9} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.02,dPos[1]-dH*0.15,dPos[2]]}><boxGeometry args={[0.022,dH*0.38,dW*0.70]} /><meshStandardMaterial color="#4A3028" roughness={0.9} /></mesh>
                    <mesh position={[dPos[0]+panelDepth/2+0.03, dPos[1]-dH*0.04, dPos[2]+dW*0.30]}><sphereGeometry args={[0.025, 10, 8]} /><meshStandardMaterial color="#B8A060" roughness={0.15} metalness={0.9} /></mesh>
                  </>}
                </group>
              );
            })()}
            {isSel && (
              <>
                {/* Slide along wall */}
                <DragHandle3D position={[dPos[0], dH + 0.28, dPos[2]]}
                  color="#3B82F6" label={`← posición →`} orbitRef={orbitRef} worldAxis={doorAxis}
                  onDragDelta={delta => {
                    const newOff = Math.max(-0.92, Math.min(0.92, dp.offsetX + delta / doorRange));
                    const newPl = [...(s.doorPlacements ?? DEFAULT_DOOR_PLACEMENTS)];
                    newPl[i] = { ...dp, offsetX: newOff };
                    onUpdate("doorPlacements", newPl);
                  }} />
                {/* Height */}
                <DragHandle3D position={[dPos[0], dH + 0.55, dPos[2]]}
                  color="#10B981" label={`↑ alto ${dp.heightFt.toFixed(1)}ft`} orbitRef={orbitRef} worldAxis={AXIS_Y}
                  onDragDelta={delta => {
                    const newH = Math.max(5.5, Math.min(13, dp.heightFt + delta / SC));
                    const newPl = [...(s.doorPlacements ?? DEFAULT_DOOR_PLACEMENTS)];
                    newPl[i] = { ...dp, heightFt: parseFloat(newH.toFixed(1)) };
                    onUpdate("doorPlacements", newPl);
                  }} />
                {/* Width */}
                <DragHandle3D position={widthHandlePos}
                  color="#F59E0B" label={`↔ ancho ${dp.widthFt.toFixed(1)}ft`} orbitRef={orbitRef}
                  worldAxis={isFB(dp.wall) ? AXIS_X : AXIS_Z}
                  onDragDelta={delta => {
                    const newW = Math.max(2, Math.min(14, dp.widthFt + delta / SC));
                    const newPl = [...(s.doorPlacements ?? DEFAULT_DOOR_PLACEMENTS)];
                    newPl[i] = { ...dp, widthFt: parseFloat(newW.toFixed(1)) };
                    onUpdate("doorPlacements", newPl);
                  }} />
                {/* Floating action panel */}
                <Html position={[dPos[0], dH * 0.5, dPos[2]]} center distanceFactor={9}>
                  <div style={{ ...panelBase, border: "1px solid #f97316aa" }}>
                    <div style={{ fontWeight: 700, color: "#f97316", fontSize: 10 }}>🚪 Puerta {i + 1}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8" }}>
                      {dp.widthFt.toFixed(1)}ft × {dp.heightFt.toFixed(1)}ft · pared: {dp.wall}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button style={SEL_BTN} onClick={e => {
                        e.stopPropagation();
                        const nw = WALL_CYCLE[(WALL_CYCLE.indexOf(dp.wall) + 1) % 4];
                        const newPl = [...(s.doorPlacements ?? DEFAULT_DOOR_PLACEMENTS)];
                        newPl[i] = { ...dp, wall: nw };
                        onUpdate("doorPlacements", newPl);
                      }}>⟳ Cambiar pared</button>
                      <button style={{ ...SEL_BTN, background: "#7f1d1d", borderColor: "#991b1b" }}
                        onClick={e => { e.stopPropagation(); deselect(); }}>✕</button>
                    </div>
                  </div>
                </Html>
              </>
            )}
          </group>
        );
      })}

      {/* ── Exterior wall sconces (above each door) ── */}
      {s.lightsEnabled && Array.from({ length: Math.min(s.doorCount, 2) }).map((_, i) => {
        const dp: DoorPlacement = s.doorPlacements?.[i] ?? DEFAULT_DOOR_PLACEMENTS[i] ?? { wall: "front", offsetX: 0, widthFt: 3, heightFt: 7 };
        const dH = dp.heightFt * SC;
        const dPos = wallPos3D(dp.wall, dp.offsetX, dH / 2, halfW, halfD, 0.05);
        const fb = isFB(dp.wall);
        const nX = fb ? 0 : (dp.wall === "left" ? -1 : 1);
        const nZ = fb ? (dp.wall === "front" ? -1 : 1) : 0;
        const mW = fb ? 0.08 : 0.04; const mD = fb ? 0.04 : 0.08;
        const mPos: [number,number,number] = [dPos[0]+nX*0.09, dH+0.22, dPos[2]+nZ*0.09];
        const gPos: [number,number,number] = [dPos[0]+nX*0.15, dH+0.16, dPos[2]+nZ*0.15];
        return (
          <group key={`sconce-${i}`}>
            <mesh position={mPos} castShadow><boxGeometry args={[mW, 0.16, mD]} /><meshStandardMaterial color="#2A2A2A" roughness={0.2} metalness={0.9} /></mesh>
            <mesh position={gPos}><sphereGeometry args={[0.052, 12, 12]} /><meshStandardMaterial color="#FFFDE4" roughness={0.05} metalness={0} emissive="#FFE060" emissiveIntensity={0.9} transparent opacity={0.9} /></mesh>
          </group>
        );
      })}

      {/* ── Windows — click to select ── */}
      {placements.slice(0, Math.min(s.windowCount, 4)).map((wp, i) => {
        const winY = wh * 0.42;
        const wPos = wallPos3D(wp.wall, wp.offsetX, winY, halfW, halfD, 0.06);
        const geo: [number,number,number] = isFB(wp.wall) ? [0.8, 0.65, 0.08] : [0.08, 0.65, 0.8];
        const isSel = sel?.kind === "window" && sel.idx === i;
        const wAxis = isFB(wp.wall) ? AXIS_X : AXIS_Z;
        const wRange = isFB(wp.wall) ? halfW * 0.82 : halfD * 0.82;
        const glassProps = { color: "#90B8D8", roughness: 0.03, metalness: 0.08, transparent: true, opacity: 0.40 as number, envMapIntensity: 3.5, emissive: "#22d3ee" as const, emissiveIntensity: isSel ? 0.6 : 0 };
        const selClick = (e: React.MouseEvent) => { e.stopPropagation(); setSel(isSel ? null : { kind: "window", idx: i }); };
        const winStyle = s.windowStyle ?? "single";
        const fb = isFB(wp.wall);
        const mullionColor = s.windowTrimColor ?? "#F0EDE8";
        return (
          <group key={`win-${i}`}>
            {/* Glass — style variants */}
            {winStyle === "picture" ? (
              <mesh position={fb ? [wPos[0], wPos[1], wPos[2]] : [wPos[0], wPos[1], wPos[2]]} onClick={selClick}>
                <boxGeometry args={fb ? [1.22, 0.80, 0.08] : [0.08, 0.80, 1.22]} />
                <meshStandardMaterial {...glassProps} />
              </mesh>
            ) : winStyle === "double" ? (
              <group>
                <mesh position={fb ? [wPos[0]-0.21, wPos[1], wPos[2]] : [wPos[0], wPos[1], wPos[2]-0.21]} onClick={selClick}>
                  <boxGeometry args={fb ? [0.38, 0.65, 0.08] : [0.08, 0.65, 0.38]} /><meshStandardMaterial {...glassProps} />
                </mesh>
                <mesh position={fb ? [wPos[0]+0.21, wPos[1], wPos[2]] : [wPos[0], wPos[1], wPos[2]+0.21]} onClick={selClick}>
                  <boxGeometry args={fb ? [0.38, 0.65, 0.08] : [0.08, 0.65, 0.38]} /><meshStandardMaterial {...glassProps} />
                </mesh>
                <mesh position={wPos}><boxGeometry args={fb ? [0.04, 0.65, 0.09] : [0.09, 0.65, 0.04]} /><meshStandardMaterial color={mullionColor} roughness={0.65} /></mesh>
              </group>
            ) : winStyle === "arched" ? (
              <group>
                <mesh position={wPos} onClick={selClick}><boxGeometry args={fb ? [0.76, 0.56, 0.08] : [0.08, 0.56, 0.76]} /><meshStandardMaterial {...glassProps} /></mesh>
                <mesh position={fb ? [wPos[0], wPos[1]+0.38, wPos[2]] : [wPos[0], wPos[1]+0.38, wPos[2]]}
                  rotation={fb ? [0, 0, 0] : [0, Math.PI/2, 0]} onClick={selClick}>
                  <cylinderGeometry args={[0.38, 0.38, 0.07, 14, 1, false, 0, Math.PI]} /><meshStandardMaterial {...glassProps} />
                </mesh>
              </group>
            ) : (
              /* single — with horizontal mullion */
              <group>
                <mesh position={wPos} onClick={selClick}><boxGeometry args={geo} /><meshStandardMaterial {...glassProps} /></mesh>
                <mesh position={wPos}><boxGeometry args={fb ? [0.76, 0.03, 0.09] : [0.09, 0.03, 0.76]} /><meshStandardMaterial color={mullionColor} roughness={0.65} /></mesh>
              </group>
            )}

            {/* Window casing / trim frame */}
            {/* Dark interior plane behind glass — simulates room depth */}
            {fb
              ? <mesh position={[wPos[0], wPos[1], wPos[2] - 0.03]}>
                  <boxGeometry args={[0.78, 0.62, 0.01]} />
                  <meshStandardMaterial color="#060810" roughness={1} metalness={0} />
                </mesh>
              : <mesh position={[wPos[0] - 0.03, wPos[1], wPos[2]]}>
                  <boxGeometry args={[0.01, 0.62, 0.78]} />
                  <meshStandardMaterial color="#060810" roughness={1} metalness={0} />
                </mesh>
            }
            {s.windowTrimColor && (() => {
              const cW = 0.10, cD = 0.13, tc = s.windowTrimColor!;
              const wGlass = 0.8, wH = 0.65;
              return isFB(wp.wall) ? (
                <>
                  {/* Top casing */}
                  <mesh position={[wPos[0], wPos[1]+wH/2+cW/2, wPos[2]]} castShadow><boxGeometry args={[wGlass+cW*2+0.02, cW, cD]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  {/* Side casings */}
                  <mesh position={[wPos[0]-wGlass/2-cW/2, wPos[1], wPos[2]]} castShadow><boxGeometry args={[cW, wH, cD]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  <mesh position={[wPos[0]+wGlass/2+cW/2, wPos[1], wPos[2]]} castShadow><boxGeometry args={[cW, wH, cD]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  {/* Bottom apron */}
                  <mesh position={[wPos[0], wPos[1]-wH/2-cW/2, wPos[2]]} castShadow><boxGeometry args={[wGlass+cW*2+0.02, cW, cD]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  {/* Window sill — protruding ledge at bottom */}
                  <mesh position={[wPos[0], wPos[1]-wH/2-cW-0.022, wPos[2]+cD*0.3]} castShadow><boxGeometry args={[wGlass+cW*2+0.06, 0.045, cD*1.6]} /><meshStandardMaterial color={tc} roughness={0.50} metalness={0} /></mesh>
                </>
              ) : (
                <>
                  <mesh position={[wPos[0], wPos[1]+wH/2+cW/2, wPos[2]]} castShadow><boxGeometry args={[cD, cW, wGlass+cW*2+0.02]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  <mesh position={[wPos[0], wPos[1], wPos[2]-wGlass/2-cW/2]} castShadow><boxGeometry args={[cD, wH, cW]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  <mesh position={[wPos[0], wPos[1], wPos[2]+wGlass/2+cW/2]} castShadow><boxGeometry args={[cD, wH, cW]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  <mesh position={[wPos[0], wPos[1]-wH/2-cW/2, wPos[2]]} castShadow><boxGeometry args={[cD, cW, wGlass+cW*2+0.02]} /><meshStandardMaterial color={tc} roughness={0.55} metalness={0} /></mesh>
                  {/* Window sill */}
                  <mesh position={[wPos[0]+cD*0.3, wPos[1]-wH/2-cW-0.022, wPos[2]]} castShadow><boxGeometry args={[cD*1.6, 0.045, wGlass+cW*2+0.06]} /><meshStandardMaterial color={tc} roughness={0.50} metalness={0} /></mesh>
                </>
              );
            })()}

            {/* Window shutters */}
            {s.shuttersEnabled && s.shutterColor && (() => {
              const sW = 0.27, sH = 0.70, sT = 0.04, sc = s.shutterColor!;
              return isFB(wp.wall) ? (
                <>
                  <mesh position={[wPos[0]-0.51-sW/2, wPos[1], wPos[2]]}><boxGeometry args={[sW, sH, sT]} /><meshStandardMaterial color={sc} roughness={0.75} metalness={0} /></mesh>
                  <mesh position={[wPos[0]+0.51+sW/2, wPos[1], wPos[2]]}><boxGeometry args={[sW, sH, sT]} /><meshStandardMaterial color={sc} roughness={0.75} metalness={0} /></mesh>
                </>
              ) : (
                <>
                  <mesh position={[wPos[0], wPos[1], wPos[2]-0.51-sW/2]}><boxGeometry args={[sT, sH, sW]} /><meshStandardMaterial color={sc} roughness={0.75} metalness={0} /></mesh>
                  <mesh position={[wPos[0], wPos[1], wPos[2]+0.51+sW/2]}><boxGeometry args={[sT, sH, sW]} /><meshStandardMaterial color={sc} roughness={0.75} metalness={0} /></mesh>
                </>
              );
            })()}

            {isSel && (
              <>
                <DragHandle3D position={[wPos[0], wh * 0.76, wPos[2]]}
                  color="#10B981" label={`← ventana ${i+1} →`} orbitRef={orbitRef} worldAxis={wAxis}
                  onDragDelta={delta => {
                    const newOff = Math.max(-0.88, Math.min(0.88, wp.offsetX + delta / wRange));
                    const newPl = placements.map((p, j) => j === i ? { ...p, offsetX: newOff } : p);
                    onUpdate("windowPlacements", newPl);
                  }} />
                <Html position={[wPos[0], wh * 0.55, wPos[2]]} center distanceFactor={9}>
                  <div style={{ ...panelBase, border: "1px solid #22d3eeaa" }}>
                    <div style={{ fontWeight: 700, color: "#22d3ee", fontSize: 10 }}>🪟 Ventana {i + 1}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8" }}>pared: {wp.wall}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={SEL_BTN} onClick={e => {
                        e.stopPropagation();
                        const nw = WALL_CYCLE[(WALL_CYCLE.indexOf(wp.wall) + 1) % 4];
                        const newPl = placements.map((p, j) => j === i ? { ...p, wall: nw } : p);
                        onUpdate("windowPlacements", newPl);
                      }}>⟳ Cambiar pared</button>
                      <button style={{ ...SEL_BTN, background: "#7f1d1d", borderColor: "#991b1b" }}
                        onClick={e => { e.stopPropagation(); deselect(); }}>✕</button>
                    </div>
                  </div>
                </Html>
              </>
            )}
          </group>
        );
      })}

      {/* ── Roof geometry ── */}
      {s.roofType === "flat"
        ? <FlatRoof w={w} d={d} wallH={totalWh} riseH={rh} color={s.roofColor} matType={s.roofMaterial} overhang={ov} />
        : (() => {
            const ra = s.ridgeAxis ?? "w";
            const [gW, gD] = ra === "d" ? [d, w] : [w, d];
            const RoofComp = s.roofType === "gambrel" ? GambrelRoof : GableRoof;
            return (
              <group rotation={[0, ra === "d" ? Math.PI / 2 : 0, 0]}>
                <RoofComp w={gW} d={gD} wallH={totalWh} riseH={rh} color={s.roofColor} matType={s.roofMaterial} overhang={ov} wallColor={s.wallColor} trimColor={s.fasciaColor ?? s.trimColor} wallMatType={s.wallMaterial} wallRpt={[Math.max(1, s.widthFt/10), Math.max(1, s.wallHeightFt/6)]} />
              </group>
            );
          })()
      }

      {/* ── Roof transparent hitbox — click to select ── */}
      {(() => {
        const isSel = sel?.kind === "roof";
        const roofW = w + ov * 2 + 0.3;
        const roofD = d + ov * 2 + 0.3;
        return (
          <group>
            <mesh position={[0, totalWh + rh / 2, 0]}
              onClick={e => { e.stopPropagation(); setSel(isSel ? null : { kind: "roof" }); }}>
              <boxGeometry args={[roofW, Math.max(rh + 0.5, 1.0), roofD]} />
              <meshStandardMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {isSel && (
              <>
                {/* Ridge height */}
                <DragHandle3D position={[0, totalWh + rh + 0.48, 0]}
                  color="#F59E0B" label={`↑ cumbrera ${s.ridgeHeightFt.toFixed(1)}ft`}
                  orbitRef={orbitRef} worldAxis={AXIS_Y}
                  onDragDelta={delta => {
                    const newH = Math.max(0.5, Math.min(20, s.ridgeHeightFt + delta / SC));
                    onUpdate("ridgeHeightFt", parseFloat(newH.toFixed(2)));
                  }} />
                {/* Overhang */}
                {s.roofType !== "flat" && (
                  <DragHandle3D position={[halfW + ov + 0.38, wh + rh * 0.4, 0]}
                    color="#F97316" label={`↔ alero ${(s.roofOverhang ?? 1.5).toFixed(1)}ft`}
                    orbitRef={orbitRef} worldAxis={AXIS_X}
                    onDragDelta={delta => {
                      const newOv = Math.max(0, Math.min(4, (s.roofOverhang ?? 1.5) + delta / SC));
                      onUpdate("roofOverhang", parseFloat(newOv.toFixed(2)));
                    }} />
                )}
                {/* Floating action panel */}
                <Html position={[roofW / 2 + 0.6, wh + rh * 0.55, 0]} center distanceFactor={9}>
                  <div style={{ ...panelBase, border: "1px solid #F59E0Baa" }}>
                    <div style={{ fontWeight: 700, color: "#F59E0B", fontSize: 10 }}>🏠 Techo</div>
                    <div style={{ fontSize: 9, color: "#94a3b8" }}>
                      {s.roofType === "gable" ? "2 Aguas" : s.roofType === "flat" ? "Plano" : s.roofType === "gambrel" ? "Gambrel" : "Hip"} · {s.ridgeHeightFt.toFixed(1)}ft · alero {(s.roofOverhang ?? 1.5).toFixed(1)}ft
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>Tipo:</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["gable", "flat", "hip", "gambrel"] as const).map(rt => (
                        <button key={rt} style={{
                          ...SEL_BTN,
                          background: s.roofType === rt ? "#92400e" : "#1e293b",
                          borderColor: s.roofType === rt ? "#F59E0B" : "#334155",
                        }} onClick={e => { e.stopPropagation(); onUpdate("roofType", rt); }}>
                          {rt === "gable" ? "2 Aguas" : rt === "flat" ? "Plano" : rt === "gambrel" ? "Gambrel" : "Hip"}
                        </button>
                      ))}
                    </div>
                    {(s.roofType === "gable" || s.roofType === "gambrel") && (
                      <>
                        <div style={{ fontSize: 9, color: "#64748b" }}>Orientación:</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(["w", "d"] as const).map(ax => (
                            <button key={ax} style={{
                              ...SEL_BTN,
                              background: (s.ridgeAxis ?? "w") === ax ? "#1e3a5f" : "#1e293b",
                              borderColor: (s.ridgeAxis ?? "w") === ax ? "#3B82F6" : "#334155",
                            }} onClick={e => { e.stopPropagation(); onUpdate("ridgeAxis", ax); }}>
                              {ax === "w" ? "↔ Ancho" : "↕ Largo"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button style={{ ...SEL_BTN, background: "#7f1d1d", borderColor: "#991b1b", alignSelf: "flex-end" }}
                      onClick={e => { e.stopPropagation(); deselect(); }}>✕ Cerrar</button>
                  </div>
                </Html>
              </>
            )}
          </group>
        );
      })()}

      {/* ── Gable vents (on front + back gable ends) ── */}
      {s.gableVentEnabled && s.roofType !== "flat" && rh > 0.3 && (() => {
        const vW = 0.38, vH = 0.24, vD = 0.06;
        const vY = totalWh + rh * 0.42;
        const vc = "#A8A8A8";
        const louvers = Array.from({ length: 4 }, (_, li) => li);
        return (
          <>
            {/* Front vent box */}
            <mesh position={[0, vY, -(halfD + thick/2 + vD/2)]}><boxGeometry args={[vW, vH, vD]} /><meshStandardMaterial color={vc} roughness={0.8} metalness={0.1} /></mesh>
            {louvers.map(li => (
              <mesh key={`fv${li}`} position={[0, vY - vH/2 + vH/5*(li+0.5), -(halfD + thick/2 + vD + 0.015)]}>
                <boxGeometry args={[vW-0.05, 0.025, 0.045]} />
                <meshStandardMaterial color="#888" roughness={0.7} metalness={0.15} />
              </mesh>
            ))}
            {/* Back vent box */}
            <mesh position={[0, vY, halfD + thick/2 + vD/2]}><boxGeometry args={[vW, vH, vD]} /><meshStandardMaterial color={vc} roughness={0.8} metalness={0.1} /></mesh>
            {louvers.map(li => (
              <mesh key={`bv${li}`} position={[0, vY - vH/2 + vH/5*(li+0.5), halfD + thick/2 + vD + 0.015]}>
                <boxGeometry args={[vW-0.05, 0.025, 0.045]} />
                <meshStandardMaterial color="#888" roughness={0.7} metalness={0.15} />
              </mesh>
            ))}
          </>
        );
      })()}

      {/* ── 2-Story: floor belt course ── */}
      {s.stories === 2 && (() => {
        const bH = 0.09, bT = 0.065;
        const bc = s.trimColor ?? s.fasciaColor ?? "#F0EDE8";
        return (
          <>
            <mesh position={[0, wh + bH/2, -(halfD + bT/2)]}><boxGeometry args={[w + bT*2, bH, bT]} /><meshStandardMaterial color={bc} roughness={0.62} /></mesh>
            <mesh position={[0, wh + bH/2, halfD + bT/2]}><boxGeometry args={[w + bT*2, bH, bT]} /><meshStandardMaterial color={bc} roughness={0.62} /></mesh>
            <mesh position={[-(halfW + bT/2), wh + bH/2, 0]}><boxGeometry args={[bT, bH, d]} /><meshStandardMaterial color={bc} roughness={0.62} /></mesh>
            <mesh position={[halfW + bT/2, wh + bH/2, 0]}><boxGeometry args={[bT, bH, d]} /><meshStandardMaterial color={bc} roughness={0.62} /></mesh>
          </>
        );
      })()}

      {/* ── 2-Story: second floor windows (mirror of floor 1 positions) ── */}
      {s.stories === 2 && placements.slice(0, Math.min(s.windowCount, 4)).map((wp, i) => {
        const winY2 = wh * 1.42;
        const wPos2 = wallPos3D(wp.wall, wp.offsetX, winY2, halfW, halfD, 0.06);
        const geo2: [number,number,number] = isFB(wp.wall) ? [0.80, 0.65, 0.08] : [0.08, 0.65, 0.80];
        const fb2 = isFB(wp.wall);
        const tc2 = s.windowTrimColor ?? "#F0EDE8";
        return (
          <group key={`win2-${i}`}>
            <mesh position={wPos2}>
              <boxGeometry args={geo2} />
              <meshStandardMaterial color="#A8C8E8" roughness={0.08} metalness={0.12} transparent opacity={0.55} />
            </mesh>
            <mesh position={wPos2}><boxGeometry args={fb2 ? [0.76, 0.03, 0.09] : [0.09, 0.03, 0.76]} /><meshStandardMaterial color={tc2} roughness={0.65} /></mesh>
            {s.windowTrimColor && (() => {
              const cW2 = 0.055, cD2 = 0.08;
              const [cx2, cy2, cz2] = wPos2;
              const gW2: [number,number,number] = fb2 ? [0.80 + cW2*2, 0.65 + cW2*2, cD2] : [cD2, 0.65 + cW2*2, 0.80 + cW2*2];
              return <mesh position={[cx2, cy2, cz2]}><boxGeometry args={gW2} /><meshStandardMaterial color={s.windowTrimColor} roughness={0.65} /></mesh>;
            })()}
          </group>
        );
      })}

      {/* ── Front porch ── */}
      {s.hasPorch && <FrontPorch s={s} SC={SC} />}

      {/* ── Chimney ── */}
      {s.hasChimney && s.roofType !== "flat" && <Chimney s={s} totalWh={totalWh} SC={SC} />}

      {/* ── Dormers ── */}
      {s.hasDormer && (s.roofType === "gable" || s.roofType === "gambrel") && <DogHouseDormers s={s} totalWh={totalWh} SC={SC} />}

    </group>
  );
}

// ─── Interior Room ────────────────────────────────────────────────────────────

function InteriorRoom({ s }: { s: InteriorParams }) {
  const SC = 0.3;
  const w = s.widthFt * SC, d = s.depthFt * SC, h = s.heightFt * SC;
  const floorProps = useTextureMaterial(s.floorMaterial, s.floorColor, s.widthFt/4, s.depthFt/4);
  const wallProps  = useTextureMaterial(s.wallMaterial,  s.wallColor,  s.widthFt/6, s.heightFt/5);
  const ceilProps  = useTextureMaterial("paint", s.ceilingColor, s.widthFt/6, s.depthFt/6);

  return (
    <group>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[w,d]} /><meshStandardMaterial {...floorProps} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0,h,0]}>
        <planeGeometry args={[w,d]} /><meshStandardMaterial {...ceilProps} side={THREE.DoubleSide} />
      </mesh>
      {[
        { pos:[0,h/2,-d/2] as [number,number,number], rot:[0,0,0] as [number,number,number], size:[w,h] as [number,number] },
        { pos:[0,h/2, d/2] as [number,number,number], rot:[0,Math.PI,0] as [number,number,number], size:[w,h] as [number,number] },
        { pos:[-w/2,h/2,0] as [number,number,number], rot:[0,Math.PI/2,0] as [number,number,number], size:[d,h] as [number,number] },
        { pos:[ w/2,h/2,0] as [number,number,number], rot:[0,-Math.PI/2,0] as [number,number,number], size:[d,h] as [number,number] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos} rotation={wall.rot}>
          <planeGeometry args={wall.size} /><meshStandardMaterial {...wallProps} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Baseboard */}
      {[
        { pos:[0,0.04,-d/2+0.02] as [number,number,number], size:[w,0.08,0.03] as [number,number,number] },
        { pos:[0,0.04, d/2-0.02] as [number,number,number], size:[w,0.08,0.03] as [number,number,number] },
        { pos:[-w/2+0.02,0.04,0] as [number,number,number], size:[0.03,0.08,d] as [number,number,number] },
        { pos:[ w/2-0.02,0.04,0] as [number,number,number], size:[0.03,0.08,d] as [number,number,number] },
      ].map((b,i) => (
        <mesh key={i} position={b.pos}><boxGeometry args={b.size} />
          <meshStandardMaterial color="#F0EDE8" roughness={0.7} metalness={0} /></mesh>
      ))}
      {/* Crown molding */}
      {[
        { pos:[0,h-0.05,-d/2+0.02] as [number,number,number], size:[w,0.06,0.04] as [number,number,number] },
        { pos:[0,h-0.05, d/2-0.02] as [number,number,number], size:[w,0.06,0.04] as [number,number,number] },
        { pos:[-w/2+0.02,h-0.05,0] as [number,number,number], size:[0.04,0.06,d] as [number,number,number] },
        { pos:[ w/2-0.02,h-0.05,0] as [number,number,number], size:[0.04,0.06,d] as [number,number,number] },
      ].map((b,i) => (
        <mesh key={i} position={b.pos}><boxGeometry args={b.size} />
          <meshStandardMaterial color="#FAFAF8" roughness={0.65} metalness={0} /></mesh>
      ))}
    </group>
  );
}

// ─── Screenshot helper (inside Canvas) ────────────────────────────────────────

function ScreenshotHelper({ captureRef }: { captureRef: React.MutableRefObject<(() => void) | undefined> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera);
      gl.domElement.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `kimdasa-design-${Date.now()}.png`; a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
  });
  return null;
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

type EnvPreset = "day" | "sunset" | "night";

const ENV_CONFIG: Record<EnvPreset, {
  ambient: number; dir: number; dirColor: string; fill: number;
  preset: "park" | "sunset" | "night" | "city"; bg: string;
}> = {
  day:    { ambient: 0.40, dir: 2.2, dirColor: "#FFF4E8", fill: 0.45, preset: "park",   bg: "bg-gradient-to-b from-sky-300 via-sky-100 to-blue-50" },
  sunset: { ambient: 0.35, dir: 1.4, dirColor: "#FF8844", fill: 0.20, preset: "sunset", bg: "bg-gradient-to-b from-orange-300 via-rose-200 to-slate-400" },
  night:  { ambient: 0.10, dir: 0.25, dirColor: "#3355AA", fill: 0.06, preset: "night", bg: "bg-gradient-to-b from-slate-950 to-slate-800" },
};

// PBR concrete ground plane — photorealistic pavement pad under/around the building
function GroundPlane({ env }: { env: EnvPreset }) {
  const urls = POLY_URLS["concrete"]!;
  const [diff, nor, rough, ao] = useTexture([urls.diff, urls.nor, urls.rough, urls.ao]);
  const R = 10;
  useMemo(() => {
    [diff, nor, rough, ao].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(R, R);
      t.anisotropy = 16;
      t.needsUpdate = true;
    });
  }, [diff, nor, rough, ao]);
  const grayDiff = useMemo(() => desaturateToTintable(diff, R, R), [diff]);
  const ns = useMemo(() => new THREE.Vector2(0.25, 0.25), []);
  const col = env === "night" ? "#3a3a3a" : env === "sunset" ? "#706050" : "#909090";
  const lawnCol = env === "night" ? "#1A2814" : env === "sunset" ? "#4A5530" : "#4A6A28";
  return (
    <>
      {/* Large lawn plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.145, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={lawnCol} roughness={0.99} metalness={0} envMapIntensity={0.05} />
      </mesh>
      {/* Concrete driveway/apron around building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[32, 28]} />
        <meshStandardMaterial
          map={grayDiff} normalMap={nor} normalScale={ns}
          roughnessMap={rough} aoMap={ao} aoMapIntensity={0.6}
          color={col} roughness={0.95} metalness={0} envMapIntensity={0.12}
        />
      </mesh>
    </>
  );
}

// sRGB output colour space — EffectComposer handles tone mapping via ToneMappingEffect
function RendererConfig() {
  const { gl } = useThree();
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);
  return null;
}

function ExteriorScene({ structure, env, captureRef, onUpdate, hasGenerated }: {
  structure: StructureParams; env: EnvPreset;
  captureRef: React.MutableRefObject<(() => void) | undefined>;
  onUpdate: (k: keyof StructureParams, v: unknown) => void;
  hasGenerated: boolean;
}) {
  const ec = ENV_CONFIG[env];
  const orbitRef = useRef<any>(null);
  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 5.5, 10]} fov={38} />
      {env === "day"    && <hemisphereLight args={["#A8D8FF", "#7A6840", 0.80]} />}
      {env === "sunset" && <hemisphereLight args={["#FFB870", "#8A5838", 0.60]} />}
      {env === "night"  && <hemisphereLight args={["#182030", "#100C08", 0.25]} />}
      <ambientLight intensity={ec.ambient} />
      {/* Key sun light — wide orthographic shadow frustum for entire building */}
      <directionalLight position={[14, 22, 10]} intensity={ec.dir} color={ec.dirColor} castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-far={100}
        shadow-camera-left={-30} shadow-camera-right={30}
        shadow-camera-top={30} shadow-camera-bottom={-30}
        shadow-bias={-0.0003} shadow-normalBias={0.02} />
      {/* Sky-bounce fill — soft blue-white from opposite side */}
      <directionalLight position={[-8, 12, -8]} intensity={ec.fill} color={env === "sunset" ? "#FF9060" : env === "night" ? "#2040A0" : "#C8E0FF"} />
      {/* Rim / backlight — separates building from background */}
      <directionalLight position={[-4, 8, -14]} intensity={env === "night" ? 0.05 : 0.18} color={env === "sunset" ? "#FFD080" : "#E8F4FF"} />
      {env === "night" && (
        <>
          <pointLight position={[0, 3.5, -2]} intensity={4.0} color="#FFE0A0" distance={16} decay={2} />
          <pointLight position={[3, 2, 3]}   intensity={2.0} color="#A0C8FF" distance={12} decay={2} />
        </>
      )}
      {/* Procedural sky */}
      {env === "day" && (
        <Sky distance={450000} sunPosition={[14, 6, 10]}
          turbidity={4} rayleigh={0.3} mieCoefficient={0.002} mieDirectionalG={0.90} />
      )}
      {env === "sunset" && (
        <Sky distance={450000} sunPosition={[14, 0.8, 10]}
          turbidity={12} rayleigh={2.2} mieCoefficient={0.007} mieDirectionalG={0.94} />
      )}
      {env === "night" && (
        <Stars radius={120} depth={60} count={7000} factor={5} saturation={0.1} fade speed={0.3} />
      )}
      {/* IBL environment — background=false, Sky/Stars handles backdrop */}
      <Suspense fallback={null}><Environment preset={ec.preset} background={false} /></Suspense>

      {hasGenerated
        ? <ExteriorBuilding s={structure} orbitRef={orbitRef} onUpdate={onUpdate} />
        : null
      }

      {/* PBR ground — lawn + concrete pad (no CAD grid) */}
      <Suspense fallback={null}><GroundPlane env={env} /></Suspense>
      <OrbitControls ref={orbitRef} enablePan enableZoom enableRotate minDistance={2} maxDistance={40} maxPolarAngle={Math.PI / 2.12} />
      <ContactShadows position={[0, -0.11, 0]} opacity={env === "night" ? 0.40 : 0.72} scale={44} blur={2.2} far={14} resolution={1024} color="#000000" />
      <RendererConfig />
      <EffectComposer enableNormalPass frameBufferType={THREE.HalfFloatType}>
        <SMAA />
        <N8AO aoRadius={1.8} intensity={env === "night" ? 3 : 9} distanceFalloff={0.8} color="black" />
        <Bloom intensity={env === "night" ? 0.30 : 0.06} luminanceThreshold={0.85} luminanceSmoothing={0.03} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.38} darkness={env === "night" ? 0.72 : 0.38} />
      </EffectComposer>
      <ScreenshotHelper captureRef={captureRef} />
    </>
  );
}

function InteriorScene({ structure, env, captureRef }: {
  structure: InteriorParams; env: EnvPreset;
  captureRef: React.MutableRefObject<(() => void) | undefined>;
}) {
  const SC = 0.3;
  const intPresets: Record<EnvPreset, string> = { day: "apartment", sunset: "lobby", night: "night" };
  const ambInt: Record<EnvPreset, number> = { day: 0.8, sunset: 0.5, night: 0.3 };
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, structure.heightFt*SC*0.45, structure.depthFt*SC*0.1]} fov={75} />
      <ambientLight intensity={ambInt[env]} />
      <pointLight position={[0, structure.heightFt*SC*0.85, 0]} intensity={env === "night" ? 2.5 : 1.2} color={env === "night" ? "#FFE4A0" : "#ffffff"} castShadow />
      <pointLight position={[-structure.widthFt*SC*0.3, structure.heightFt*SC*0.7, -structure.depthFt*SC*0.3]} intensity={0.4} />
      <Suspense fallback={null}><Environment preset={intPresets[env] as any} /></Suspense>
      <InteriorRoom s={structure} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={0.5} maxDistance={10} />
      <ScreenshotHelper captureRef={captureRef} />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface PhotoDetected {
  description: string;
  widthFt: number;
  depthFt: number;
  wallHeightFt: number;
  ridgeHeightFt: number;
  roofType: string;
}

export default function DesignStudioPage() {
  const [mode, setMode] = useState<"exterior" | "interior">("exterior");
  const [exterior, setExterior] = useState<StructureParams>(DEFAULT_EXTERIOR);
  const [interior, setInterior] = useState<InteriorParams>(DEFAULT_INTERIOR);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role:"user"|"assistant", content:string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoDetected, setPhotoDetected] = useState<PhotoDetected | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressInfo, setAddressInfo] = useState<{
    formattedAddress: string; city: string; state: string;
    neighbourhood: string; county: string; zip: string;
    lat: number; lng: number;
    hasPhoto: boolean; photoSource?: string;
    osmData?: { widthFt: number | null; depthFt: number | null; stories: number | null;
                heightFt: number | null; roofShape: string | null; buildingType: string | null; source: string };
    propertyData?: { sqft: number | null; beds: number | null; baths: number | null;
                     yearBuilt: number | null; lotSqft: number | null; propertyType: string | null; source: string };
    description: string;
  } | null>(null);
  const [showPositions, setShowPositions] = useState(false);
  const [showTrim, setShowTrim] = useState(false);
  const [showStruct, setShowStruct] = useState(false);
  const [envPreset, setEnvPreset] = useState<EnvPreset>("day");
  const captureRef = useRef<(() => void) | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [estText, setEstText] = useState<string | null>(null);
  const [estOpen, setEstOpen] = useState(false);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizImageUrl, setVizImageUrl] = useState<string | null>(null);
  const [vizModalOpen, setVizModalOpen] = useState(false);
  // Multi-photo state
  const [multiPhotos, setMultiPhotos] = useState<Array<{ file: File; previewUrl: string; label: string }>>([]);
  const [multiPhotoOpen, setMultiPhotoOpen] = useState(false);
  const [multiPhotoLoading, setMultiPhotoLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"controls" | "canvas">("controls");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const multiPhotoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Resize + base64 encode image for upload
  async function resizeAndConvert(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1536;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(img.src);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Build window placements from detected count + door wall
  function buildPhotoWindowPlacements(count: number, doorWall: WallFace): WindowPlacement[] {
    const walls: WallFace[] = ["front", "right", "back", "left"];
    const placements: WindowPlacement[] = [];
    // Primary face: windows on the same wall as door
    const primaryCount = Math.min(count, 2);
    const offsets = primaryCount === 1 ? [0] : [-0.42, 0.42];
    for (let i = 0; i < primaryCount; i++) {
      placements.push({ wall: doorWall, offsetX: offsets[i] });
    }
    // Remaining windows go on side walls
    let remaining = count - primaryCount;
    let wallIdx = (walls.indexOf(doorWall) + 1) % 4;
    while (remaining > 0 && placements.length < 4) {
      placements.push({ wall: walls[wallIdx], offsetX: 0 });
      remaining--;
      wallIdx = (wallIdx + 1) % 4;
    }
    return placements;
  }

  // Address → Street View → 3D via Geocoding + GPT-4o Vision
  async function analyzeAddress() {
    if (!addressQuery.trim()) return;
    setAddressLoading(true);
    setPhotoDetected(null);
    try {
      const res = await fetch("/api/ai/analyze-address", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ address: addressQuery.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error buscando dirección");
      }
      const data = await res.json() as {
        formattedAddress: string;
        zip: string;
        city: string;
        state: string;
        neighbourhood: string;
        county: string;
        lat: number;
        lng: number;
        hasStreetView: boolean;
        photoSource: string;
        streetViewBase64: string | null;
        streetViewMimeType: string;
        osmData?: {
          widthFt: number | null; depthFt: number | null; stories: number | null;
          heightFt: number | null; roofShape: string | null; buildingType: string | null;
          source: string;
        };
        propertyData?: {
          sqft: number | null; beds: number | null; baths: number | null;
          yearBuilt: number | null; lotSqft: number | null; propertyType: string | null; source: string;
        };
        building: Record<string, unknown>;
      };

      // Show Street View as the photo reference preview
      if (data.hasStreetView && data.streetViewBase64) {
        const byteStr = atob(data.streetViewBase64);
        const ab = new ArrayBuffer(byteStr.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
        const blob = new Blob([ab], { type: data.streetViewMimeType });
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
      }

      // Apply building analysis the same way as photo analysis
      const bd = data.building;
      if (bd && Object.keys(bd).length > 0) {
        const sidingProd = SIDING_PRODUCTS.find(p => p.matType === bd.wallMaterial) ?? SIDING_PRODUCTS[0];
        const roofProd   = ROOFING_PRODUCTS.find(p => p.matType === bd.roofMaterial) ?? ROOFING_PRODUCTS[0];
        const wCount = Math.min(Math.max(Number(bd.windowCount) || 2, 0), 6);
        const windowPlacements = buildPhotoWindowPlacements(wCount, "front");

        // ── Door placements: entry door + optional front garage door ──
        const entryOffsetX = typeof bd.entryDoorOffsetX === "number" ? bd.entryDoorOffsetX
                           : typeof bd.doorOffsetX      === "number" ? bd.doorOffsetX : 0;
        const newDoorPlacements: DoorPlacement[] = [
          { wall: "front", offsetX: entryOffsetX, widthFt: 3.5, heightFt: 7 },
        ];
        if (bd.hasGarage === true) {
          const gW = Number(bd.garageDoorWidth) || 16;
          const gOff = typeof bd.garageOffsetX === "number" ? bd.garageOffsetX : (entryOffsetX > 0 ? -0.35 : 0.35);
          newDoorPlacements.push({ wall: "front", offsetX: gOff, widthFt: gW, heightFt: 7 });
        } else {
          newDoorPlacements.push({ wall: "back", offsetX: 0, widthFt: 9, heightFt: 7 });
        }

        setExterior(p => ({
          ...p,
          ...(bd as Partial<StructureParams>),
          // Stories
          stories: (Number(bd.stories) === 2 ? 2 : 1) as 1 | 2,
          // Dimensions
          widthFt:      Number(bd.widthFt)      || p.widthFt,
          depthFt:      Number(bd.depthFt)      || p.depthFt,
          wallHeightFt: Number(bd.wallHeightFt) || p.wallHeightFt,
          ridgeHeightFt:Number(bd.ridgeHeightFt)|| p.ridgeHeightFt,
          roofOverhang: Number(bd.roofOverhang) || p.roofOverhang,
          // Windows
          windowCount: wCount,
          windowPlacements,
          windowStyle: (["single","double","arched","picture"].includes(bd.windowStyle as string)
            ? bd.windowStyle as "single"|"double"|"arched"|"picture" : p.windowStyle),
          // Doors
          doorPlacements: newDoorPlacements,
          doorWall: "front",
          doorOffsetX: entryOffsetX,
          doorStyle: (["single","double","sidelite"].includes(bd.doorStyle as string)
            ? bd.doorStyle as "single"|"double"|"sidelite" : p.doorStyle),
          // Materials
          wallProductId: sidingProd.id, wallMaterial: sidingProd.matType,
          roofProductId: roofProd.id,   roofMaterial: roofProd.matType,
          // Colors
          wallColor:       (bd.wallColor as string)       || p.wallColor,
          roofColor:       (bd.roofColor as string)       || p.roofColor,
          trimColor:       (bd.trimColor as string)       ?? p.trimColor,
          fasciaColor:     (bd.fasciaColor as string)     ?? p.fasciaColor,
          soffitColor:     (bd.soffitColor as string)     ?? p.soffitColor,
          windowTrimColor: (bd.windowTrimColor as string) ?? p.windowTrimColor,
          shutterColor:    (bd.shutterColor as string)    ?? p.shutterColor,
          // Features
          shuttersEnabled:  bd.shuttersEnabled  === true,
          lightsEnabled:    bd.lightsEnabled    === true,
          gableVentEnabled: bd.gableVentEnabled === true,
          hasPorch:    bd.hasPorch    === true,
          hasChimney:  bd.hasChimney  === true,
          hasDormer:   bd.hasDormer   === true,
          dormerCount: typeof bd.dormerCount === "number" ? bd.dormerCount : (bd.hasDormer ? 2 : 0),
        }));

        setPhotoDetected({
          description: (bd.description as string) ?? data.formattedAddress,
          widthFt: (bd.widthFt as number) ?? 30,
          depthFt: (bd.depthFt as number) ?? 26,
          wallHeightFt: (bd.wallHeightFt as number) ?? 9,
          ridgeHeightFt: (bd.ridgeHeightFt as number) ?? 5,
          roofType: (bd.roofType as string) ?? "gable",
        });
        setHasGenerated(true);
        setMode("exterior");
        setAddressInfo({
          formattedAddress: data.formattedAddress,
          city: data.city, state: data.state,
          neighbourhood: data.neighbourhood, county: data.county, zip: data.zip,
          lat: data.lat, lng: data.lng,
          hasPhoto: data.hasStreetView,
          photoSource: data.photoSource,
          osmData: data.osmData,
          propertyData: data.propertyData,
          description: (bd.description as string) ?? "",
        });
        const src = data.osmData?.source ?? "estimate";
        const titleMap: Record<string, string> = {
          "photo+measurements": "Modelo desde foto real + medidas",
          "photo":              "Modelo desde foto real de la calle",
          "measurements":       "Modelo con medidas reales",
          "estimate":           "Modelo generado por dirección",
        };
        toast({
          title: titleMap[src] ?? "Modelo generado",
          description: data.formattedAddress.split(",").slice(0, 2).join(","),
        });
      } else {
        toast({
          title: "Dirección encontrada",
          description: data.hasStreetView
            ? "Sin suficiente detalle en Street View — usa el chat para describir el edificio"
            : `${data.formattedAddress} — no hay Street View disponible`,
          variant: "destructive",
        });
      }

      setAddressOpen(false);
      setAddressQuery("");
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally { setAddressLoading(false); }
  }

  // ── Multi-Photo → 3D: up to 8 angles, all sent to GPT-4o at once ────────────
  // Each entry: label shown to user + camera position in top-down SVG (cx,cy) + arrow direction
  const ANGLE_CONFIG = [
    { label: "Frente",              short: "Frente",          cx: 32, cy: 58, arrowTo: { x: 32, y: 45 } },
    { label: "Lado izquierdo",      short: "Lado izq.",       cx: 4,  cy: 32, arrowTo: { x: 16, y: 32 } },
    { label: "Lado derecho",        short: "Lado der.",       cx: 60, cy: 32, arrowTo: { x: 48, y: 32 } },
    { label: "Atrás",               short: "Atrás",           cx: 32, cy: 6,  arrowTo: { x: 32, y: 19 } },
    { label: "Diagonal izq. frente",short: "Diag. izq. front",cx: 6,  cy: 58, arrowTo: { x: 18, y: 46 } },
    { label: "Diagonal der. frente",short: "Diag. der. front",cx: 58, cy: 58, arrowTo: { x: 46, y: 46 } },
    { label: "Diagonal izq. atrás", short: "Diag. izq. atrás",cx: 6,  cy: 6,  arrowTo: { x: 18, y: 18 } },
    { label: "Diagonal der. atrás", short: "Diag. der. atrás",cx: 58, cy: 6,  arrowTo: { x: 46, y: 18 } },
  ] as const;
  const ANGLE_LABELS = ANGLE_CONFIG.map(a => a.label);

  function addMultiPhoto(file: File) {
    if (multiPhotos.length >= 8) {
      toast({ title: "Máximo 8 fotos", description: "Eliminá una para agregar otra.", variant: "destructive" });
      return;
    }
    const label = ANGLE_LABELS[multiPhotos.length] ?? `Foto ${multiPhotos.length + 1}`;
    const previewUrl = URL.createObjectURL(file);
    setMultiPhotos(prev => [...prev, { file, previewUrl, label }]);
  }

  function removeMultiPhoto(index: number) {
    setMultiPhotos(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function analyzeMultiPhotos() {
    if (multiPhotos.length === 0) {
      toast({ title: "Agregá al menos 1 foto", variant: "destructive" });
      return;
    }
    setMultiPhotoLoading(true);
    try {
      // Encode all photos to base64
      const images = await Promise.all(multiPhotos.map(async p => {
        const { base64, mimeType } = await resizeAndConvert(p.file);
        return { base64, mimeType, label: p.label };
      }));

      const res = await fetch("/api/ai/analyze-multi-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al analizar las fotos");

      // Same mapping as single-photo analysis
      const sidingProd = SIDING_PRODUCTS.find(p => p.matType === data.wallMaterial) ?? SIDING_PRODUCTS[0];
      const roofProd   = ROOFING_PRODUCTS.find(p => p.matType === data.roofMaterial) ?? ROOFING_PRODUCTS[0];

      // Use front photo as preview
      if (multiPhotos[0]) setPhotoPreviewUrl(multiPhotos[0].previewUrl);

      setExterior(prev => ({
        ...prev,
        type:          data.type ?? "house",
        widthFt:       typeof data.widthFt === "number" ? Math.max(20, Math.min(80, data.widthFt)) : prev.widthFt,
        depthFt:       typeof data.depthFt === "number" ? Math.max(18, Math.min(60, data.depthFt)) : prev.depthFt,
        wallHeightFt:  typeof data.wallHeightFt === "number" ? Math.max(7, Math.min(20, data.wallHeightFt)) : prev.wallHeightFt,
        stories:       data.stories === 2 ? 2 : 1,
        roofType:      (["gable","hip","flat","gambrel"].includes(data.roofType)) ? data.roofType : prev.roofType,
        ridgeHeightFt: typeof data.ridgeHeightFt === "number" ? Math.max(0.3, Math.min(data.stories === 2 ? 12 : 8, data.ridgeHeightFt)) : prev.ridgeHeightFt,
        roofOverhang:  typeof data.roofOverhang === "number" ? Math.max(0.5, Math.min(3, data.roofOverhang)) : prev.roofOverhang,
        wallMaterial:  sidingProd.matType as StructureParams["wallMaterial"],
        wallColor:     typeof data.wallColor === "string" && data.wallColor.startsWith("#") ? data.wallColor : prev.wallColor,
        wallProductId: sidingProd.id,
        roofMaterial:  roofProd.matType as StructureParams["roofMaterial"],
        roofColor:     typeof data.roofColor === "string" && data.roofColor.startsWith("#") ? data.roofColor : prev.roofColor,
        roofProductId: roofProd.id,
        trimColor:     typeof data.trimColor === "string" && data.trimColor.startsWith("#") ? data.trimColor : prev.trimColor,
        fasciaColor:   typeof data.fasciaColor === "string" && data.fasciaColor.startsWith("#") ? data.fasciaColor : prev.fasciaColor,
        soffitColor:   typeof data.soffitColor === "string" && data.soffitColor.startsWith("#") ? data.soffitColor : prev.soffitColor,
        windowTrimColor: typeof data.windowTrimColor === "string" && data.windowTrimColor.startsWith("#") ? data.windowTrimColor : prev.windowTrimColor,
        shutterColor:  typeof data.shutterColor === "string" && data.shutterColor.startsWith("#") ? data.shutterColor : null,
        shuttersEnabled: data.shuttersEnabled === true,
        windowStyle:   (["single","double","arched","picture"].includes(data.windowStyle)) ? data.windowStyle : prev.windowStyle,
        doorStyle:     (["single","double","sidelite"].includes(data.doorStyle)) ? data.doorStyle : prev.doorStyle,
        windowCount:   typeof data.windowCount === "number" ? Math.max(1, Math.min(8, data.windowCount)) : prev.windowCount,
        hasPorch:      data.hasPorch === true,
        hasChimney:    data.hasChimney === true,
        hasDormer:     data.hasDormer === true,
        dormerCount:   typeof data.dormerCount === "number" ? data.dormerCount : prev.dormerCount,
        hasGarage:     data.hasGarage === true,
        garageDoorWidth: data.garageDoorWidth ?? prev.garageDoorWidth,
        garageOffsetX:   typeof data.garageOffsetX === "number" ? data.garageOffsetX : prev.garageOffsetX,
        entryDoorOffsetX: typeof data.entryDoorOffsetX === "number" ? data.entryDoorOffsetX : prev.entryDoorOffsetX,
      }));

      setPhotoDetected({ ...data, description: data.description ?? `${images.length} fotos analizadas` });
      setHasGenerated(true);
      setMultiPhotoOpen(false);

      toast({
        title: `${images.length} fotos analizadas`,
        description: data.description ?? "Modelo 3D generado con múltiples ángulos",
      });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setMultiPhotoLoading(false);
    }
  }

  // ── AI Photo Visualization: Street View + materials → DALL-E 3 render ──────
  async function visualizeMaterials() {
    if (!addressInfo) {
      toast({ title: "Primero buscá una dirección", description: "El sistema necesita la ubicación para obtener la foto de Street View.", variant: "destructive" });
      return;
    }
    setVizLoading(true);
    setVizModalOpen(true);
    setVizImageUrl(null);
    try {
      const wallProd = SIDING_PRODUCTS.find(p => p.id === exterior.wallProductId);
      const roofProd = ROOFING_PRODUCTS.find(p => p.id === exterior.roofProductId);
      const res = await fetch("/api/ai/visualize-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          lat: addressInfo.lat,
          lng: addressInfo.lng,
          address: addressInfo.formattedAddress,
          wallColor: exterior.wallColor,
          wallProductName: wallProd ? `${wallProd.brand} ${wallProd.name}` : undefined,
          roofColor: exterior.roofColor,
          roofProductName: roofProd ? `${roofProd.brand} ${roofProd.name}` : undefined,
          stories: exterior.stories ?? 1,
          roofType: exterior.roofType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al generar la imagen");
      setVizImageUrl(data.imageUrl);
    } catch (err) {
      toast({ title: "Error al visualizar", description: (err as Error).message, variant: "destructive" });
      setVizModalOpen(false);
    } finally {
      setVizLoading(false);
    }
  }

  // Photo → 3D via GPT-4o Vision
  async function analyzePhoto(file: File) {
    setPhotoLoading(true);
    setPhotoDetected(null);
    // Show preview immediately while AI analyzes
    const prevUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(prevUrl);
    try {
      const { base64, mimeType } = await resizeAndConvert(file);
      const res = await fetch("/api/ai/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) throw new Error("analyze-photo failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const sidingProd = SIDING_PRODUCTS.find(p => p.matType === data.wallMaterial) ?? SIDING_PRODUCTS[0];
      const roofProd   = ROOFING_PRODUCTS.find(p => p.matType === data.roofMaterial) ?? ROOFING_PRODUCTS[0];
      const dWall: WallFace = (["front","back","left","right"] as WallFace[]).includes(data.doorWall) ? data.doorWall : "front";
      const wCount = Math.min(Math.max(Number(data.windowCount) || 2, 0), 4);
      const windowPlacements = buildPhotoWindowPlacements(wCount, dWall);

      setExterior(p => ({
        ...p,
        ...data,
        windowCount: wCount,
        windowPlacements,
        doorWall: dWall,
        doorOffsetX: typeof data.doorOffsetX === "number" ? data.doorOffsetX : 0,
        wallProductId: sidingProd.id, wallMaterial: sidingProd.matType,
        roofProductId: roofProd.id,   roofMaterial: roofProd.matType,
        // Explicit trim/feature fields from photo analysis
        trimColor:       data.trimColor       ?? null,
        fasciaColor:     data.fasciaColor     ?? null,
        soffitColor:     data.soffitColor     ?? null,
        windowTrimColor: data.windowTrimColor ?? null,
        shutterColor:    data.shutterColor    ?? null,
        shuttersEnabled: data.shuttersEnabled === true,
        lightsEnabled:   data.lightsEnabled   === true,
        gableVentEnabled: data.gableVentEnabled === true,
      }));

      setPhotoDetected({
        description: data.description ?? "Estructura detectada desde foto",
        widthFt: data.widthFt ?? 16,
        depthFt: data.depthFt ?? 11,
        wallHeightFt: data.wallHeightFt ?? 8,
        ridgeHeightFt: data.ridgeHeightFt ?? 3,
        roofType: data.roofType ?? "gable",
      });
      setHasGenerated(true);
      setMode("exterior");
      toast({ title: "✓ Foto analizada", description: data.description ?? "Diseño generado desde la foto" });
    } catch {
      URL.revokeObjectURL(prevUrl);
      setPhotoPreviewUrl(null);
      toast({ title: "Error", description: "No se pudo analizar la foto", variant: "destructive" });
    } finally { setPhotoLoading(false); }
  }

  const generateStructure = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/design-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ prompt: `${mode === "interior" ? "[INTERIOR SPACE] " : ""}${prompt}` }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      if (mode === "exterior") {
        // Find matching siding product by material type
        const sidingProd = SIDING_PRODUCTS.find(p => p.matType === data.wallMaterial) ?? SIDING_PRODUCTS[0];
        const roofProd = ROOFING_PRODUCTS.find(p => p.matType === data.roofMaterial) ?? ROOFING_PRODUCTS[0];
        setExterior(p => ({
          ...p, ...data,
          wallProductId: sidingProd.id, wallMaterial: sidingProd.matType,
          roofProductId: roofProd.id,   roofMaterial: roofProd.matType,
        }));
      } else {
        const floorProd = FLOOR_PRODUCTS.find(p => p.matType === data.floorMaterial) ?? FLOOR_PRODUCTS[0];
        const wallProd  = WALL_FINISH_PRODUCTS.find(p => p.matType === data.wallMaterial) ?? WALL_FINISH_PRODUCTS[0];
        setInterior(p => ({
          ...p,
          widthFt: data.widthFt ?? p.widthFt,
          depthFt: data.depthFt ?? p.depthFt,
          heightFt: data.wallHeightFt ?? p.heightFt,
          description: data.description ?? p.description,
          floorProductId: floorProd.id, floorMaterial: floorProd.matType,
          wallProductId: wallProd.id,   wallMaterial: wallProd.matType,
          ...(data.floorColor && { floorColor: data.floorColor }),
          ...(data.wallColor  && { wallColor:  data.wallColor  }),
        }));
      }
      setHasGenerated(true);
      setChatMessages([]); // clear chat on fresh generation
      toast({ title: "Diseño generado", description: data.description });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el diseño", variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    const userMsg = { role: "user" as const, content: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/design-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          message: msg,
          currentParams: exterior,
          history: chatMessages,
        }),
      });
      if (!res.ok) throw new Error("design-chat failed");
      const data = await res.json();
      if (data.message) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      }
      if (data.updates && typeof data.updates === "object" && Object.keys(data.updates).length > 0) {
        setExterior(prev => ({ ...prev, ...data.updates }));
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ No se pudo procesar el cambio. Intentá de nuevo." }]);
    } finally { setChatLoading(false); }
  };

  const generateEstimate = () => {
    const s = ext;
    setEstOpen(true);
    const result = calculateLocalEstimate({
      widthFt:      s.widthFt,
      depthFt:      s.depthFt,
      wallHeightFt: s.wallHeightFt,
      stories:      s.stories,
      roofType:     s.roofType,
      roofMaterial: s.roofMaterial,
      roofProductId: s.roofProductId,
      wallMaterial: s.wallMaterial,
      wallProductId: s.wallProductId,
      hasChimney:   s.hasChimney,
      hasPorch:     s.hasPorch,
      doorCount:    s.doorCount,
      windowCount:  s.windowCount,
    });
    setEstText(result);
  };

  const extU = (k: keyof StructureParams, v: unknown) => setExterior(p => ({ ...p, [k]: v }));
  const intU = (k: keyof InteriorParams,  v: unknown) => setInterior(p => ({ ...p, [k]: v }));

  const ext = exterior;
  const int = interior;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Mobile Tab Bar (only visible on small screens) ── */}
      <div className="md:hidden flex border-b border-border bg-card shrink-0">
        <button
          onClick={() => setMobileTab("controls")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            mobileTab === "controls"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          Controles
        </button>
        <button
          onClick={() => setMobileTab("canvas")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            mobileTab === "canvas"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
          Vista 3D
        </button>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── Left Panel ── */}
      <div
        className="flex flex-col bg-card border-r border-border shrink-0"
        style={{
          display: (!isMobile || mobileTab === "controls") ? "flex" : "none",
          width: isMobile ? "100%" : "320px",
          minWidth: isMobile ? undefined : "320px",
        }}
      >

        {/* Header */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              Diseñador 3D con IA
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Elegí el producto — la IA lo construye</p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setMode("exterior")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                mode === "exterior" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Box className="w-3.5 h-3.5" /> Exterior
            </button>
            <button onClick={() => setMode("interior")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                mode === "interior" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Home className="w-3.5 h-3.5" /> Interior
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* AI Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mode === "exterior" ? "Describí la estructura" : "Describí el espacio"}
            </label>

            {/* ── Quick Design Prompts ── */}
            {mode === "exterior" && (
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Diseños rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { emoji: "🏛️", label: "Colonial 2P", prompt: "Casa colonial americana 2 pisos, 40×32 ft, HardiePlank azul marino oscuro, trim blanco puro, techo 2 aguas carbón alto, ventanas de arco palladian, puerta doble con sidelites, porche frontal con columnas blancas, chimenea lateral, shutters negros, luces exteriores" },
                    { emoji: "🌾", label: "Farmhouse", prompt: "Modern farmhouse 36×28 ft, siding vertical hardie panel blanco alabastro, techo metal negro standing seam, ventanas picture panorámicas grandes, puerta simple negra, trim negro, porche frontal ancho, 2 dormers en frente, 1 chimenea, sin shutters, estilo minimalista bold" },
                    { emoji: "🏡", label: "Craftsman", prompt: "Bungalow craftsman 32×26 ft, madera cedro natural caoba, techo 2 aguas bajo con alero amplio 2.5ft, ventanas dobles con mullion, puerta simple panel rústico, porche amplio con columnas de madera, shutters verde oscuro bosque, luces de pared vintage" },
                    { emoji: "⛵", label: "Cape Cod", prompt: "Cape Cod 34×28 ft, HardiePlank blanco clásico, techo 2 aguas gris pizarra alto 7ft, 2 dormers frontales con ventanas simples, shutters azul marino navy, trim blanco, fundación de bloque expuesta 2ft, luces exteriores coloniales" },
                    { emoji: "🦆", label: "Dutch Gambrel", prompt: "Casa Dutch Colonial gambrel 38×30 ft 2 pisos, HardiePlank gris plata, techo gambrel verde oscuro, 3 dormers con ventanas de arco, porche frontal cubierto con columnas, puerta doble con sidelites, chimenea izquierda, trim crema, shutters negro carbón, belt course blanco entre pisos" },
                    { emoji: "⬛", label: "Moderno", prompt: "Casa contemporánea moderna 44×34 ft 2 pisos, hardie panel gris antracita oscuro, techo plano membrana TPO, ventanas picture panorámicas anchas, puerta sidelite negra minimalista, trim gris oscuro, sin shutters, fundación alta 3ft, sin alero" },
                    { emoji: "🤠", label: "Ranch", prompt: "Ranch house 52×30 ft 1 piso, vinyl beige arena, techo hip bajo gris charcoal, ventanas dobles horizontales, puerta simple marrón, trim blanco marfil, overhang 2ft, fundación 1ft, shutters café chocolate, luces de pared bajas" },
                    { emoji: "🏰", label: "Tudor", prompt: "Casa Tudor revival 38×32 ft 2 pisos, wood shake marrón oscuro medieval, techo hip muy inclinado ridgeHeightFt 8 color negro pizarra, ventanas arco palladian, puerta doble oscura, trim crema antiguo, chimenea central prominente, shutters negro hierro, fundación piedra 2.5ft" },
                  ].map(({ emoji, label, prompt: p }) => (
                    <button key={label} onClick={() => setPrompt(p)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap">
                      <span>{emoji}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) generateStructure(); }}
              placeholder={mode === "exterior"
                ? "Describí tu diseño o elegí uno de los estilos de arriba..."
                : "Ej: cocina 14x12 con porcelana gris y pintura Sherwin-Williams"}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary" />
            <Button onClick={generateStructure} disabled={loading || !prompt.trim()} className="w-full" size="sm">
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Generando...</>
                : <><Wand2 className="w-3.5 h-3.5 mr-2" />Generar con IA</>
              }
            </Button>
          </div>

          {/* ── Conversational Design Chat ── */}
          {hasGenerated && mode === "exterior" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Chat con IA
                </label>
                {chatMessages.length > 0 && (
                  <button onClick={() => setChatMessages([])}
                    className="text-[9px] text-muted-foreground hover:text-destructive transition-colors">
                    Limpiar
                  </button>
                )}
              </div>

              {/* Messages */}
              {chatMessages.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-2 space-y-2 max-h-48 overflow-y-auto text-xs">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex gap-1.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Wand2 className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div className={`rounded-lg px-2.5 py-1.5 max-w-[80%] leading-snug ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-1.5 justify-start">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      </div>
                      <div className="rounded-lg px-2.5 py-1.5 bg-card border border-border text-muted-foreground italic">
                        Aplicando cambios...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Input */}
              <div className="flex gap-1.5">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="Ej: cambia el techo a rojo, ponle porche..."
                  disabled={chatLoading}
                  className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0">
                  {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-[9px] text-muted-foreground text-center">
                Decile a la IA qué cambiar · Presioná Enter para enviar
              </p>
            </div>
          )}

          {/* ── Quick Estimate from Design ── */}
          {hasGenerated && mode === "exterior" && (
            <div className="space-y-2">
              <button
                onClick={generateEstimate}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />Crear Estimado con este diseño
              </button>

              {estOpen && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Estimado — NJ/PA 2025
                    </p>
                    <button onClick={() => setEstOpen(false)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-900 transition-colors">✕</button>
                  </div>

                  <p className="text-[11px] text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed font-mono">
                    {estText}
                  </p>

                  {estText && (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200 dark:border-emerald-700">
                      <button
                        onClick={generateEstimate}
                        className="text-[9px] text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 transition-colors underline">
                        Recalcular
                      </button>
                      <a href="/dashboard/estimates"
                        className="flex items-center gap-1 text-[9px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 font-semibold transition-colors">
                        Ver estimados <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Address Info Panel ── */}
          {addressInfo && mode === "exterior" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Información de la ubicación
                </p>
                <button onClick={() => setAddressInfo(null)}
                  className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors">✕</button>
              </div>

              {/* Street photo if available */}
              {photoPreviewUrl && addressInfo.hasPhoto && (
                <div className="mx-3 mb-2 rounded overflow-hidden border border-blue-200">
                  <img src={photoPreviewUrl} alt="Foto de la calle" className="w-full object-cover" style={{ maxHeight: 120, objectPosition: "center" }} />
                  <div className="bg-blue-900/80 px-2 py-0.5">
                    <span className="text-[8px] text-blue-200 font-medium">Foto real de KartaView</span>
                  </div>
                </div>
              )}

              <div className="px-3 pb-3 space-y-2">
                {/* Address */}
                <div>
                  <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 leading-snug">
                    {addressInfo.city || addressInfo.formattedAddress.split(",")[0]}
                    {addressInfo.state ? `, ${addressInfo.state}` : ""}
                    {addressInfo.zip ? ` ${addressInfo.zip}` : ""}
                  </p>
                  {addressInfo.neighbourhood && (
                    <p className="text-[9px] text-blue-600 dark:text-blue-500">{addressInfo.neighbourhood}{addressInfo.county ? ` · ${addressInfo.county}` : ""}</p>
                  )}
                  <p className="text-[8px] text-blue-400 font-mono mt-0.5">{addressInfo.lat.toFixed(5)}, {addressInfo.lng.toFixed(5)}</p>
                </div>

                {/* Real property data from Zillow/Redfin */}
                {addressInfo.propertyData && (addressInfo.propertyData.sqft || addressInfo.propertyData.yearBuilt) && (
                  <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded p-2 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Datos reales de la propiedad
                      <span className="ml-1 font-normal normal-case text-emerald-500">· {addressInfo.propertyData.source}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono">
                      {addressInfo.propertyData.sqft && <span className="text-emerald-700 dark:text-emerald-300">Área: <strong>{addressInfo.propertyData.sqft.toLocaleString()} sqft</strong></span>}
                      {addressInfo.propertyData.beds && <span className="text-emerald-700 dark:text-emerald-300">Hab.: <strong>{addressInfo.propertyData.beds}</strong></span>}
                      {addressInfo.propertyData.baths && <span className="text-emerald-700 dark:text-emerald-300">Baños: <strong>{addressInfo.propertyData.baths}</strong></span>}
                      {addressInfo.propertyData.yearBuilt && <span className="text-emerald-700 dark:text-emerald-300">Año: <strong>{addressInfo.propertyData.yearBuilt}</strong></span>}
                      {addressInfo.propertyData.lotSqft && <span className="text-emerald-700 dark:text-emerald-300">Lote: <strong>{addressInfo.propertyData.lotSqft.toLocaleString()} sqft</strong></span>}
                      {addressInfo.propertyData.propertyType && <span className="text-emerald-700 dark:text-emerald-300">Tipo: <strong>{addressInfo.propertyData.propertyType}</strong></span>}
                    </div>
                  </div>
                )}

                {/* Building measurements used in 3D model */}
                <div className="bg-white/60 dark:bg-black/20 rounded p-2 space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Medidas aplicadas al modelo
                    {addressInfo.photoSource === "google_street_view" && <span className="ml-1 text-emerald-600">· Street View</span>}
                    {addressInfo.photoSource === "zillow" && <span className="ml-1 text-amber-600">· Zillow</span>}
                    {addressInfo.photoSource === "kartaview" && <span className="ml-1 text-amber-600">· KartaView</span>}
                    {(!addressInfo.photoSource || addressInfo.photoSource === "none") && addressInfo.osmData?.source.includes("measurements") && <span className="ml-1 text-amber-600">· OSM</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono">
                    <span className="text-blue-700 dark:text-blue-300">Pisos: <strong>{exterior.stories ?? 1}</strong></span>
                    <span className="text-blue-700 dark:text-blue-300">Ancho: <strong>{exterior.widthFt} ft</strong></span>
                    <span className="text-blue-700 dark:text-blue-300">Largo: <strong>{exterior.depthFt} ft</strong></span>
                    <span className="text-blue-700 dark:text-blue-300">Muro: <strong>{exterior.wallHeightFt} ft</strong></span>
                    <span className="text-blue-700 dark:text-blue-300">Techo: <strong>{exterior.roofType}</strong></span>
                    {exterior.hasPorch && <span className="text-blue-700 dark:text-blue-300">Porche: <strong>sí</strong></span>}
                    {exterior.hasChimney && <span className="text-blue-700 dark:text-blue-300">Chimenea: <strong>sí</strong></span>}
                  </div>
                </div>

                {/* AI description */}
                {addressInfo.description && (
                  <p className="text-[9px] text-blue-600 dark:text-blue-500 italic leading-snug">{addressInfo.description}</p>
                )}

                <p className="text-[8px] text-blue-400">Dimensiones aplicadas al modelo · Usá los controles para ajustar</p>
              </div>
            </div>
          )}

          {/* ── Photo Detected Banner (for manual photo uploads) ── */}
          {photoDetected && !addressInfo && mode === "exterior" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Camera className="w-3 h-3" /> Detectado desde foto
                </p>
                <button onClick={() => setPhotoDetected(null)}
                  className="text-[9px] text-emerald-600 hover:text-emerald-800 dark:text-emerald-500 transition-colors">✕</button>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium leading-snug">{photoDetected.description}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-emerald-600 dark:text-emerald-500 font-mono">
                <span>{photoDetected.widthFt}×{photoDetected.depthFt} ft</span>
                <span>Pared {photoDetected.wallHeightFt} ft</span>
                <span>Techo {photoDetected.ridgeHeightFt} ft</span>
                <span>{photoDetected.roofType === "gable" ? "2 Aguas" : photoDetected.roofType === "hip" ? "Hip" : "Plano"}</span>
              </div>
              <p className="text-[9px] text-emerald-500 dark:text-emerald-600 italic">Dimensiones y materiales aplicados · Usá los controles para ajustar</p>
            </div>
          )}

          {/* ── EXTERIOR ── */}
          {mode === "exterior" && (
            <>
              {/* Dimensions */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Dimensiones (pies)</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { k:"widthFt" as const, label:"Ancho" },
                    { k:"depthFt" as const, label:"Largo" },
                    { k:"wallHeightFt" as const, label:"Alt. pared" },
                    { k:"ridgeHeightFt" as const, label:"Alt. techo" },
                  ]).map(({ k, label }) => (
                    <div key={k}>
                      <label className="text-[10px] text-muted-foreground">{label}</label>
                      <input type="number" value={ext[k]} min={1} max={200}
                        onChange={e => extU(k, Number(e.target.value))}
                        className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Roof type + ridge axis */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Tipo de techo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["gable","flat","hip","gambrel"] as const).map(rt => (
                    <button key={rt} onClick={() => extU("roofType", rt)}
                      className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                        ext.roofType === rt ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>
                      {rt === "gable" ? "2 Aguas" : rt === "flat" ? "Plano" : rt === "gambrel" ? "Gambrel" : "Hip"}
                    </button>
                  ))}
                </div>
                {ext.roofType === "gable" && (
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">Orientación:</span>
                    <button onClick={() => extU("ridgeAxis", "w")}
                      className={`flex-1 py-1 text-[10px] font-medium rounded border transition-colors ${
                        (ext.ridgeAxis ?? "w") === "w" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`} title="Cumbrera corre a lo largo (frente↔atrás)">
                      ↔ Ancho
                    </button>
                    <button onClick={() => extU("ridgeAxis", "d")}
                      className={`flex-1 py-1 text-[10px] font-medium rounded border transition-colors ${
                        (ext.ridgeAxis ?? "w") === "d" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`} title="Cumbrera corre a lo ancho (izq↔der)">
                      ↕ Largo
                    </button>
                  </div>
                )}
              </div>

              {/* Siding product selector */}
              <ProductSelector
                products={SIDING_PRODUCTS}
                selectedId={ext.wallProductId}
                selectedColor={ext.wallColor}
                label="Siding — Material de paredes"
                onSelect={p => setExterior(prev => ({
                  ...prev,
                  wallProductId: p.id,
                  wallMaterial: p.matType,
                  wallColor: p.suggestedColors?.[0] ?? prev.wallColor,
                }))}
                onColorChange={v => extU("wallColor", v)}
              />

              {/* Roofing product selector */}
              <ProductSelector
                products={ROOFING_PRODUCTS}
                selectedId={ext.roofProductId}
                selectedColor={ext.roofColor}
                label="Techos — Roofing material"
                onSelect={p => setExterior(prev => ({
                  ...prev,
                  roofProductId: p.id,
                  roofMaterial: p.matType,
                  roofColor: p.suggestedColors?.[0] ?? prev.roofColor,
                }))}
                onColorChange={v => extU("roofColor", v)}
              />

              {/* ── Estructura Avanzada ── */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setShowStruct(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" />Estructura Avanzada</span>
                  {showStruct ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showStruct && (
                  <div className="p-3 space-y-4 bg-background/60">

                    {/* Stories */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Pisos / Stories</label>
                      <div className="flex gap-2">
                        {([1, 2] as const).map(n => (
                          <button key={n} onClick={() => extU("stories", n)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                              (ext.stories ?? 1) === n ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}>
                            {n === 1 ? "1 Piso" : "2 Pisos"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Foundation height */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Fundación visible — {(ext.foundationHeightFt ?? 1.5).toFixed(1)} ft
                      </label>
                      <input type="range" min={0.5} max={4} step={0.5} value={ext.foundationHeightFt ?? 1.5}
                        onChange={e => extU("foundationHeightFt", Number(e.target.value))}
                        className="w-full accent-primary" />
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>0.5 ft</span><span>4 ft</span></div>
                    </div>

                    {/* Window style */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Estilo de ventanas</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["single","double","arched","picture"] as const).map(ws => (
                          <button key={ws} onClick={() => extU("windowStyle", ws)}
                            className={`py-1.5 text-[10px] font-medium rounded border transition-colors ${
                              (ext.windowStyle ?? "single") === ws ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}>
                            {ws === "single" ? "Simple" : ws === "double" ? "Doble" : ws === "arched" ? "Arco" : "Picture"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Door style */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Estilo de puerta</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["single","double","sidelite"] as const).map(ds => (
                          <button key={ds} onClick={() => extU("doorStyle", ds)}
                            className={`py-1.5 text-[10px] font-medium rounded border transition-colors ${
                              (ext.doorStyle ?? "single") === ds ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}>
                            {ds === "single" ? "Simple" : ds === "double" ? "Doble" : "Sidelite"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Front porch */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Porche frontal</label>
                        <button onClick={() => extU("hasPorch", !ext.hasPorch)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${ext.hasPorch ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${ext.hasPorch ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                      {ext.hasPorch && (
                        <div className="space-y-2 pl-1">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Ancho: {(ext.porchWidthFt ?? 12).toFixed(0)} ft</label>
                            <input type="range" min={8} max={ext.widthFt} step={1} value={ext.porchWidthFt ?? 12}
                              onChange={e => extU("porchWidthFt", Number(e.target.value))}
                              className="w-full accent-primary" />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Profundidad: {(ext.porchDepthFt ?? 6).toFixed(0)} ft</label>
                            <input type="range" min={4} max={12} step={1} value={ext.porchDepthFt ?? 6}
                              onChange={e => extU("porchDepthFt", Number(e.target.value))}
                              className="w-full accent-primary" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chimney */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chimenea</label>
                        <button onClick={() => extU("hasChimney", !ext.hasChimney)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${ext.hasChimney ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${ext.hasChimney ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                      {ext.hasChimney && (
                        <div className="pl-1">
                          <label className="text-[9px] text-muted-foreground">Posición horizontal</label>
                          <input type="range" min={-90} max={90} step={5} value={Math.round((ext.chimneyX ?? 0.3) * 100)}
                            onChange={e => extU("chimneyX", Number(e.target.value) / 100)}
                            className="w-full accent-primary" />
                          <div className="flex justify-between text-[9px] text-muted-foreground"><span>← Izq</span><span>Centro</span><span>Der →</span></div>
                        </div>
                      )}
                    </div>

                    {/* Dormers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dormers</label>
                        <button onClick={() => extU("hasDormer", !ext.hasDormer)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${ext.hasDormer ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${ext.hasDormer ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                      {ext.hasDormer && (
                        <div>
                          <label className="text-[9px] text-muted-foreground mb-1 block">Cantidad</label>
                          <div className="flex gap-1.5">
                            {([1,2,3] as const).map(n => (
                              <button key={n} onClick={() => extU("dormerCount", n)}
                                className={`flex-1 py-1 text-[10px] font-medium rounded border transition-colors ${
                                  (ext.dormerCount ?? 2) === n ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                                }`}>{n}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* ── Trim & Accesorios ── */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setShowTrim(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-primary" />Trim &amp; Accesorios</span>
                  {showTrim ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showTrim && (
                  <div className="p-3 space-y-3 bg-background/60">

                    {/* Color rows for each trim element */}
                    {([
                      { field: "trimColor" as const,       label: "Esquinas (corner boards)" },
                      { field: "fasciaColor" as const,     label: "Fascia (borde del alero)" },
                      { field: "soffitColor" as const,     label: "Soffit — color (bajo el alero)" },
                      { field: "windowTrimColor" as const, label: "Marco de ventanas" },
                    ]).map(({ field, label }) => (
                      <div key={field}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">{label}</label>
                          <span className="text-[9px] font-mono text-primary">{(ext[field] as string | undefined)?.toUpperCase() ?? "—"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {TRIM_COLORS.map(c => (
                            <button key={c.hex} onClick={() => extU(field, c.hex)} title={c.label}
                              className="rounded overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0"
                              style={{ borderColor: ext[field] === c.hex ? "#f97316" : "transparent",
                                boxShadow: ext[field] === c.hex ? "0 0 0 1px #f97316" : "none" }}>
                              <MaterialSwatch material="paint" color={c.hex} size={20} />
                            </button>
                          ))}
                          <input type="color" value={(ext[field] as string | undefined) ?? "#FFFFFF"}
                            onChange={e => extU(field, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border border-border flex-shrink-0" title="Color personalizado" />
                        </div>
                      </div>
                    ))}

                    {/* Soffit material type toggle */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Soffit — material</label>
                      <div className="flex gap-1.5">
                        {[
                          { id: "soffit_panel", label: "Panel acanalado" },
                          { id: "paint",        label: "Liso" },
                        ].map(opt => (
                          <button key={opt.id} onClick={() => extU("soffitMatType", opt.id)}
                            className={`flex-1 text-[10px] font-semibold py-1 rounded border transition-colors ${
                              (ext.soffitMatType ?? "soffit_panel") === opt.id
                                ? "bg-primary text-white border-primary"
                                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shutters */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Postigos (shutters)</label>
                        <button onClick={() => extU("shuttersEnabled", !ext.shuttersEnabled)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${ext.shuttersEnabled ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          {ext.shuttersEnabled ? "ON" : "OFF"}
                        </button>
                      </div>
                      {ext.shuttersEnabled && (
                        <div className="flex flex-wrap gap-1 items-center">
                          {TRIM_COLORS.map(c => (
                            <button key={c.hex} onClick={() => extU("shutterColor", c.hex)} title={c.label}
                              className="rounded overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0"
                              style={{ borderColor: ext.shutterColor === c.hex ? "#f97316" : "transparent",
                                boxShadow: ext.shutterColor === c.hex ? "0 0 0 1px #f97316" : "none" }}>
                              <MaterialSwatch material="paint" color={c.hex} size={20} />
                            </button>
                          ))}
                          <input type="color" value={ext.shutterColor ?? "#2A3A58"}
                            onChange={e => extU("shutterColor", e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border border-border flex-shrink-0" />
                        </div>
                      )}
                    </div>

                    {/* Toggles: lights + gable vent */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">💡 Luces exteriores</label>
                        <button onClick={() => extU("lightsEnabled", !ext.lightsEnabled)}
                          className={`w-full py-1 text-[10px] font-bold rounded border transition-colors ${
                            ext.lightsEnabled ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          }`}>
                          {ext.lightsEnabled ? "Activadas" : "Desactivadas"}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">🔲 Gable vent</label>
                        <button onClick={() => extU("gableVentEnabled", !ext.gableVentEnabled)}
                          className={`w-full py-1 text-[10px] font-bold rounded border transition-colors ${
                            ext.gableVentEnabled ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          }`}>
                          {ext.gableVentEnabled ? "Activo" : "Sin vent."}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Doors & Windows count */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { k:"doorCount" as const, label:"Puertas", max:2 },
                  { k:"windowCount" as const, label:"Ventanas", max:4 },
                ]).map(({ k, label, max }) => (
                  <div key={k}>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
                    <input type="number" value={ext[k]} min={0} max={max}
                      onChange={e => extU(k, Math.max(0, Math.min(max, Number(e.target.value))))}
                      className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background" />
                  </div>
                ))}
              </div>

              {/* ── Per-door controls (wall + size + position) ── */}
              {ext.doorCount > 0 && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Puertas — pared, tamaño y posición</label>
                  {Array.from({ length: Math.min(ext.doorCount, 2) }).map((_, i) => {
                    const dp: DoorPlacement = ext.doorPlacements?.[i] ?? DEFAULT_DOOR_PLACEMENTS[i] ?? { wall: "front", offsetX: 0, widthFt: 3, heightFt: 7 };
                    const updateDP = (patch: Partial<DoorPlacement>) => {
                      const next: DoorPlacement[] = Array.from({ length: Math.max(ext.doorCount, (ext.doorPlacements?.length ?? 0)) }, (_, j) =>
                        ext.doorPlacements?.[j] ?? DEFAULT_DOOR_PLACEMENTS[j] ?? { wall: "front", offsetX: 0, widthFt: 3, heightFt: 7 }
                      );
                      next[i] = { ...dp, ...patch };
                      extU("doorPlacements", next);
                    };
                    return (
                      <div key={i} className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          🚪 Puerta {ext.doorCount > 1 ? i + 1 : ""} — {dp.widthFt}′ ancho × {dp.heightFt}′ alto
                        </p>

                        {/* Wall selector */}
                        <div className="grid grid-cols-4 gap-1">
                          {(["front","back","left","right"] as WallFace[]).map(face => (
                            <button key={face} onClick={() => updateDP({ wall: face })}
                              className={`py-1 text-[9px] font-medium rounded border transition-colors ${
                                dp.wall === face ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                              }`}>
                              {face === "front" ? "Frente" : face === "back" ? "Atrás" : face === "left" ? "Izq" : "Der"}
                            </button>
                          ))}
                        </div>

                        {/* Width + Height sliders */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-muted-foreground">Ancho: {dp.widthFt} ft</label>
                            <input type="range" min={1.5} max={18} step={0.5} value={dp.widthFt}
                              onChange={e => updateDP({ widthFt: Number(e.target.value) })}
                              className="w-full accent-primary" />
                            <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5"><span>1.5′</span><span>18′</span></div>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground">Alto: {dp.heightFt} ft</label>
                            <input type="range" min={5} max={12} step={0.5} value={dp.heightFt}
                              onChange={e => updateDP({ heightFt: Number(e.target.value) })}
                              className="w-full accent-primary" />
                            <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5"><span>5′</span><span>12′</span></div>
                          </div>
                        </div>

                        {/* Horizontal position slider */}
                        <div>
                          <input type="range" min={-85} max={85} step={5} value={Math.round(dp.offsetX * 100)}
                            onChange={e => updateDP({ offsetX: Number(e.target.value) / 100 })}
                            className="w-full accent-primary" />
                          <div className="flex justify-between text-[9px] text-muted-foreground"><span>← Izquierda</span><span>Centro</span><span>Derecha →</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Collapsed: roof overhang + window positions ── */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowPositions(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-semibold"
                >
                  <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-primary" />Alero y ventanas</span>
                  {showPositions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {showPositions && (
                  <div className="p-3 space-y-4 bg-background/60">

                    {/* Roof overhang */}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Alero del techo — {ext.roofOverhang.toFixed(1)} ft
                      </label>
                      <input type="range" min={0} max={4} step={0.5} value={ext.roofOverhang}
                        onChange={e => extU("roofOverhang", Number(e.target.value))}
                        className="w-full accent-primary" />
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>Sin alero</span><span>4 ft</span></div>
                    </div>

                    {/* Window positions */}
                    {Array.from({ length: Math.min(ext.windowCount, 4) }).map((_, i) => {
                      const wp = ext.windowPlacements?.[i] ?? DEFAULT_WINDOW_PLACEMENTS[i];
                      const updateWP = (patch: Partial<WindowPlacement>) => {
                        const next = [...(ext.windowPlacements ?? DEFAULT_WINDOW_PLACEMENTS)];
                        next[i] = { ...wp, ...patch };
                        extU("windowPlacements", next);
                      };
                      return (
                        <div key={i} className="space-y-1.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            Ventana {i + 1}
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {(["front","back","left","right"] as WallFace[]).map(face => (
                              <button key={face} onClick={() => updateWP({ wall: face })}
                                className={`py-1 text-[9px] font-medium rounded border transition-colors ${
                                  wp.wall === face ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                                }`}>
                                {face === "front" ? "Frente" : face === "back" ? "Atrás" : face === "left" ? "Izq" : "Der"}
                              </button>
                            ))}
                          </div>
                          <input type="range" min={-85} max={85} step={5} value={Math.round((wp.offsetX ?? 0) * 100)}
                            onChange={e => updateWP({ offsetX: Number(e.target.value) / 100 })}
                            className="w-full accent-primary" />
                          <div className="flex justify-between text-[9px] text-muted-foreground"><span>← Izq</span><span>Centro</span><span>Der →</span></div>
                        </div>
                      );
                    })}

                  </div>
                )}
              </div>

              <button onClick={() => setExterior(DEFAULT_EXTERIOR)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-3 h-3" /> Restablecer
              </button>
            </>
          )}

          {/* ── INTERIOR ── */}
          {mode === "interior" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Dimensiones (pies)</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { k:"widthFt" as const, label:"Ancho" },
                    { k:"depthFt" as const, label:"Largo" },
                    { k:"heightFt" as const, label:"Alto" },
                  ]).map(({ k, label }) => (
                    <div key={k}>
                      <label className="text-[10px] text-muted-foreground">{label}</label>
                      <input type="number" value={int[k]} min={6} max={100}
                        onChange={e => intU(k, Number(e.target.value))}
                        className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Floor product selector */}
              <ProductSelector
                products={FLOOR_PRODUCTS}
                selectedId={int.floorProductId}
                selectedColor={int.floorColor}
                label="Piso — Flooring material"
                onSelect={p => setInterior(prev => ({
                  ...prev,
                  floorProductId: p.id,
                  floorMaterial: p.matType,
                  floorColor: p.suggestedColors?.[0] ?? prev.floorColor,
                }))}
                onColorChange={v => intU("floorColor", v)}
              />

              {/* Wall finish product selector */}
              <ProductSelector
                products={WALL_FINISH_PRODUCTS}
                selectedId={int.wallProductId}
                selectedColor={int.wallColor}
                label="Paredes — Wall finish"
                onSelect={p => setInterior(prev => ({
                  ...prev,
                  wallProductId: p.id,
                  wallMaterial: p.matType,
                  wallColor: p.suggestedColors?.[0] ?? prev.wallColor,
                }))}
                onColorChange={v => intU("wallColor", v)}
              />

              {/* Ceiling color */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Techo — Ceiling color</label>
                  <span className="text-[9px] font-mono text-primary font-semibold">{int.ceilingColor.toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-start max-h-24 overflow-y-auto pt-0.5">
                  {MASTER_COLOR_PALETTE.find(g => g.short === "Interior")!.colors.map(c => (
                    <button key={c.hex} onClick={() => intU("ceilingColor", c.hex)} title={c.label}
                      className="rounded overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0"
                      style={{ borderColor: int.ceilingColor === c.hex ? "#f97316" : "transparent",
                        boxShadow: int.ceilingColor === c.hex ? "0 0 0 1px #f97316" : "none" }}>
                      <MaterialSwatch material="paint" color={c.hex} size={22} />
                    </button>
                  ))}
                  <input type="color" value={int.ceilingColor} onChange={e => intU("ceilingColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-border flex-shrink-0" />
                </div>
              </div>

              <button onClick={() => setInterior(DEFAULT_INTERIOR)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-3 h-3" /> Restablecer
              </button>
            </>
          )}
        </div>

        {/* Footer summary */}
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          {mode === "exterior" ? (() => {
            const sp = SIDING_PRODUCTS.find(p => p.id === ext.wallProductId);
            const rp = ROOFING_PRODUCTS.find(p => p.id === ext.roofProductId);
            return (
              <>
                <p className="text-xs font-medium text-foreground">{ext.widthFt}×{ext.depthFt} ft · {ext.roofType}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Siding: {sp?.brand} {sp?.name} · Techo: {rp?.brand} {rp?.name}
                </p>
              </>
            );
          })() : (() => {
            const fp = FLOOR_PRODUCTS.find(p => p.id === int.floorProductId);
            const wp = WALL_FINISH_PRODUCTS.find(p => p.id === int.wallProductId);
            return (
              <>
                <p className="text-xs font-medium text-foreground">{int.widthFt}×{int.depthFt}×{int.heightFt} ft</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Piso: {fp?.brand} {fp?.name} · Paredes: {wp?.brand} {wp?.name}
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── 3D Canvas ── */}
      <div
        className={`relative transition-colors duration-700 ${mode === "interior" ? "bg-[#1a1a2a]" : ENV_CONFIG[envPreset].bg}`}
        style={{
          display: (!isMobile || mobileTab === "canvas") ? "flex" : "none",
          flexDirection: "column",
          flex: 1,
        }}
      >

        {/* Top-left: photo upload + address search + env toggle */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {/* ── Button row ── */}
          <div className="flex items-center gap-2">
            {mode === "exterior" && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { analyzePhoto(f); e.target.value = ""; } }}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoLoading || addressLoading || multiPhotoLoading}
                  title="1 foto → 3D con IA"
                  className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-white transition-colors disabled:opacity-60"
                >
                  {photoLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    : <Camera className="w-3.5 h-3.5 text-primary" />}
                  {photoLoading ? "Analizando..." : "Foto → 3D"}
                </button>

                {/* ── Multi-photo button ── */}
                <button
                  onClick={() => setMultiPhotoOpen(v => !v)}
                  disabled={photoLoading || addressLoading || multiPhotoLoading}
                  title="Subí hasta 8 fotos desde distintos ángulos — análisis más preciso"
                  className={`flex items-center gap-1.5 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 ${
                    multiPhotoOpen
                      ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700"
                      : "bg-white/90 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {multiPhotoLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Layers className="w-3.5 h-3.5" />}
                  {multiPhotoLoading ? "Analizando..." : `Fotos → 3D${multiPhotos.length > 0 ? ` (${multiPhotos.length})` : ""}`}
                </button>

                <button
                  onClick={() => setAddressOpen(v => !v)}
                  disabled={photoLoading || addressLoading || multiPhotoLoading}
                  title="Street View → 3D con IA"
                  className={`flex items-center gap-1.5 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-60 ${
                    addressOpen
                      ? "bg-primary text-white border-primary hover:bg-primary/90"
                      : "bg-white/90 border-border hover:bg-white"
                  }`}
                >
                  {addressLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <MapPin className="w-3.5 h-3.5" />}
                  {addressLoading ? "Buscando..." : "Dirección → 3D"}
                </button>
              </>
            )}
            {/* Environment preset toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden shadow-sm bg-white/90 backdrop-blur-sm">
              {(["day", "sunset", "night"] as const).map(ep => {
                const Icon = ep === "day" ? Sun : ep === "sunset" ? Sunset : Moon;
                return (
                  <button key={ep} onClick={() => setEnvPreset(ep)}
                    title={ep === "day" ? "Día" : ep === "sunset" ? "Atardecer" : "Noche"}
                    className={`px-2.5 py-1.5 transition-colors ${
                      envPreset === ep ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/40"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Address search panel (drops below button row) ── */}
          {/* ── Multi-photo panel ── */}
          {multiPhotoOpen && mode === "exterior" && (
            <div className="bg-white/97 backdrop-blur-sm border border-emerald-200 rounded-xl shadow-lg p-3 w-96">
              <input
                ref={multiPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach(f => addMultiPhoto(f));
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-800">Análisis multi-ángulo · hasta 8 fotos</span>
                <button onClick={() => setMultiPhotoOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2.5 leading-relaxed">
                Tomá fotos desde distintos ángulos de la propiedad. GPT-4o analiza todas juntas para un modelo 3D más preciso.
              </p>

              {/* Photo grid — 4 cols, each with SVG house diagram */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {ANGLE_CONFIG.map((angle, i) => {
                  const photo = multiPhotos[i];
                  const isNext = multiPhotos.length === i;
                  const isDone = !!photo;
                  const isLocked = !isDone && !isNext;

                  return (
                    <div key={i} className="flex flex-col gap-1">
                      {/* Card */}
                      {isDone ? (
                        <div className="relative rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm" style={{ aspectRatio: "1" }}>
                          <img src={photo.previewUrl} alt={angle.label} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeMultiPhoto(i)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors shadow"
                          >×</button>
                          {/* Done badge */}
                          <div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">✓</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => isNext && multiPhotoInputRef.current?.click()}
                          disabled={isLocked}
                          style={{ aspectRatio: "1" }}
                          className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-1 transition-all ${
                            isNext
                              ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100 cursor-pointer shadow-sm"
                              : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                          }`}
                        >
                          {/* Top-down house silhouette SVG */}
                          <svg viewBox="0 0 64 64" className="w-full flex-1" style={{ maxHeight: 52 }}>
                            {/* Arrow marker */}
                            <defs>
                              <marker id={`arr${i}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                                <path d="M0,0 L4,2 L0,4 Z" fill={isNext ? "#10b981" : "#9ca3af"} />
                              </marker>
                            </defs>
                            {/* House footprint (top-down) */}
                            <rect x="20" y="22" width="24" height="20" rx="1"
                              fill={isNext ? "#d1fae5" : "#f3f4f6"}
                              stroke={isNext ? "#6ee7b7" : "#d1d5db"} strokeWidth="1.5" />
                            {/* Roof ridge line */}
                            <line x1="20" y1="22" x2="32" y2="14" stroke={isNext ? "#6ee7b7" : "#d1d5db"} strokeWidth="1.5" />
                            <line x1="44" y1="22" x2="32" y2="14" stroke={isNext ? "#6ee7b7" : "#d1d5db"} strokeWidth="1.5" />
                            {/* Front door hint */}
                            <rect x="29" y="38" width="6" height="4" rx="0.5"
                              fill={isNext ? "#a7f3d0" : "#e5e7eb"} stroke={isNext ? "#6ee7b7" : "#d1d5db"} strokeWidth="1" />
                            {/* Camera position dot */}
                            <circle cx={angle.cx} cy={angle.cy} r="4"
                              fill={isNext ? "#10b981" : "#9ca3af"} />
                            {/* Camera icon inside dot */}
                            <text x={angle.cx} y={angle.cy + 1.5} textAnchor="middle" fontSize="4.5" fill="white" fontFamily="sans-serif">●</text>
                            {/* Arrow from camera to house */}
                            <line
                              x1={angle.cx} y1={angle.cy}
                              x2={angle.arrowTo.x} y2={angle.arrowTo.y}
                              stroke={isNext ? "#10b981" : "#9ca3af"} strokeWidth="1.5"
                              markerEnd={`url(#arr${i})`} strokeDasharray="3,2"
                            />
                            {/* "+" if it's the next slot */}
                            {isNext && (
                              <text x="32" y="35" textAnchor="middle" fontSize="9" fill="#10b981" fontWeight="bold">+</text>
                            )}
                          </svg>
                        </button>
                      )}
                      {/* Label below */}
                      <p className={`text-center leading-tight font-semibold truncate ${
                        isDone ? "text-emerald-700 text-[9px]" : isNext ? "text-emerald-600 text-[9px]" : "text-gray-400 text-[9px]"
                      }`}>{angle.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {multiPhotos.length > 0 && (
                  <button
                    onClick={() => {
                      multiPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
                      setMultiPhotos([]);
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
                  >Limpiar todo</button>
                )}
                <button
                  onClick={analyzeMultiPhotos}
                  disabled={multiPhotoLoading || multiPhotos.length === 0}
                  className="ml-auto flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {multiPhotoLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando {multiPhotos.length} foto{multiPhotos.length !== 1 ? "s" : ""}...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Analizar {multiPhotos.length > 0 ? `${multiPhotos.length} foto${multiPhotos.length !== 1 ? "s" : ""}` : "fotos"} → 3D</>}
                </button>
              </div>
            </div>
          )}

          {addressOpen && mode === "exterior" && (
            <div className="bg-white/96 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3 w-80">
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold">Buscar propiedad por dirección</span>
                <button onClick={() => setAddressOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                Ingresá ciudad + estado o zip code — la IA genera un modelo 3D típico de esa zona.
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") analyzeAddress(); }}
                  placeholder="Paramus, NJ  ó  07652"
                  className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                  autoFocus
                />
                <button
                  onClick={analyzeAddress}
                  disabled={addressLoading || !addressQuery.trim()}
                  className="flex items-center gap-1 bg-primary text-white rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {addressLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5">
                Gratis · Sin Street View · La IA diseña según el estilo arquitectónico del área
              </p>
            </div>
          )}
        </div>

        {/* Top-right: dimensions + screenshot */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <div className="bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs shadow-sm">
            {mode === "exterior" ? (
              <>
                <p className="font-semibold">{ext.widthFt}ft × {ext.depthFt}ft</p>
                <p className="text-muted-foreground">{(ext.widthFt * ext.depthFt).toLocaleString()} sq ft</p>
              </>
            ) : (
              <>
                <p className="font-semibold">{int.widthFt}ft × {int.depthFt}ft × {int.heightFt}ft</p>
                <p className="text-muted-foreground">{(int.widthFt * int.depthFt).toLocaleString()} sq ft</p>
              </>
            )}
          </div>
          {/* Visualizar con IA — DALL-E 3 render */}
          {mode === "exterior" && addressInfo && (
            <button
              onClick={visualizeMaterials}
              disabled={vizLoading}
              title="Generar imagen fotorrealista con los materiales elegidos"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white backdrop-blur-sm border border-violet-500 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              {vizLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              <span>Visualizar con IA</span>
            </button>
          )}
          {/* Screenshot download */}
          <button
            onClick={() => captureRef.current?.()}
            title="Descargar imagen PNG"
            className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs font-medium shadow-sm hover:bg-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>

        <div className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-[10px] text-muted-foreground shadow-sm space-y-0.5">
          <p>Click + arrastrar → rotar</p>
          <p>Scroll → zoom</p>
          <p>Click derecho → mover</p>
        </div>

        {/* ── Antes/Después: real photo overlay on left half ── */}
        {photoPreviewUrl && (
          <div className="absolute inset-y-0 left-0 z-10 pointer-events-none"
            style={{ width: "42%", minWidth: 220, maxWidth: 480 }}>
            <div className="relative h-full flex flex-col">
              {/* Label bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/75 backdrop-blur-sm pointer-events-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest text-white uppercase">Foto real</span>
                  {addressInfo?.photoSource === "google_street_view" && (
                    <span className="text-[8px] bg-blue-600/80 text-white px-1.5 py-0.5 rounded font-medium">Street View</span>
                  )}
                </div>
                <button
                  onClick={() => { URL.revokeObjectURL(photoPreviewUrl); setPhotoPreviewUrl(null); }}
                  className="text-white/50 hover:text-white text-xs transition-colors pointer-events-auto"
                  title="Cerrar">✕</button>
              </div>
              {/* Photo fills remaining height */}
              <img src={photoPreviewUrl} alt="Foto real de la propiedad"
                className="flex-1 w-full object-cover object-top" />
              {/* Caption */}
              <div className="bg-black/75 backdrop-blur-sm px-3 py-1.5 pointer-events-auto">
                <p className="text-[9px] text-white/70 font-medium truncate">
                  {addressInfo?.formattedAddress ?? "Dirección"}
                </p>
                {photoDetected?.description && (
                  <p className="text-[8px] text-white/50 leading-snug line-clamp-1 mt-0.5">{photoDetected.description}</p>
                )}
              </div>
            </div>
            {/* Right-edge divider + label */}
            <div className="absolute right-0 inset-y-0 w-px bg-white/20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-0 pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm text-white text-[8px] font-bold tracking-widest px-1.5 py-3 rounded-l"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                ANTES · DESPUÉS
              </div>
            </div>
          </div>
        )}

        {(loading || photoLoading) && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {photoLoading ? "GPT-4o analizando la foto..." : "La IA está diseñando el espacio..."}
              </p>
            </div>
          </div>
        )}

        {/* ── DALL-E 3 Visualization Modal ─────────────────────────────────── */}
        {vizModalOpen && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-white">Visualización IA — Render fotorrealista</span>
                {addressInfo && (
                  <span className="text-[10px] text-white/50 font-mono">{addressInfo.formattedAddress.split(",").slice(0,2).join(",")}</span>
                )}
              </div>
              <button
                onClick={() => setVizModalOpen(false)}
                className="text-white/50 hover:text-white transition-colors text-lg leading-none px-2"
              >✕</button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-stretch gap-0 overflow-hidden">
              {/* Left: original photo */}
              {photoPreviewUrl && (
                <div className="flex-1 flex flex-col border-r border-white/10">
                  <div className="bg-black/50 px-3 py-1.5 text-center">
                    <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Foto actual · Street View</span>
                  </div>
                  <img src={photoPreviewUrl} alt="Foto actual"
                    className="flex-1 w-full object-cover object-top" />
                </div>
              )}

              {/* Right: DALL-E 3 generated image */}
              <div className="flex-1 flex flex-col">
                <div className="bg-violet-900/60 px-3 py-1.5 text-center">
                  <span className="text-[10px] font-bold tracking-widest text-violet-300 uppercase">
                    Render IA · {SIDING_PRODUCTS.find(p => p.id === exterior.wallProductId)?.name ?? "Siding"} + {ROOFING_PRODUCTS.find(p => p.id === exterior.roofProductId)?.name ?? "Techo"}
                  </span>
                </div>
                {vizLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black/40">
                    <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-white">Generando render fotorrealista...</p>
                      <p className="text-[11px] text-white/50">GPT-4o analiza la casa · DALL-E 3 aplica los materiales</p>
                      <p className="text-[10px] text-white/30">Esto toma 15–30 segundos</p>
                    </div>
                  </div>
                ) : vizImageUrl ? (
                  <div className="flex-1 relative group">
                    <img src={vizImageUrl} alt="Render IA"
                      className="w-full h-full object-cover object-top" />
                    <a
                      href={vizImageUrl}
                      download="render-kimdasa.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </a>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-black/40">
                    <p className="text-white/40 text-sm">Sin imagen</p>
                  </div>
                )}
              </div>
            </div>

            {/* Material summary bar */}
            <div className="px-5 py-2.5 bg-black/60 border-t border-white/10 flex items-center gap-4 text-[11px] text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-white/20 inline-block flex-shrink-0" style={{ background: exterior.wallColor }} />
                {SIDING_PRODUCTS.find(p => p.id === exterior.wallProductId)?.name ?? "Siding"} · {exterior.wallColor}
              </span>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-white/20 inline-block flex-shrink-0" style={{ background: exterior.roofColor }} />
                {ROOFING_PRODUCTS.find(p => p.id === exterior.roofProductId)?.name ?? "Techo"} · {exterior.roofColor}
              </span>
              {!vizLoading && vizImageUrl && (
                <button
                  onClick={visualizeMaterials}
                  className="ml-auto flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Regenerar
                </button>
              )}
            </div>
          </div>
        )}

        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }} style={{ width: "100%", height: "100%" }}>
          {mode === "exterior"
            ? <ExteriorScene structure={exterior} env={envPreset} captureRef={captureRef} onUpdate={extU} hasGenerated={hasGenerated} />
            : <InteriorScene structure={interior} env={envPreset} captureRef={captureRef} />
          }
        </Canvas>
      </div>
      </div>
    </div>
  );
}
