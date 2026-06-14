// ─── Insurtech Pricing — Frontend tipleri ───────────────────────────────────
// Backend Models/Pricing/PricingModels.cs ile birebir eşleşmeli.
// Camel-case alan adları: ASP.NET Core JSON serializer default'u.

export interface RiskOption {
    value: string;
    label: string;
}

export interface RiskParameter {
    key: string;
    label: string;
    type: "number" | "select" | "text";
    hint?: string;
    placeholder?: string;
    options?: RiskOption[];
    min?: number;
    max?: number;
    isRequired: boolean;
    displayOrder: number;
    fullWidth: boolean;
}

export interface BreakdownItem {
    label: string;
    category: "base" | "coverage" | "risk" | "subtotal" | "tax";
    factor?: number;
    delta?: number;
    hint?: string;
}

export interface PricingResult {
    basePrice: number;
    coverageTotal: number;
    rawSubtotal: number;
    riskMultiplier: number;
    riskAdjustedSubtotal: number;
    tax: number;
    total: number;
    breakdown: BreakdownItem[];
}

export interface TeklifHesaplaIstegi {
    productId: number;
    selectedCoverageIds: number[];
    riskParameters?: Record<string, string>;
}

// ─── Sigortalı Kişi (Insured Person) ────────────────────────────────────────
// Backend Entities/InsuredPerson.cs ile birebir eşleşir.
// Customer'ın "yakın listesi" — eş, anne, baba, çocuk vs. Aynı zamanda
// "Kendisi" yakınlığında olan kayıt = customer'ın kendisi.
export type Yakinlik = "Kendisi" | "Es" | "Anne" | "Baba" | "Cocuk" | "Kardes" | "Diger";

export interface InsuredPerson {
    id: number;
    adSoyad: string;
    tcKimlikNo: string;
    dogumTarihi: string;     // ISO date "YYYY-MM-DD" — DateOnly serialize'ı
    yakinlik: Yakinlik;
    telefon?: string | null;
    customerId: number;
    isActive: boolean;
}

// Yeni yakın oluşturma payload'ı — TeklifOlusturDto.YeniSigortali ile aynı şema.
export interface YeniSigortaliInput {
    adSoyad: string;
    tcKimlikNo: string;
    dogumTarihi: string;     // "YYYY-MM-DD"
    yakinlik: Yakinlik;
    telefon?: string;
}

// UI'da yakınlık etiketlerini Türkçe olarak göstermek için.
// Backend'in vocab'ı (Türkçe karaktersiz: "Es") → ekran metni ("Eş").
export const YAKINLIK_ETIKET: Record<Yakinlik, string> = {
    Kendisi: "Kendim",
    Es: "Eşim",
    Anne: "Annem",
    Baba: "Babam",
    Cocuk: "Çocuğum",
    Kardes: "Kardeşim",
    Diger: "Diğer Yakınım",
};

// İyelik eki versiyonu — risk formunda "[X]'in yaşı" başlığı için.
export const YAKINLIK_IYELIK: Record<Yakinlik, string> = {
    Kendisi: "Sizin",
    Es: "Eşinizin",
    Anne: "Annenizin",
    Baba: "Babanızın",
    Cocuk: "Çocuğunuzun",
    Kardes: "Kardeşinizin",
    Diger: "Yakınınızın",
};
