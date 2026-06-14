using InsecASPNET.Data;
using InsecASPNET.DTOs;
using InsecASPNET.Entities;
using InsecASPNET.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using System.Security.Cryptography;

namespace InsecASPNET.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClaimsController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly INotificationService _notificationService;

        public ClaimsController(
            InsecDbContext context,
            IWebHostEnvironment env,
            INotificationService notificationService)
        {
            _context = context;
            _env = env;
            _notificationService = notificationService;
        }

        
        private int? MevcutMusteriId()
        {
            var s = User.FindFirst("MusteriId")?.Value;
            return int.TryParse(s, out var id) ? id : null;
        }

        private static readonly string[] IzinliHasarTurleri =
        {
            "Trafik Kazası", "Yangın", "Hırsızlık", "Doğal Afet",
            "Sağlık", "Cam Kırılması", "Diğer"
        };

        // musterinin policesine hasar kaydi olusturmasi icin kullanilan endpoint
        [Authorize]
        [HttpPost("hasar-kaydi-olustur")]
        public async Task<IActionResult> HasarKaydiOlustur(HasarOlusturDto dto)
        {

            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var police = await _context.Policies.FindAsync(dto.PolicyId);
            if (police == null || !police.IsActive)
                return NotFound("Poliçe bulunamadı veya iptal edilmiş.");

            if (police.CustomerId != musteriId.Value)
                return Forbid();

            if (police.Status != "Aktif Poliçe")
                return BadRequest("Hasar bildirebilmek için poliçenizin yürürlükte olması gerekir. Teklif aşamasındaki kayıtlar için hasar açamazsınız.");

            if (dto.HasarTarihi > DateTime.Now)
                return BadRequest("Hasar tarihi gelecek bir tarih olamaz.");

            // hasar tarihi gecerli police tarihinde olmali, yoksa gecmis senenin kazasini rapor etme gibi sacma bir acık olusur
            if (dto.HasarTarihi < police.StartDate || dto.HasarTarihi > police.EndDate)
                return BadRequest($"Hasar tarihi poliçe geçerlilik aralığında olmalı ({police.StartDate:dd.MM.yyyy} - {police.EndDate:dd.MM.yyyy}).");

            // sigorta mevzuatına göre belli bir zaman icinde hasar kaydi olusmali yani zamanasımı yapılamaz
            if (dto.HasarTarihi < DateTime.Now.AddYears(-1))
                return BadRequest("1 yıldan eski hasarlar için talep oluşturulamaz (zamanaşımı).");

            // normalde net tutarı eksper belirler ama biz müsteriden tahmini bi fiyat alıyoruz aslında bi gecerliligi yok 
            if (dto.TahminiTutar.HasValue)
            {
                if (dto.TahminiTutar.Value <= 0)
                    return BadRequest("Tutar girilecekse pozitif olmalıdır.");
                if (dto.TahminiTutar.Value > 10_000_000m)
                    return BadRequest("Tutar maksimum 10.000.000 TL olabilir.");
            }

            // hasar kaydı acıklaması
            var aciklama = dto.Aciklama?.Trim() ?? "";
            if (aciklama.Length < 10)
                return BadRequest("Açıklama en az 10 karakter olmalıdır.");
            if (aciklama.Length > 2000)
                return BadRequest("Açıklama en fazla 2000 karakter olabilir.");

            if (!IzinliHasarTurleri.Contains(dto.HasarTuru))
                return BadRequest("Geçersiz hasar türü.");

            // yeni hasar kaydi burada olusur
            var yeniHasar = new Claim
            {
                PolicyId = dto.PolicyId,
                HasarTuru = dto.HasarTuru,
                HasarTarihi = dto.HasarTarihi,
                HasarYeri = string.IsNullOrWhiteSpace(dto.HasarYeri) ? null : dto.HasarYeri.Trim(),
                ClaimDescription = aciklama,
                ClaimAmount = dto.TahminiTutar,   // null olabilir — eksper belirleyecek
                ClaimDate = DateTime.Now,
                ClaimStatus = "İncelemede",
                IsActive = true
            };

            _context.Claims.Add(yeniHasar);
            await _context.SaveChangesAsync();

            // burada url whitelist denen bi yontem var: guvenlik acısından sadece bizim upload endpointimizden dönen urlleri kabul ediyoruz
            if (dto.FotografUrlleri != null && dto.FotografUrlleri.Count > 0)
            {
                foreach (var url in dto.FotografUrlleri.Take(10))  // max 10 fotograf yuklenebilir
                {
                    if (string.IsNullOrWhiteSpace(url)) continue;
                    var temizUrl = url.Trim();
                    if (!temizUrl.StartsWith("/uploads/claims/", StringComparison.OrdinalIgnoreCase))
                        continue; 
                    _context.ClaimImages.Add(new ClaimImage
                    {
                        ClaimId = yeniHasar.Id,
                        ImageUrl = temizUrl
                    });
                }
                await _context.SaveChangesAsync();
            }

            // hasar dosyasinin acıldıgına dair bildirim dönüyoruz
            await _notificationService.OlusturAsync(
                customerId: musteriId.Value,
                tip: "Hasar",
                baslik: "Hasar dosyanız incelemeye alındı",
                mesaj: $"HSR-{yeniHasar.Id:D6} numaralı hasar talebiniz alındı. Eksperimiz en kısa sürede dosyanızı değerlendirecektir.",
                linkUrl: $"/dashboard/hasarlarim/{yeniHasar.Id}",
                iconKey: "alert-triangle");

            return Ok(new
            {
                Mesaj = "Hasar dosyanız başarıyla açıldı ve incelemeye alındı. Eksperimiz en kısa sürede sizinle iletişime geçecektir.",
                HasarId = yeniHasar.Id,
                Durum = yeniHasar.ClaimStatus,
                TahminiTutar = yeniHasar.ClaimAmount
            });
        }

        // müsterinin tüm hasarlarını listeleyip görebildiği yer 
        [Authorize]
        [HttpGet("hasarlarim")]
        public async Task<IActionResult> Hasarlarim()
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            // claim yani hasarın customerId'si yok ama policenin var. policeyi secip ona baglı hasarları listeliyoruz
            var hasarlar = await _context.Claims
                .Include(c => c.Policy)
                    .ThenInclude(p => p!.Product)   // ürün adı için
                .Include(c => c.Images)
                .Where(c => c.IsActive && c.Policy!.CustomerId == musteriId.Value)
                .OrderByDescending(c => c.ClaimDate)
                .ToListAsync();

            return Ok(hasarlar);
        }

        // hasar kaydi detay sayfasi
        [Authorize]
        [HttpGet("hasar-detayi/{id}")]
        public async Task<IActionResult> HasarDetayi(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var hasar = await _context.Claims
                .Include(c => c.Policy)
                    .ThenInclude(p => p!.Product)
                .Include(c => c.Policy)
                    .ThenInclude(p => p!.InsuredPerson)
                .Include(c => c.Images)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

            if (hasar == null)
                return NotFound("Hasar kaydı bulunamadı.");

            // klasik auth kontrolü sadece kendi hasarını görebilir müsteri 
            var rol = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (rol != "Admin" && hasar.Policy?.CustomerId != musteriId.Value)
                return Forbid();

            return Ok(hasar);
        }

        // police detay sayfasinda kullaniliyor - o policeye ait hasarlari police sayfasinda gostermek icin
        [Authorize]
        [HttpGet("policeye-ait-hasarlari-getir/{policyId}")]
        public async Task<IActionResult> PoliceyeAitHasarlariGetir(int policyId)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var police = await _context.Policies.FindAsync(policyId);
            if (police == null || !police.IsActive)
                return NotFound("Poliçe bulunamadı.");

            var rol = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (rol != "Admin" && police.CustomerId != musteriId.Value)
                return Forbid();

            var hasarlar = await _context.Claims
                .Include(c => c.Images)
                .Where(c => c.PolicyId == policyId && c.IsActive)
                .OrderByDescending(c => c.ClaimDate)
                .ToListAsync();

            return Ok(hasarlar);
        }

        // musteri olusturdugu hasar kaydını iptal etmek icin kullanir ama yalnizca hala inceleme durumunda olan kayitlar iptal edilebilir
        [Authorize]
        [HttpDelete("{id}/iptal")]
        public async Task<IActionResult> HasarIptalEt(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var hasar = await _context.Claims
                .Include(c => c.Policy)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

            if (hasar == null) return NotFound("Hasar kaydı bulunamadı.");

            if (hasar.Policy?.CustomerId != musteriId.Value)
                return Forbid();

            if (hasar.ClaimStatus != "İncelemede")
                return BadRequest("Sadece inceleme aşamasındaki hasarlar iptal edilebilir.");

            hasar.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Hasar talebiniz iptal edildi." });
        }

        // hasar kaydina sonradan fotograf eklemek icin
        [Authorize]
        [HttpPost("{claimId}/fotograf-ekle")]
        public async Task<IActionResult> HasaraFotografEkle(int claimId, [FromBody] List<string> resimUrlListesi)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var hasar = await _context.Claims
                .Include(c => c.Policy)
                .FirstOrDefaultAsync(c => c.Id == claimId && c.IsActive);

            if (hasar == null) return NotFound("Hasar kaydı bulunamadı.");
            if (hasar.Policy?.CustomerId != musteriId.Value) return Forbid();

            // sadece incelemede olan kayitlara belge eklenebilir
            if (hasar.ClaimStatus != "İncelemede")
                return BadRequest("Bu hasara artık belge eklenemez.");

            var sayac = 0;
            foreach (var url in resimUrlListesi.Take(10))
            {
                if (string.IsNullOrWhiteSpace(url)) continue;
                var temizUrl = url.Trim();
                if (!temizUrl.StartsWith("/uploads/claims/", StringComparison.OrdinalIgnoreCase))
                    continue;
                _context.ClaimImages.Add(new ClaimImage
                {
                    ClaimId = claimId,
                    ImageUrl = temizUrl
                });
                sayac++;
            }
            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = $"{sayac} adet fotoğraf hasar dosyasına eklendi." });
        }

        // fotograf yükleme endpointi
        [Authorize]
        [HttpPost("upload-photo")]
        [RequestSizeLimit(6 * 1024 * 1024)] 
        public async Task<IActionResult> FotografYukle(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Dosya gönderilmedi.");

            // boyut kontrolü — request size limit zaten var ama cift güvence 
            const long maxBytes = 5 * 1024 * 1024;   // 5 MB
            if (file.Length > maxBytes)
                return BadRequest("Dosya boyutu 5 MB'tan büyük olamaz.");

            // 2) MIME tipi whitelist'i
            var izinliMime = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!izinliMime.Contains(file.ContentType?.ToLowerInvariant()))
                return BadRequest("Sadece JPG, PNG veya WebP formatında resim yükleyebilirsiniz.");

            // 3) uzantı whitelist'i (yine cift kontrol)
            var uzanti = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var izinliUzanti = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!izinliUzanti.Contains(uzanti))
                return BadRequest("Geçersiz dosya uzantısı.");

            // .png uzantısı yapilsa bile resim olmayan dosyalari engellemek icin kontrol
            if (!await ResimImzasiniDogrulaAsync(file))
                return BadRequest("Dosya geçerli bir resim değil.");

            var guvenliAd = $"{Guid.NewGuid():N}{uzanti}";

            var hedefKlasor = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "claims");
            Directory.CreateDirectory(hedefKlasor);

            var hedefDosya = Path.Combine(hedefKlasor, guvenliAd);

            using (var stream = new FileStream(hedefDosya, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/claims/{guvenliAd}";

            return Ok(new { Url = url, Boyut = file.Length, Tip = file.ContentType });
        }

        private static async Task<bool> ResimImzasiniDogrulaAsync(IFormFile file)
        {
            try
            {
                using var stream = file.OpenReadStream();
                var bytes = new byte[12];
                var okunan = await stream.ReadAsync(bytes, 0, 12);
                if (okunan < 4) return false;

                // JPEG: FF D8 FF
                if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
                    return true;

                // PNG: 89 50 4E 47 0D 0A 1A 0A
                if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
                    return true;

                // WebP: RIFF (4 byte size) WEBP
                if (okunan >= 12 &&
                    bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                    bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
                    return true;

                return false;
            }
            catch
            {
                return false;
            }
        }

        // admin endpointleri

        [Authorize(Roles = "Admin")]
        [HttpGet("hasarlari-getir")]
        public async Task<IActionResult> HasarlariGetir(string? durum = null)
        {
            var sorgu = _context.Claims
                .Include(c => c.Policy)
                    .ThenInclude(p => p!.Customer)
                .Include(c => c.Policy)
                    .ThenInclude(p => p!.Product)
                .Include(c => c.Images)
                .Where(c => c.IsActive);

            if (!string.IsNullOrWhiteSpace(durum))
                sorgu = sorgu.Where(c => c.ClaimStatus == durum);

            var hasarlar = await sorgu
                .OrderByDescending(c => c.ClaimDate)
                .ToListAsync();

            return Ok(hasarlar);
        }

        // admin degerlendirmesi: onayla - reddet - öde
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/degerlendir")]
        public async Task<IActionResult> HasarDegerlendir(int id, HasarDegerlendirDto dto)
        {
            var hasar = await _context.Claims.FindAsync(id);
            if (hasar == null || !hasar.IsActive)
                return NotFound("Hasar kaydı bulunamadı.");

            // gecisler
            //   incelemede -> Onaylandı / Reddedildi
            //   Onaylandı -> Ödendi
            //   Reddedildi -> (terminal)
            //   Ödendi -> (terminal)
            var izinliGecisler = new Dictionary<string, string[]>
            {
                ["İncelemede"] = new[] { "Onaylandı", "Reddedildi" },
                ["Onaylandı"] = new[] { "Ödendi" },
            };

            if (!izinliGecisler.TryGetValue(hasar.ClaimStatus, out var izinliler) ||
                !izinliler.Contains(dto.YeniDurum))
            {
                return BadRequest($"'{hasar.ClaimStatus}' durumundan '{dto.YeniDurum}' durumuna geçilemez.");
            }

            if (dto.YeniDurum == "Onaylandı")
            {
                if (dto.OnaylananTutar == null || dto.OnaylananTutar <= 0)
                    return BadRequest("Onaylanan tutar belirtilmelidir.");
                if (hasar.ClaimAmount.HasValue && dto.OnaylananTutar > hasar.ClaimAmount.Value)
                    return BadRequest("Onaylanan tutar müşterinin beyanından fazla olamaz.");
                hasar.OnaylananTutar = dto.OnaylananTutar;
            }

            // red aciklamasi yapmak zorunlu
            if (dto.YeniDurum == "Reddedildi")
            {
                if (string.IsNullOrWhiteSpace(dto.Not))
                    return BadRequest("Red sebebi belirtilmelidir.");
                hasar.RetSebebi = dto.Not.Trim();
            }
            else if (!string.IsNullOrWhiteSpace(dto.Not))
            {
                hasar.AdminNotu = dto.Not.Trim();
            }

            hasar.ClaimStatus = dto.YeniDurum;
            hasar.SonuclanmaTarihi = DateTime.Now;
            await _context.SaveChangesAsync();

            // musteriye ddurum güncellemesi bildirimi dönüyoruz
            var policyOwner = await _context.Policies
                .Where(p => p.Id == hasar.PolicyId)
                .Select(p => p.CustomerId)
                .FirstOrDefaultAsync();

            if (policyOwner > 0)
            {
                var (baslik, mesaj, icon) = dto.YeniDurum switch
                {
                    "Onaylandı" => (
                        "Hasar talebiniz onaylandı",
                        $"HSR-{hasar.Id:D6} dosyanız onaylandı. Onaylanan tutar: {hasar.OnaylananTutar:N2} ₺. Ödeme süreci başlatılıyor.",
                        "check"
                    ),
                    "Reddedildi" => (
                        "Hasar talebiniz reddedildi",
                        $"HSR-{hasar.Id:D6} dosyanız reddedildi. Sebep: {hasar.RetSebebi}",
                        "x"
                    ),
                    "Ödendi" => (
                        "Hasar tutarı ödendi",
                        $"HSR-{hasar.Id:D6} için onaylanan tutar hesabınıza geçirildi. Detaylar için dosyanızı inceleyebilirsiniz.",
                        "cash"
                    ),
                    _ => (
                        "Hasar durumu güncellendi",
                        $"HSR-{hasar.Id:D6} dosyanızın durumu '{dto.YeniDurum}' olarak güncellendi.",
                        "info"
                    )
                };

                await _notificationService.OlusturAsync(
                    customerId: policyOwner,
                    tip: "Hasar",
                    baslik: baslik,
                    mesaj: mesaj,
                    linkUrl: $"/dashboard/hasarlarim/{hasar.Id}",
                    iconKey: icon);
            }

            return Ok(new { Mesaj = $"Hasar durumu '{dto.YeniDurum}' olarak güncellendi.", HasarId = hasar.Id });
        }
    }
}
