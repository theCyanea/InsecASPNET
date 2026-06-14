using InsecASPNET.Entities;
using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public class KonutPricingStrategy : IPricingStrategy
    {
        public string ProductCode => "KONUT";

        public PricingResult Hesapla(
            Product urun,
            IList<Coverage> secilenTeminatlar,
            IDictionary<string, string> riskParametreleri)
        {
            var sonuc = new PricingResult
            {
                BasePrice = urun.Price,
                CoverageTotal = secilenTeminatlar.Sum(t => t.CoveragePrice),
            };

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = $"{urun.ProductName} - Taban Prim",
                Category = "base",
                Delta = urun.Price,
                Hint = "Konut ürünü tarife başlangıç primi"
            });

            foreach (var teminat in secilenTeminatlar)
            {
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = teminat.CoverageName,
                    Category = "coverage",
                    Delta = teminat.CoveragePrice,
                    Hint = teminat.IsRequired ? "Zorunlu teminat" : "Opsiyonel teminat"
                });
            }

            sonuc.RawSubtotal = sonuc.BasePrice + sonuc.CoverageTotal;
            decimal carpan = 1.0m;

            // Eşya değerine göre EK PRİM (delta — çarpan değil)
            // Çünkü içerik değeri direkt para tutarı, çarpanla ifade etmek mantıksız.
            decimal esyaEkPrim = 0m;
            if (TryGetDecimal(riskParametreleri, "esyaDegeri", out decimal esyaTL))
            {
                // Eşya değerinin %0.3'ü kadar ek prim (binde 3 — yaklaşık piyasa)
                esyaEkPrim = Math.Round(esyaTL * 0.003m, 2);
                if (esyaEkPrim > 0)
                {
                    sonuc.RawSubtotal += esyaEkPrim;
                    sonuc.Breakdown.Add(new BreakdownItem
                    {
                        Label = $"Eşya Değeri Sigortası: {esyaTL:N0} ₺",
                        Category = "coverage",
                        Delta = esyaEkPrim,
                        Hint = "Beyan edilen içerik değerinin ‰3'ü"
                    });
                }
            }

            // 1) Bina yaşı
            if (TryGetInt(riskParametreleri, "binaYasi", out int binaYasi))
            {
                decimal c = binaYasi switch
                {
                    <= 5 => 0.92m,
                    <= 15 => 1.00m,
                    <= 30 => 1.10m,
                    <= 50 => 1.25m,
                    _ => 1.40m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Bina Yaşı: {binaYasi} yıl",
                    Category = "risk",
                    Factor = c,
                    Hint = binaYasi > 30 ? "Eski bina — elektrik/tesisat riski" : "Standart bina yaşı"
                });
            }

            // 2) Metrekare
            if (TryGetInt(riskParametreleri, "metrekare", out int m2))
            {
                decimal c = m2 switch
                {
                    <= 80 => 0.90m,
                    <= 120 => 1.00m,
                    <= 180 => 1.15m,
                    <= 250 => 1.30m,
                    _ => 1.50m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Brüt Alan: {m2} m²",
                    Category = "risk",
                    Factor = c,
                    Hint = "Konut büyüklüğü riski"
                });
            }

            // 3) Kat
            if (riskParametreleri.TryGetValue("kat", out string? kat) && !string.IsNullOrWhiteSpace(kat))
            {
                decimal c = kat.ToLowerInvariant() switch
                {
                    "zemin" or "bodrum" => 1.15m,    // Hırsızlık + su baskını
                    "ust" or "üst" or "cati" or "çatı" => 1.10m,  // Su sızıntısı
                    _ => 1.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Kat: {kat}",
                    Category = "risk",
                    Factor = c,
                    Hint = c > 1m ? "Risk artıran kat konumu" : "Standart kat"
                });
            }

            // 4) Şehir
            if (riskParametreleri.TryGetValue("sehir", out string? sehir) && !string.IsNullOrWhiteSpace(sehir))
            {
                decimal c = sehir.Trim().ToLowerInvariant() switch
                {
                    "istanbul" or "i̇stanbul" => 1.20m,
                    "ankara" or "izmir" or "i̇zmir" => 1.10m,
                    "bursa" or "antalya" or "adana" or "kocaeli" => 1.05m,
                    _ => 0.95m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Şehir: {sehir}",
                    Category = "risk",
                    Factor = c
                });
            }

            // 5) Bina tipi
            if (riskParametreleri.TryGetValue("binaTipi", out string? bina) && !string.IsNullOrWhiteSpace(bina))
            {
                decimal c = bina.ToLowerInvariant() switch
                {
                    "mustakil" or "müstakil" or "villa" => 1.15m,  // Bağımsız ev = hırsızlık riski
                    "apartman" => 1.00m,
                    "site" => 0.92m,                                // Güvenlikli site indirim
                    _ => 1.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Bina Tipi: {bina}",
                    Category = "risk",
                    Factor = c,
                    Hint = bina.ToLowerInvariant() == "site" ? "Güvenlikli site indirimi" : null
                });
            }

            sonuc.RiskMultiplier = Math.Round(carpan, 4);
            sonuc.RiskAdjustedSubtotal = Math.Round(sonuc.RawSubtotal * carpan, 2);

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "Ara Toplam (Risk düzeltmesi sonrası)",
                Category = "subtotal",
                Delta = sonuc.RiskAdjustedSubtotal,
                Factor = sonuc.RiskMultiplier
            });

            sonuc.Tax = Math.Round(sonuc.RiskAdjustedSubtotal * DefaultPricingStrategy.BSMV_ORANI, 2);
            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "BSMV (%5)",
                Category = "tax",
                Delta = sonuc.Tax
            });

            sonuc.Total = Math.Round(sonuc.RiskAdjustedSubtotal + sonuc.Tax, 2);
            return sonuc;
        }

        private static bool TryGetInt(IDictionary<string, string> d, string key, out int v)
        {
            v = 0;
            return d.TryGetValue(key, out string? s) && !string.IsNullOrWhiteSpace(s) && int.TryParse(s, out v);
        }

        private static bool TryGetDecimal(IDictionary<string, string> d, string key, out decimal v)
        {
            v = 0m;
            return d.TryGetValue(key, out string? s) && !string.IsNullOrWhiteSpace(s)
                && decimal.TryParse(s, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out v);
        }
    }
}
