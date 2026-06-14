"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:5156/api";

export interface Musteri {
    id: number;
    adi: string;
    soyadi: string;
    email: string;
    kimlikNo: string;
    telefonNo: string;
    dogumTarihi: string;
    rol: string;
    isActive: boolean;
    avatarUrl?: string | null;
}

export interface Police {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    price: number;
    status: string;
    isActive: boolean;
    productId: number;
    product?: {
        productName: string;
        productDescription: string;
        price: number;
    };

    insuredPerson?: {
        id: number;
        adSoyad: string;
        yakinlik: string;
    } | null;
}

interface UseMusteriReturn {
    musteri: Musteri | null;
    policeler: Police[];
    yukleniyor: boolean;
    hata: string;
}

export function useMusteri(): UseMusteriReturn {
    const [musteri, setMusteri] = useState<Musteri | null>(null);
    const [policeler, setPoliceler] = useState<Police[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    useEffect(() => {
        const veriCek = async () => {
            try {
                const girisRes = await fetch(`${API}/Customers/ben`, {
                    credentials: "include",
                });

                if (!girisRes.ok) {
                    window.location.href = "/";
                    return;
                }

                const musteriData: Musteri = await girisRes.json();
                setMusteri(musteriData);

                const policeRes = await fetch(
                    `${API}/Policies/musterinin-policelerini-getir/${musteriData.id}`,
                    { credentials: "include" }
                );

                if (policeRes.ok) {
                    const policeData = await policeRes.json();
                    setPoliceler(Array.isArray(policeData) ? policeData : policeData.Policeler ?? []);
                }

            } catch {
                setHata("Veriler yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };

        veriCek();
    }, []);

    return { musteri, policeler, yukleniyor, hata };
}