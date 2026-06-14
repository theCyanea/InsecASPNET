using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public static class RiskSchemas
    {
        public static readonly IReadOnlyDictionary<string, List<RiskParameter>> Sema =
            new Dictionary<string, List<RiskParameter>>(StringComparer.OrdinalIgnoreCase)
            {

                ["KASKO"] = new()
                {
                    new RiskParameter
                    {
                        Key = "aracYili",
                        Label = "Araç Model Yılı",
                        Type = "number",
                        Hint = "Aracınızın model yılını giriniz",
                        Placeholder = "Örn: 2020",
                        Min = 1990,
                        Max = DateTime.Now.Year,
                        DisplayOrder = 1
                    },
                    new RiskParameter
                    {
                        Key = "motorGucuKw",
                        Label = "Motor Gücü (kW)",
                        Type = "number",
                        Hint = "Ruhsatta yazan kW değeri (1 HP ≈ 0.746 kW)",
                        Placeholder = "Örn: 110",
                        Min = 30,
                        Max = 800,
                        DisplayOrder = 2
                    },
                    new RiskParameter
                    {
                        Key = "yakitTipi",
                        Label = "Yakıt Tipi",
                        Type = "select",
                        DisplayOrder = 3,
                        Options = new()
                        {
                            new() { Value = "benzin", Label = "Benzin" },
                            new() { Value = "dizel", Label = "Dizel" },
                            new() { Value = "lpg", Label = "LPG" },
                            new() { Value = "elektrik", Label = "Elektrik" },
                            new() { Value = "hibrit", Label = "Hibrit" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "sehir",
                        Label = "Aracın Bulunduğu Şehir",
                        Type = "select",
                        DisplayOrder = 4,
                        Options = TurkiyeSehirleri()
                    },
                    new RiskParameter
                    {
                        Key = "surucuYasi",
                        Label = "Sürücü Yaşı",
                        Type = "number",
                        Hint = "Aracı düzenli kullanan sürücünün yaşı",
                        Min = 18,
                        Max = 99,
                        DisplayOrder = 5
                    },
                    new RiskParameter
                    {
                        Key = "hasarsizlikBasamagi",
                        Label = "Hasarsızlık Basamağı",
                        Type = "select",
                        Hint = "TRAMER kayıtlarınızdaki bonus-malus basamağı (1-8)",
                        DisplayOrder = 6,
                        Options = new()
                        {
                            new() { Value = "1", Label = "1. Basamak (Yeni / Hasarlı)" },
                            new() { Value = "2", Label = "2. Basamak" },
                            new() { Value = "3", Label = "3. Basamak" },
                            new() { Value = "4", Label = "4. Basamak (Standart)" },
                            new() { Value = "5", Label = "5. Basamak" },
                            new() { Value = "6", Label = "6. Basamak" },
                            new() { Value = "7", Label = "7. Basamak" },
                            new() { Value = "8", Label = "8. Basamak (Maksimum İndirim)" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "garajTipi",
                        Label = "Park Yeri",
                        Type = "select",
                        DisplayOrder = 7,
                        Options = new()
                        {
                            new() { Value = "kapali", Label = "Kapalı Garaj" },
                            new() { Value = "acik", Label = "Açık Otopark" },
                            new() { Value = "sokak", Label = "Sokak / Cadde" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "yillikKm",
                        Label = "Tahmini Yıllık Kilometre",
                        Type = "number",
                        Hint = "Yılda yaklaşık kaç km yapıyorsunuz",
                        Placeholder = "Örn: 15000",
                        Min = 1000,
                        Max = 200000,
                        DisplayOrder = 8
                    },
                    new RiskParameter
                    {
                        Key = "kullanimAmaci",
                        Label = "Kullanım Amacı",
                        Type = "select",
                        DisplayOrder = 9,
                        Options = new()
                        {
                            new() { Value = "sahsi", Label = "Şahsi Kullanım" },
                            new() { Value = "ticari", Label = "Ticari Kullanım" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "hasarAdedi",
                        Label = "Son 3 Yıldaki Hasar Adedi",
                        Type = "number",
                        Hint = "Aracınızın son 3 yılda yaptığı hasar sayısı (0 = hasarsız)",
                        Min = 0,
                        Max = 20,
                        DisplayOrder = 10
                    },
                },


                ["KONUT"] = new()
                {
                    new RiskParameter
                    {
                        Key = "binaYasi",
                        Label = "Bina Yaşı",
                        Type = "number",
                        Hint = "Binanın inşaat tarihinden bu yana geçen yıl",
                        Min = 0,
                        Max = 200,
                        DisplayOrder = 1
                    },
                    new RiskParameter
                    {
                        Key = "metrekare",
                        Label = "Brüt Alan (m²)",
                        Type = "number",
                        Placeholder = "Örn: 120",
                        Min = 20,
                        Max = 1000,
                        DisplayOrder = 2
                    },
                    new RiskParameter
                    {
                        Key = "kat",
                        Label = "Bulunduğu Kat",
                        Type = "select",
                        DisplayOrder = 3,
                        Options = new()
                        {
                            new() { Value = "bodrum", Label = "Bodrum" },
                            new() { Value = "zemin", Label = "Zemin Kat" },
                            new() { Value = "ara", Label = "Ara Kat" },
                            new() { Value = "ust", Label = "Üst Kat" },
                            new() { Value = "cati", Label = "Çatı Katı / Dubleks" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "esyaDegeri",
                        Label = "Beyan Edilen Eşya Değeri (₺)",
                        Type = "number",
                        Hint = "Evdeki tüm içeriğin (mobilya, beyaz eşya, elektronik) toplam tahmini değeri",
                        Placeholder = "Örn: 250000",
                        Min = 0,
                        Max = 100000000,
                        IsRequired = false,
                        DisplayOrder = 4
                    },
                    new RiskParameter
                    {
                        Key = "sehir",
                        Label = "Şehir",
                        Type = "select",
                        DisplayOrder = 5,
                        Options = TurkiyeSehirleri()
                    },
                    new RiskParameter
                    {
                        Key = "binaTipi",
                        Label = "Bina Tipi",
                        Type = "select",
                        DisplayOrder = 6,
                        Options = new()
                        {
                            new() { Value = "apartman", Label = "Apartman Dairesi" },
                            new() { Value = "site", Label = "Güvenlikli Site" },
                            new() { Value = "mustakil", Label = "Müstakil Ev" },
                            new() { Value = "villa", Label = "Villa" },
                        }
                    },
                },


                ["SAGLIK"] = new()
                {
                    new RiskParameter
                    {
                        Key = "yas",
                        Label = "Sigortalanacak Kişinin Yaşı",
                        Type = "number",
                        Min = 0,
                        Max = 120,
                        DisplayOrder = 1
                    },
                    new RiskParameter
                    {
                        Key = "cinsiyet",
                        Label = "Cinsiyet",
                        Type = "select",
                        DisplayOrder = 2,
                        Options = new()
                        {
                            new() { Value = "kadin", Label = "Kadın" },
                            new() { Value = "erkek", Label = "Erkek" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "sigara",
                        Label = "Sigara Kullanımı",
                        Type = "select",
                        DisplayOrder = 3,
                        Options = new()
                        {
                            new() { Value = "hayir", Label = "İçmiyor" },
                            new() { Value = "evet", Label = "İçiyor" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "kronikHastalik",
                        Label = "Kronik Hastalık",
                        Type = "select",
                        Hint = "Tanısı konmuş kronik bir hastalığınız varsa belirtin",
                        DisplayOrder = 4,
                        Options = new()
                        {
                            new() { Value = "yok", Label = "Yok" },
                            new() { Value = "diyabet", Label = "Diyabet" },
                            new() { Value = "hipertansiyon", Label = "Hipertansiyon" },
                            new() { Value = "kalp", Label = "Kalp Hastalığı" },
                            new() { Value = "astim", Label = "Astım" },
                            new() { Value = "diger", Label = "Diğer" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "bmi",
                        Label = "Vücut Kitle İndeksi (BMI)",
                        Type = "number",
                        Hint = "Kilo (kg) ÷ Boy² (m). Örnek: 75 kg, 1.75 m → 24.5. Bilmiyorsanız boş bırakın.",
                        Placeholder = "Örn: 24.5",
                        Min = 10,
                        Max = 60,
                        IsRequired = false,
                        DisplayOrder = 5,
                        FullWidth = true
                    },
                },


                ["SEYAHAT"] = new()
                {
                    new RiskParameter
                    {
                        Key = "bolge",
                        Label = "Hedef Bölge",
                        Type = "select",
                        DisplayOrder = 1,
                        Options = new()
                        {
                            new() { Value = "yurtici", Label = "Yurt İçi" },
                            new() { Value = "schengen", Label = "Schengen / Avrupa" },
                            new() { Value = "amerika", Label = "Amerika (ABD/Kanada)" },
                            new() { Value = "asya", Label = "Asya / Orta Doğu" },
                            new() { Value = "afrika", Label = "Afrika" },
                            new() { Value = "okyanusya", Label = "Okyanusya / Avustralya" },
                        }
                    },
                    new RiskParameter
                    {
                        Key = "gunSayisi",
                        Label = "Seyahat Süresi (gün)",
                        Type = "number",
                        Min = 1,
                        Max = 365,
                        DisplayOrder = 2
                    },
                    new RiskParameter
                    {
                        Key = "yas",
                        Label = "Yolcu Yaşı",
                        Type = "number",
                        Min = 0,
                        Max = 120,
                        DisplayOrder = 3
                    },
                    new RiskParameter
                    {
                        Key = "maceraSporu",
                        Label = "Macera Sporu Yapacak mısınız?",
                        Type = "select",
                        Hint = "Kayak, dalış, paragliding, dağcılık vb.",
                        DisplayOrder = 4,
                        Options = new()
                        {
                            new() { Value = "hayir", Label = "Hayır" },
                            new() { Value = "evet", Label = "Evet" },
                        }
                    },
                },

                // ─── DASK / TRAFIK — sabit tarife, risk faktörü yok ──────────
                // Boş liste döner; frontend "Risk Bilgileri" adımını atlar.
                ["DASK"] = new(),
                ["TRAFIK"] = new(),
            };

        private static List<RiskOption> TurkiyeSehirleri() => new()
        {
            new() { Value = "İstanbul", Label = "İstanbul" },
            new() { Value = "Ankara", Label = "Ankara" },
            new() { Value = "İzmir", Label = "İzmir" },
            new() { Value = "Bursa", Label = "Bursa" },
            new() { Value = "Antalya", Label = "Antalya" },
            new() { Value = "Adana", Label = "Adana" },
            new() { Value = "Konya", Label = "Konya" },
            new() { Value = "Gaziantep", Label = "Gaziantep" },
            new() { Value = "Şanlıurfa", Label = "Şanlıurfa" },
            new() { Value = "Kocaeli", Label = "Kocaeli" },
            new() { Value = "Mersin", Label = "Mersin" },
            new() { Value = "Diyarbakır", Label = "Diyarbakır" },
            new() { Value = "Hatay", Label = "Hatay" },
            new() { Value = "Manisa", Label = "Manisa" },
            new() { Value = "Kayseri", Label = "Kayseri" },
            new() { Value = "Samsun", Label = "Samsun" },
            new() { Value = "Balıkesir", Label = "Balıkesir" },
            new() { Value = "Kahramanmaraş", Label = "Kahramanmaraş" },
            new() { Value = "Van", Label = "Van" },
            new() { Value = "Aydın", Label = "Aydın" },
            new() { Value = "Tekirdağ", Label = "Tekirdağ" },
            new() { Value = "Sakarya", Label = "Sakarya" },
            new() { Value = "Denizli", Label = "Denizli" },
            new() { Value = "Muğla", Label = "Muğla" },
            new() { Value = "Eskişehir", Label = "Eskişehir" },
            new() { Value = "Trabzon", Label = "Trabzon" },
            new() { Value = "Erzurum", Label = "Erzurum" },
            new() { Value = "Ordu", Label = "Ordu" },
            new() { Value = "Malatya", Label = "Malatya" },
            new() { Value = "Afyonkarahisar", Label = "Afyonkarahisar" },
            new() { Value = "Diğer", Label = "Diğer" },
        };
    }
}
