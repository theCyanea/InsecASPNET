using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using Customer = InsecASPNET.Entities.Customer;
using Coverage = InsecASPNET.Entities.Coverage;
using InsuredPerson = InsecASPNET.Entities.InsuredPerson;
using Policy = InsecASPNET.Entities.Policy;
using Payment = InsecASPNET.Entities.Payment;

namespace InsecASPNET.Services.Pdf
{

    public class PolicePdfService : IPolicePdfService
    {
        private static readonly string PrimaryDark = "#0f172a";   // slate-900
        private static readonly string SecondaryGray = "#64748b"; // slate-500
        private static readonly string LightBg = "#f8fafc";       // slate-50
        private static readonly string BorderColor = "#e2e8f0";   // slate-200

        public byte[] PoliceUret(Policy police)
        {
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(PrimaryDark));

                    page.Header().Element(e => HeaderCiz(e, police));
                    page.Content().Element(e => IcerikCiz(e, police));
                    page.Footer().Element(FooterCiz);
                });
            }).GeneratePdf();
        }

        public byte[] MakbuzUret(InsecASPNET.Entities.Payment odeme, Policy police)
        {
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(PrimaryDark));

                    page.Header().Element(e => MakbuzHeaderCiz(e, odeme));
                    page.Content().Element(e => MakbuzIcerikCiz(e, odeme, police));
                    page.Footer().Element(FooterCiz);
                });
            }).GeneratePdf();
        }

        private void HeaderCiz(IContainer container, Policy police)
        {
            container.Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("inSEC")
                            .FontSize(20).Bold().FontColor(PrimaryDark);
                        c.Item().Text("Sigorta Yönetim Sistemi")
                            .FontSize(8).FontColor(SecondaryGray);
                    });

                    row.RelativeItem().AlignRight().Column(c =>
                    {
                        c.Item().AlignRight().Text("SİGORTA POLİÇESİ")
                            .FontSize(11).Bold().LetterSpacing(0.1f);
                        c.Item().AlignRight().Text(police.PolicyNumber)
                            .FontSize(13).Bold().FontColor(SecondaryGray);
                        c.Item().AlignRight().Text($"Düzenleme: {DateTime.Now:dd MMMM yyyy}")
                            .FontSize(8).FontColor(SecondaryGray);
                    });
                });

                col.Item().PaddingTop(15).LineHorizontal(2).LineColor(PrimaryDark);
            });
        }

        private void IcerikCiz(IContainer container, Policy police)
        {
            container.PaddingVertical(15).Column(col =>
            {
                col.Spacing(15);

                col.Item().Row(row =>
                {
                    var (durumRenk, durumYazi) = police.Status switch
                    {
                        "Aktif Poliçe"    => ("#10b981", "AKTİF"),
                        "Teklif Bekliyor" => ("#f59e0b", "TEKLİF"),
                        _                  => ("#64748b", police.Status.ToUpper())
                    };
                    row.AutoItem()
                        .Background(durumRenk).PaddingHorizontal(10).PaddingVertical(4)
                        .Text(durumYazi).FontColor(Colors.White).FontSize(9).Bold();
                });

                col.Item().Element(e => BolumBaslik(e, "1. SİGORTA ETTİREN"));
                col.Item().Element(e => SigortaEttirenTablo(e, police.Customer));

                col.Item().Element(e => BolumBaslik(e, "2. SİGORTALI"));
                if (police.InsuredPerson != null)
                {
                    col.Item().Element(e => SigortaliKisiTablo(e, police.InsuredPerson));
                }
                else
                {
                    col.Item().Background(LightBg).Padding(10)
                        .Text("Sigortalı, sigorta ettiren ile aynıdır.")
                        .FontSize(9).FontColor(SecondaryGray).Italic();
                }

                col.Item().Element(e => BolumBaslik(e, "3. POLİÇE BİLGİLERİ"));
                col.Item().Element(e => PoliceBilgiTablo(e, police));

                if (police.PolicyCoverages != null && police.PolicyCoverages.Any(pc => pc.Coverage != null))
                {
                    col.Item().Element(e => BolumBaslik(e, "4. POLİÇE KAPSAMINDAKİ TEMİNATLAR"));
                    col.Item().Element(e => TeminatTablo(e, police));
                }

                if (!string.IsNullOrEmpty(police.RiskDataJson))
                {
                    col.Item().Element(e => BolumBaslik(e, "5. AKTÜERYAL DEĞERLENDİRME VERİLERİ"));
                    col.Item().Element(e => RiskVerileriTablo(e, police.RiskDataJson));
                }

                col.Item().Element(e => BolumBaslik(e, "6. PRİM BİLGİSİ"));
                col.Item().Element(e => TutarKutu(e, police));

                col.Item().PaddingTop(10).Background(LightBg).Padding(10).Column(c =>
                {
                    c.Item().Text("Yasal Bilgilendirme")
                        .FontSize(8).Bold().FontColor(SecondaryGray);
                    c.Item().PaddingTop(3).Text(
                        "Bu belge, 5684 sayılı Sigortacılık Kanunu çerçevesinde düzenlenmiş resmî sigorta " +
                        "poliçesidir. Poliçe sahibi, hasar durumunda 1 yıllık zamanaşımı süresi içinde " +
                        "talepte bulunmalıdır. KVKK kapsamında verileriniz şifreli olarak saklanır ve " +
                        "üçüncü taraflarla paylaşılmaz. Detaylı bilgi için: destek@insec.com")
                        .FontSize(8).FontColor(SecondaryGray);
                });
            });
        }

        private void BolumBaslik(IContainer container, string baslik)
        {
            container.Column(col =>
            {
                col.Item().Text(baslik).FontSize(10).Bold().FontColor(PrimaryDark);
                col.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(BorderColor);
            });
        }

        private void SigortaEttirenTablo(IContainer container, Customer? customer)
        {
            if (customer == null)
            {
                container.Text("—").FontSize(9).FontColor(SecondaryGray);
                return;
            }

            container.Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1);
                    c.RelativeColumn(2);
                });

                AnahtarDeger(table, "Ad Soyad", $"{customer.Adi} {customer.Soyadi}");
                AnahtarDeger(table, "TC Kimlik No",
                    customer.KimlikNo.Length == 11
                        ? $"{customer.KimlikNo[..3]}******{customer.KimlikNo[^2..]}"
                        : customer.KimlikNo);
                AnahtarDeger(table, "Doğum Tarihi", customer.DogumTarihi.ToString("dd.MM.yyyy"));
                AnahtarDeger(table, "E-posta", customer.Email);
                AnahtarDeger(table, "Telefon", customer.TelefonNo);
            });
        }

        private void SigortaliKisiTablo(IContainer container, InsuredPerson kisi)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1);
                    c.RelativeColumn(2);
                });

                AnahtarDeger(table, "Ad Soyad", kisi.AdSoyad);
                AnahtarDeger(table, "TC Kimlik No",
                    kisi.TcKimlikNo.Length == 11
                        ? $"{kisi.TcKimlikNo[..3]}******{kisi.TcKimlikNo[^2..]}"
                        : kisi.TcKimlikNo);
                AnahtarDeger(table, "Doğum Tarihi", kisi.DogumTarihi.ToString("dd.MM.yyyy"));
                AnahtarDeger(table, "Yakınlık Derecesi", YakinlikEtiket(kisi.Yakinlik));
                if (!string.IsNullOrEmpty(kisi.Telefon))
                    AnahtarDeger(table, "Telefon", kisi.Telefon);
            });
        }

        private void PoliceBilgiTablo(IContainer container, Policy police)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1);
                    c.RelativeColumn(2);
                });

                AnahtarDeger(table, "Sigorta Ürünü", police.Product?.ProductName ?? "—");
                AnahtarDeger(table, "Poliçe Numarası", police.PolicyNumber);
                AnahtarDeger(table, "Başlangıç Tarihi",
                    police.StartDate.ToLocalTime().ToString("dd MMMM yyyy", new CultureInfo("tr-TR")));
                AnahtarDeger(table, "Bitiş Tarihi",
                    police.EndDate.ToLocalTime().ToString("dd MMMM yyyy", new CultureInfo("tr-TR")));
                AnahtarDeger(table, "Süre",
                    $"{(police.EndDate - police.StartDate).Days} gün");
                AnahtarDeger(table, "Durum", police.Status);
            });
        }

        private void TeminatTablo(IContainer container, Policy police)
        {
            var teminatlar = police.PolicyCoverages?
                .Where(pc => pc.Coverage != null)
                .Select(pc => pc.Coverage!)
                .ToList() ?? new List<Coverage>();

            container.Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(4);   // teminat adı
                    c.RelativeColumn(1);   // tip
                    c.RelativeColumn(2);   // fiyat
                });

                table.Header(h =>
                {
                    h.Cell().Background(LightBg).Padding(6)
                        .Text("Teminat").FontSize(9).Bold();
                    h.Cell().Background(LightBg).Padding(6)
                        .Text("Tip").FontSize(9).Bold();
                    h.Cell().Background(LightBg).Padding(6).AlignRight()
                        .Text("Tutar").FontSize(9).Bold();
                });

                foreach (var t in teminatlar)
                {
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).Padding(6)
                        .Text(t.CoverageName).FontSize(9);
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).Padding(6)
                        .Text(t.IsRequired ? "Zorunlu" : "Opsiyonel")
                        .FontSize(8).FontColor(SecondaryGray);
                    table.Cell().BorderBottom(0.5f).BorderColor(BorderColor).Padding(6).AlignRight()
                        .Text($"{t.CoveragePrice.ToString("N2", new CultureInfo("tr-TR"))} ₺").FontSize(9);
                }
            });
        }

        private void RiskVerileriTablo(IContainer container, string riskJson)
        {
            try
            {
                var sozluk = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(riskJson);
                if (sozluk == null || sozluk.Count == 0) return;

                container.Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1);
                        c.RelativeColumn(2);
                    });

                    foreach (var (k, v) in sozluk)
                    {
                        AnahtarDeger(table, RiskAnahtarOkunabilir(k), v);
                    }
                });
            }
            catch
            {
                container.Text("Risk verileri okunamadı.").FontSize(8).FontColor(SecondaryGray);
            }
        }

        private void TutarKutu(IContainer container, Policy police)
        {
            var trCulture = new CultureInfo("tr-TR");
            container.Background(LightBg).Padding(15).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Toplam Prim (BSMV Dahil)")
                        .FontSize(9).FontColor(SecondaryGray);
                    c.Item().PaddingTop(2)
                        .Text($"{police.Price.ToString("N2", trCulture)} ₺")
                        .FontSize(20).Bold().FontColor(PrimaryDark);
                    c.Item().PaddingTop(3)
                        .Text("Türkiye'de sigortacılıkta uygulanan %5 BSMV (Banka ve Sigorta " +
                              "Muameleleri Vergisi) bu tutara dahildir.")
                        .FontSize(7).FontColor(SecondaryGray).Italic();
                });
            });
        }

        private void MakbuzHeaderCiz(IContainer container, InsecASPNET.Entities.Payment odeme)
        {
            container.Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("inSEC")
                            .FontSize(20).Bold().FontColor(PrimaryDark);
                        c.Item().Text("Sigorta Yönetim Sistemi")
                            .FontSize(8).FontColor(SecondaryGray);
                    });
                    row.RelativeItem().AlignRight().Column(c =>
                    {
                        c.Item().AlignRight().Text("ÖDEME MAKBUZU")
                            .FontSize(11).Bold().LetterSpacing(0.1f);
                        c.Item().AlignRight().Text(odeme.IslemReferansi)
                            .FontSize(11).Bold().FontColor(SecondaryGray);
                        c.Item().AlignRight().Text(odeme.IslemTarihi.ToString("dd MMMM yyyy HH:mm",
                            new CultureInfo("tr-TR")))
                            .FontSize(8).FontColor(SecondaryGray);
                    });
                });
                col.Item().PaddingTop(15).LineHorizontal(2).LineColor(PrimaryDark);
            });
        }

        private void MakbuzIcerikCiz(IContainer container, InsecASPNET.Entities.Payment odeme, Policy police)
        {
            var trCulture = new CultureInfo("tr-TR");
            container.PaddingVertical(15).Column(col =>
            {
                col.Spacing(15);

                col.Item().Row(row =>
                {
                    var renk = odeme.Durum == "Başarılı" ? "#10b981" : "#ef4444";
                    row.AutoItem()
                        .Background(renk).PaddingHorizontal(10).PaddingVertical(4)
                        .Text(odeme.Durum.ToUpper()).FontColor(Colors.White).FontSize(9).Bold();
                });

                col.Item().Element(e => BolumBaslik(e, "İŞLEM BİLGİLERİ"));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1);
                        c.RelativeColumn(2);
                    });

                    AnahtarDeger(table, "İşlem No", odeme.IslemReferansi);
                    AnahtarDeger(table, "İşlem Tarihi",
                        odeme.IslemTarihi.ToLocalTime().ToString("dd MMMM yyyy HH:mm", trCulture));
                    AnahtarDeger(table, "Durum", odeme.Durum);
                    if (!string.IsNullOrEmpty(odeme.HataMesaji))
                        AnahtarDeger(table, "Açıklama", odeme.HataMesaji);
                });

                col.Item().Element(e => BolumBaslik(e, "ÖDEME YAPILAN POLİÇE"));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1);
                        c.RelativeColumn(2);
                    });

                    AnahtarDeger(table, "Poliçe Numarası", police.PolicyNumber);
                    AnahtarDeger(table, "Sigorta Ürünü", police.Product?.ProductName ?? "—");
                    if (police.Customer != null)
                        AnahtarDeger(table, "Sigorta Ettiren",
                            $"{police.Customer.Adi} {police.Customer.Soyadi}");
                });

                col.Item().Element(e => BolumBaslik(e, "ÖDEME DETAYI"));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1);
                        c.RelativeColumn(2);
                    });

                    AnahtarDeger(table, "Kart Sahibi", odeme.KartSahibi);
                    AnahtarDeger(table, "Kart Numarası",
                        $"**** **** **** {odeme.KartSon4}");
                });

                col.Item().PaddingTop(5).Background(LightBg).Padding(15).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Ödenen Tutar")
                            .FontSize(9).FontColor(SecondaryGray);
                        c.Item().PaddingTop(2)
                            .Text($"{odeme.Tutar.ToString("N2", trCulture)} ₺")
                            .FontSize(24).Bold().FontColor(PrimaryDark);
                    });
                });

                col.Item().PaddingTop(10).Background(LightBg).Padding(10).Column(c =>
                {
                    c.Item().Text("Bilgilendirme")
                        .FontSize(8).Bold().FontColor(SecondaryGray);
                    c.Item().PaddingTop(3).Text(
                        "Bu belge, 5684 sayılı Sigortacılık Kanunu kapsamındaki ödeme işleminin " +
                        "elektronik kayıt belgesidir. PCI-DSS uyumluluğu çerçevesinde kart bilgilerinin " +
                        "tamamı sistemimizde saklanmaz, yalnızca son 4 hane görüntülenir. " +
                        "Sorularınız için: destek@insec.com")
                        .FontSize(8).FontColor(SecondaryGray);
                });
            });
        }

        private void FooterCiz(IContainer container)
        {
            container.PaddingTop(8).BorderTop(0.5f).BorderColor(BorderColor)
                .PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text(t =>
                {
                    t.Span("inSEC Sigorta · ")
                        .FontSize(7).FontColor(SecondaryGray);
                    t.Span("destek@insec.com · 0850 123 45 67")
                        .FontSize(7).FontColor(SecondaryGray);
                });
                row.RelativeItem().AlignRight().Text(t =>
                {
                    t.Span("Sayfa ").FontSize(7).FontColor(SecondaryGray);
                    t.CurrentPageNumber().FontSize(7).FontColor(SecondaryGray);
                    t.Span(" / ").FontSize(7).FontColor(SecondaryGray);
                    t.TotalPages().FontSize(7).FontColor(SecondaryGray);
                });
            });
        }
        private void AnahtarDeger(QuestPDF.Fluent.TableDescriptor table, string anahtar, string deger)
        {
            table.Cell().Padding(5).Text(anahtar).FontSize(9).FontColor(SecondaryGray);
            table.Cell().Padding(5).Text(deger).FontSize(9).Bold();
        }

        private static string RiskAnahtarOkunabilir(string anahtar) => anahtar switch
        {
            "aracYili" => "Araç Model Yılı",
            "motorGucuKw" => "Motor Gücü (kW)",
            "yakitTipi" => "Yakıt Tipi",
            "sehir" => "Şehir",
            "surucuYasi" => "Sürücü Yaşı",
            "hasarsizlikBasamagi" => "Hasarsızlık Basamağı",
            "garajTipi" => "Park Yeri",
            "yillikKm" => "Yıllık Kilometre",
            "kullanimAmaci" => "Kullanım Amacı",
            "hasarAdedi" => "Son 3 Yıl Hasar Adedi",
            "binaYasi" => "Bina Yaşı",
            "metrekare" => "Brüt Alan (m²)",
            "kat" => "Kat",
            "esyaDegeri" => "Eşya Değeri",
            "binaTipi" => "Bina Tipi",
            "yas" => "Yaş",
            "cinsiyet" => "Cinsiyet",
            "sigara" => "Sigara Kullanımı",
            "kronikHastalik" => "Kronik Hastalık",
            "bmi" => "BMI",
            "bolge" => "Hedef Bölge",
            "gunSayisi" => "Süre (gün)",
            "maceraSporu" => "Macera Sporu",
            _ => anahtar
        };

        private static string YakinlikEtiket(string yakinlik) => yakinlik switch
        {
            "Es" => "Eş",
            "Anne" => "Anne",
            "Baba" => "Baba",
            "Cocuk" => "Çocuk",
            "Kardes" => "Kardeş",
            "Diger" => "Diğer Yakın",
            _ => yakinlik
        };
    }
}
