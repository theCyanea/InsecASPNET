"use client";

// ─── FotografYukleyici — Drag-drop dosya yükleme komponenti ──────────────────
// Hasar bildirim formunda kullanılır. Kullanıcı resim sürükler/seçer,
// component arka planda /api/Claims/upload-photo endpoint'ine atıp
// dönen URL'leri parent'a veriyor.
//
// Özellikler:
//   - Drag-drop alanı (visual feedback ile)
//   - Tıkla-seç (file input fallback)
//   - Preview thumbnail'lar (yüklenen fotoğraflar grid'de görünür)
//   - Per-file upload progress (her dosya bağımsız yükleniyor)
//   - Per-file hata mesajı (boyut, tip, sunucu hatası)
//   - Kaldır butonu (yüklenen URL'i listeden çıkarır)
//   - Limit (max 10 fotoğraf, max 5MB her biri)
//
// Frontend validation backend ile aynı kuralları uyguluyor ki kullanıcı
// upload başlamadan hemen feedback alsın (UX). Ama backend her halükarda
// kendi başına da kontrol ediyor (defense in depth).

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconCamera,
    IconUpload,
    IconX,
    IconAlertCircle,
    IconCheck,
    IconLoader2,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";
// Backend dosyaları /uploads/claims/abc.png olarak döner;
// img tag'ında kullanırken host eklemek gerekiyor (frontend farklı port).
const STATIC_BASE = "http://localhost:5156";

const MAX_BYTES = 5 * 1024 * 1024;          // 5 MB
const MAX_FOTO = 10;
const IZINLI_TIPLER = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface YuklenenFoto {
    // Lokal id (uuid) — array'de hızlı identity için
    localId: string;
    // Orijinal dosya adı (kullanıcıya göstermek için)
    isim: string;
    // Local preview URL (FileReader ile data:image/...)
    onizleme: string;
    // Backend'in döndürdüğü kalıcı URL (/uploads/claims/abc.png)
    sunucuUrl?: string;
    // Yükleniyor mu?
    yukleniyor: boolean;
    // Hata mesajı (varsa)
    hata?: string;
}

interface Props {
    // Yüklenmiş fotoğrafların sunucu URL'leri (parent'ın state'i)
    urlListesi: string[];
    // Listeyi güncellemek için callback
    setUrlListesi: (urls: string[]) => void;
    // Form gönderiliyor mu? (tüm input'lar disable)
    disabled?: boolean;
}

export function FotografYukleyici({ urlListesi, setUrlListesi, disabled }: Props) {
    const [fotograflar, setFotograflar] = useState<YuklenenFoto[]>([]);
    const [drag, setDrag] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // ─── Drag & Drop handler'ları ───────────────────────────────────────────
    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setDrag(true);
    };
    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDrag(false);
    };
    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        dosyalariEkle(files);
    };

    // File input change
    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        dosyalariEkle(files);
        // Aynı dosyayı tekrar seçmeye izin ver — input'u sıfırla
        e.target.value = "";
    };

    // ─── Dosyaları işle ─────────────────────────────────────────────────────
    const dosyalariEkle = (files: File[]) => {
        // Limit kontrolü
        const kalan = MAX_FOTO - urlListesi.length - fotograflar.filter((f) => !f.hata).length;
        if (kalan <= 0) return;

        const eklenecek = files.slice(0, kalan);

        eklenecek.forEach((file) => {
            // Frontend validation — backend ile aynı kurallar
            const localId = crypto.randomUUID();

            // Tip kontrolü
            if (!IZINLI_TIPLER.includes(file.type.toLowerCase())) {
                setFotograflar((prev) => [
                    ...prev,
                    {
                        localId,
                        isim: file.name,
                        onizleme: "",
                        yukleniyor: false,
                        hata: "Sadece JPG, PNG veya WebP yükleyebilirsiniz.",
                    },
                ]);
                return;
            }

            // Boyut kontrolü
            if (file.size > MAX_BYTES) {
                setFotograflar((prev) => [
                    ...prev,
                    {
                        localId,
                        isim: file.name,
                        onizleme: "",
                        yukleniyor: false,
                        hata: "Dosya 5 MB'tan büyük olamaz.",
                    },
                ]);
                return;
            }

            // Local önizleme oluştur (FileReader ile data: URL)
            const reader = new FileReader();
            reader.onload = (ev) => {
                const onizleme = ev.target?.result as string;
                // Önce listeye ekle (yükleniyor durumunda)
                setFotograflar((prev) => [
                    ...prev,
                    { localId, isim: file.name, onizleme, yukleniyor: true },
                ]);
                // Backend'e gönder
                yukle(file, localId);
            };
            reader.readAsDataURL(file);
        });
    };

    // ─── Sunucuya yükle ─────────────────────────────────────────────────────
    const yukle = useCallback(async (file: File, localId: string) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const r = await fetch(`${API}/Claims/upload-photo`, {
                method: "POST",
                credentials: "include",
                body: formData,
                // Content-Type header'ı VERMEMELİ — browser otomatik boundary ekliyor
            });

            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setFotograflar((prev) =>
                    prev.map((f) =>
                        f.localId === localId
                            ? { ...f, yukleniyor: false, hata: txt || "Yükleme başarısız." }
                            : f
                    )
                );
                return;
            }

            const data = await r.json();
            const url = data.url as string;

            // Başarılı — fotograflar state'inde işaretle
            setFotograflar((prev) =>
                prev.map((f) =>
                    f.localId === localId
                        ? { ...f, yukleniyor: false, sunucuUrl: url }
                        : f
                )
            );

            // Parent'ın URL listesine ekle
            setUrlListesi([...urlListesi, url]);
        } catch {
            setFotograflar((prev) =>
                prev.map((f) =>
                    f.localId === localId
                        ? { ...f, yukleniyor: false, hata: "Bağlantı hatası." }
                        : f
                )
            );
        }
        // urlListesi dependency'si state-driven; intentional olarak listesi referansına bağlı
    }, [urlListesi, setUrlListesi]);

    // ─── Fotoğraf sil ───────────────────────────────────────────────────────
    const sil = (localId: string) => {
        const foto = fotograflar.find((f) => f.localId === localId);
        if (foto?.sunucuUrl) {
            setUrlListesi(urlListesi.filter((u) => u !== foto.sunucuUrl));
        }
        setFotograflar((prev) => prev.filter((f) => f.localId !== localId));
    };

    // Toplam başarılı yüklenmiş sayısı
    const basariliSayi = fotograflar.filter((f) => f.sunucuUrl).length;
    const limiteUlasildi = basariliSayi >= MAX_FOTO;

    return (
        <div>
            {/* ── Drop zone ──────────────────────────────────────────────────── */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !disabled && !limiteUlasildi && inputRef.current?.click()}
                className="rounded-xl px-5 py-8 text-center cursor-pointer transition-all"
                style={{
                    background: drag
                        ? "rgba(226,232,240,0.06)"
                        : "rgba(255,255,255,0.02)",
                    border: drag
                        ? "2px dashed rgba(226,232,240,0.4)"
                        : "2px dashed rgba(255,255,255,0.1)",
                    cursor: disabled || limiteUlasildi ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={onInputChange}
                    disabled={disabled || limiteUlasildi}
                    className="hidden"
                />
                <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
                    style={{
                        background: drag
                            ? "linear-gradient(135deg, rgba(226,232,240,0.12), rgba(148,163,184,0.04))"
                            : "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <IconUpload className="w-5 h-5" style={{ color: "#cbd5e1" }} />
                </div>
                <p className="text-white/85 text-[13px] font-semibold mb-1">
                    {limiteUlasildi
                        ? "Maksimum fotoğraf sayısına ulaşıldı"
                        : drag
                            ? "Dosyayı buraya bırakın"
                            : "Fotoğrafları sürükleyin veya tıklayın"}
                </p>
                <p className="text-white/40 text-[11px]">
                    JPG, PNG veya WebP · Maks 5 MB · {basariliSayi}/{MAX_FOTO}
                </p>
            </div>

            {/* ── Preview thumbnail grid ─────────────────────────────────────── */}
            {fotograflar.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <AnimatePresence mode="popLayout">
                        {fotograflar.map((foto) => (
                            <motion.div
                                key={foto.localId}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative aspect-square rounded-xl overflow-hidden group"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: foto.hata
                                        ? "1px solid rgba(239,68,68,0.3)"
                                        : "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                {foto.onizleme && !foto.hata && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={foto.sunucuUrl ? `${STATIC_BASE}${foto.sunucuUrl}` : foto.onizleme}
                                        alt={foto.isim}
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Hata durumu — preview yok */}
                                {foto.hata && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                        <IconAlertCircle className="w-5 h-5 text-red-300 mb-1.5" />
                                        <p className="text-red-300 text-[10px] leading-snug">{foto.hata}</p>
                                        <p className="text-white/40 text-[9px] mt-1 truncate w-full">
                                            {foto.isim}
                                        </p>
                                    </div>
                                )}

                                {/* Yükleniyor overlay */}
                                {foto.yukleniyor && (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center"
                                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
                                    >
                                        <IconLoader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}

                                {/* Başarılı badge */}
                                {foto.sunucuUrl && !foto.yukleniyor && (
                                    <div
                                        className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{
                                            background: "rgba(16,185,129,0.85)",
                                            backdropFilter: "blur(4px)",
                                        }}
                                    >
                                        <IconCheck className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                )}

                                {/* Sil butonu */}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            sil(foto.localId);
                                        }}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        style={{
                                            background: "rgba(0,0,0,0.6)",
                                            backdropFilter: "blur(4px)",
                                        }}
                                        title="Kaldır"
                                    >
                                        <IconX className="w-3.5 h-3.5 text-white" />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <p className="text-white/30 text-[11px] mt-2 flex items-center gap-1.5">
                <IconCamera className="w-3 h-3" />
                Hasarın net görüldüğü, farklı açılardan fotoğraflar yükleyin.
            </p>
        </div>
    );
}
