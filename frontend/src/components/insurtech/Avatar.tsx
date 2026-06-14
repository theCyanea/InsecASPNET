"use client";

// ─── Avatar — Profil resmi / baş harfli fallback ─────────────────────────────
// Backend'den gelen avatarUrl varsa onu render eder; yoksa kullanıcının
// adının baş harfleriyle ("AY") deterministic bir gradient placeholder
// üretir. Renk seçimi kullanıcı adının hash'inden çıkıyor — aynı kullanıcı
// her zaman aynı renge sahip oluyor (Slack, Discord gibi).
//
// Reusable: sidebar, profil sayfası, başka müşteri kartlarında kullanılabilir.

interface Props {
    adi?: string;
    soyadi?: string;
    avatarUrl?: string | null;
    boyut?: number;             // px — default 40
    className?: string;
}

const STATIC_BASE = "http://localhost:5156";

// Deterministic color from name — aynı isim → aynı renk
const PALETLER: { from: string; to: string }[] = [
    { from: "#0ea5e9", to: "#6366f1" },   // sky → indigo
    { from: "#10b981", to: "#0ea5e9" },   // emerald → sky
    { from: "#f59e0b", to: "#ef4444" },   // amber → red
    { from: "#8b5cf6", to: "#ec4899" },   // violet → pink
    { from: "#06b6d4", to: "#3b82f6" },   // cyan → blue
    { from: "#84cc16", to: "#10b981" },   // lime → emerald
    { from: "#f43f5e", to: "#8b5cf6" },   // rose → violet
    { from: "#3b82f6", to: "#0ea5e9" },   // blue → sky
];

function paletSec(ad: string): { from: string; to: string } {
    let hash = 0;
    for (let i = 0; i < ad.length; i++) {
        hash = (hash * 31 + ad.charCodeAt(i)) & 0xfffffff;
    }
    return PALETLER[hash % PALETLER.length];
}

function basHarfler(adi?: string, soyadi?: string): string {
    const a = (adi || "").trim();
    const s = (soyadi || "").trim();
    const ilkA = a ? a[0].toUpperCase() : "";
    const ilkS = s ? s[0].toUpperCase() : "";
    return (ilkA + ilkS) || "?";
}

export function Avatar({ adi, soyadi, avatarUrl, boyut = 40, className }: Props) {
    const tamUrl = avatarUrl
        ? (avatarUrl.startsWith("http") ? avatarUrl : `${STATIC_BASE}${avatarUrl}`)
        : null;

    const initials = basHarfler(adi, soyadi);
    const palet = paletSec((adi || "") + (soyadi || ""));
    const fontSize = Math.max(11, Math.round(boyut * 0.4));

    return (
        <div
            className={`relative rounded-full overflow-hidden flex-shrink-0 ${className ?? ""}`}
            style={{
                width: boyut,
                height: boyut,
                background: tamUrl
                    ? "rgba(255,255,255,0.04)"
                    : `linear-gradient(135deg, ${palet.from}, ${palet.to})`,
                border: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            {tamUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={tamUrl}
                    alt={`${adi ?? ""} ${soyadi ?? ""}`}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div
                    className="w-full h-full flex items-center justify-center font-bold text-white tracking-tight"
                    style={{ fontSize, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                >
                    {initials}
                </div>
            )}
        </div>
    );
}
