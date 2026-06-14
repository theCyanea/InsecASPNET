using InsecASPNET.DTOs;

namespace InsecASPNET.Services.Payment
{

    public class MockPaymentService : IPaymentService
    {

        private const string TestKart_Basarili = "4242424242424242";
        private const string TestKart_Reddedildi = "4000000000000002";
        private const string TestKart_GeçersizCvv = "4000000000000127";

        public async Task<OdemeSonucu> OdemeyiIsleAsync(OdemeDto odeme, decimal tutar)
        {
            var kartNo = (odeme.KartNumarasi ?? "")
                .Replace(" ", "")
                .Replace("-", "")
                .Trim();

            if (kartNo.Length != 16 || !kartNo.All(char.IsDigit))
            {
                return Hata("Kart numarası 16 haneli ve sadece rakamlardan oluşmalıdır.",
                    "Geçersiz Kart");
            }
            if (string.IsNullOrWhiteSpace(odeme.KartSahibi) || odeme.KartSahibi.Trim().Length < 3)
            {
                return Hata("Kart sahibinin tam adı zorunludur.", "Geçersiz Kart");
            }
            if (!SonKullanmaGecerliMi(odeme.SonKullanma, out var hataMsg))
            {
                return Hata(hataMsg!, "Geçersiz Kart");
            }
            if (string.IsNullOrWhiteSpace(odeme.Cvv) ||
                odeme.Cvv.Length is < 3 or > 4 ||
                !odeme.Cvv.All(char.IsDigit))
            {
                return Hata("CVV 3 veya 4 haneli olmalıdır.", "Geçersiz Kart");
            }
            if (!LuhnGecerliMi(kartNo))
            {
                return Hata("Kart numarası geçersiz.",
                    "Geçersiz Kart");
            }
            await Task.Delay(1500);
            if (kartNo == TestKart_Reddedildi)
            {
                return new OdemeSonucu
                {
                    Basarili = false,
                    HataMesaji = "Bankanız bu işlemi onaylamadı (yetersiz bakiye).",
                    Durum = "Reddedildi",
                    KartSon4 = kartNo[^4..],
                    IslemReferansi = $"TXN-{Guid.NewGuid():N}"[..16].ToUpper()
                };
            }

            if (kartNo == TestKart_GeçersizCvv)
            {
                return new OdemeSonucu
                {
                    Basarili = false,
                    HataMesaji = "Güvenlik kodu (CVV) uyuşmuyor.",
                    Durum = "Reddedildi",
                    KartSon4 = kartNo[^4..],
                    IslemReferansi = $"TXN-{Guid.NewGuid():N}"[..16].ToUpper()
                };
            }

            return new OdemeSonucu
            {
                Basarili = true,
                Durum = "Başarılı",
                KartSon4 = kartNo[^4..],
                IslemReferansi = $"TXN-{Guid.NewGuid():N}"[..16].ToUpper()
            };
        }

        private static OdemeSonucu Hata(string mesaj, string durum)
        {
            return new OdemeSonucu
            {
                Basarili = false,
                HataMesaji = mesaj,
                Durum = durum,
                KartSon4 = "",
                IslemReferansi = $"TXN-{Guid.NewGuid():N}"[..16].ToUpper()
            };
        }

        private static bool SonKullanmaGecerliMi(string sonKullanma, out string? hata)
        {
            hata = null;
            if (string.IsNullOrWhiteSpace(sonKullanma))
            {
                hata = "Son kullanma tarihi zorunludur.";
                return false;
            }

            var parcalar = sonKullanma.Split('/');
            if (parcalar.Length != 2 ||
                !int.TryParse(parcalar[0], out var ay) ||
                !int.TryParse(parcalar[1], out var yil))
            {
                hata = "Son kullanma tarihi MM/YY formatında olmalıdır.";
                return false;
            }

            if (ay < 1 || ay > 12)
            {
                hata = "Son kullanma ayı 01-12 arası olmalıdır.";
                return false;
            }

            var tamYil = 2000 + yil;

            var sonGecerlilik = new DateTime(tamYil, ay, 1).AddMonths(1).AddDays(-1);

            if (sonGecerlilik < DateTime.UtcNow.Date)
            {
                hata = "Kartın son kullanma tarihi geçmiş.";
                return false;
            }

            return true;
        }

        private static bool LuhnGecerliMi(string kartNo)
        {
            int toplam = 0;
            bool ciftHane = false;

            for (int i = kartNo.Length - 1; i >= 0; i--)
            {
                int hane = kartNo[i] - '0';

                if (ciftHane)
                {
                    hane *= 2;
                    if (hane > 9) hane -= 9;
                }

                toplam += hane;
                ciftHane = !ciftHane;
            }

            return toplam % 10 == 0;
        }
    }
}
