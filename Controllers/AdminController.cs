using InsecASPNET.Data;
using InsecASPNET.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Controllers
{
   
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly INotificationService _notificationService;

        public AdminController(
            InsecDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // admin dashboard'da gösterilcek istatistikler
        [HttpGet("dashboard-istatistik")]
        public async Task<IActionResult> DashboardIstatistik()
        {
            var simdi = DateTime.UtcNow;
            var ayinIlki = new DateTime(simdi.Year, simdi.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var toplamMusteri = await _context.Customers
                .CountAsync(c => c.IsActive);

            var aktifPolice = await _context.Policies
                .CountAsync(p => p.IsActive && p.Status == "Aktif Poliçe");

            var bekleyenTeklif = await _context.Policies
                .CountAsync(p => p.IsActive && p.Status == "Teklif Bekliyor");

            var acikHasar = await _context.Claims
                .CountAsync(c => c.IsActive && c.ClaimStatus == "İncelemede");

            // bu ayki basarılı ödemelerin TL hacmi
            var aylikPrimHacmi = await _context.Payments
                .Where(p => p.Durum == "Başarılı" && p.IslemTarihi >= ayinIlki)
                .SumAsync(p => (decimal?)p.Tutar) ?? 0m;

            var aylikYeniTeklif = await _context.Policies
                .CountAsync(p => p.StartDate >= ayinIlki);

            // gecen 6 ay icin aylık ödeme hacmi
            var altiAyOnce = ayinIlki.AddMonths(-5);
            var aylikHacim = await _context.Payments
                .Where(p => p.Durum == "Başarılı" && p.IslemTarihi >= altiAyOnce)
                .GroupBy(p => new { p.IslemTarihi.Year, p.IslemTarihi.Month })
                .Select(g => new
                {
                    Yil = g.Key.Year,
                    Ay = g.Key.Month,
                    Toplam = g.Sum(p => p.Tutar),
                    IslemSayisi = g.Count()
                })
                .OrderBy(x => x.Yil).ThenBy(x => x.Ay)
                .ToListAsync();

            // ürün dağılımı (yuvarlak grafik icin)
            var urunDagilim = await _context.Policies
                .Where(p => p.IsActive && p.Status == "Aktif Poliçe")
                .Include(p => p.Product)
                .GroupBy(p => p.Product!.ProductName)
                .Select(g => new { UrunAdi = g.Key, Sayi = g.Count() })
                .OrderByDescending(x => x.Sayi)
                .ToListAsync();

            // hasar durum dağılımı
            var hasarDagilim = await _context.Claims
                .Where(c => c.IsActive)
                .GroupBy(c => c.ClaimStatus)
                .Select(g => new { Durum = g.Key, Sayi = g.Count() })
                .ToListAsync();

            return Ok(new
            {
                ToplamMusteri = toplamMusteri,
                AktifPolice = aktifPolice,
                BekleyenTeklif = bekleyenTeklif,
                AcikHasar = acikHasar,
                AylikPrimHacmi = aylikPrimHacmi,
                AylikYeniTeklif = aylikYeniTeklif,
                AylikHacim = aylikHacim,
                UrunDagilim = urunDagilim,
                HasarDagilim = hasarDagilim,
            });
        }

        // admin icin detayli musteri bilgileri police hasarlar vs.
        [HttpGet("musteri-detay/{id}")]
        public async Task<IActionResult> MusteriDetay(int id)
        {
            var musteri = await _context.Customers
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Adi,
                    c.Soyadi,
                    c.Email,
                    c.TelefonNo,
                    c.KimlikNo,
                    c.DogumTarihi,
                    c.Rol,
                    c.IsActive,
                    c.AvatarUrl,
                })
                .FirstOrDefaultAsync();

            if (musteri == null) return NotFound("Müşteri bulunamadı.");

            var policeler = await _context.Policies
                .Where(p => p.CustomerId == id && p.IsActive)
                .Include(p => p.Product)
                .OrderByDescending(p => p.StartDate)
                .Select(p => new
                {
                    p.Id,
                    p.PolicyNumber,
                    UrunAdi = p.Product!.ProductName,
                    p.Status,
                    p.Price,
                    p.StartDate,
                    p.EndDate,
                })
                .ToListAsync();

            var hasarlar = await _context.Claims
                .Include(c => c.Policy)
                .Where(c => c.IsActive && c.Policy!.CustomerId == id)
                .OrderByDescending(c => c.ClaimDate)
                .Select(c => new
                {
                    c.Id,
                    c.HasarTuru,
                    c.ClaimStatus,
                    c.ClaimAmount,
                    c.OnaylananTutar,
                    c.ClaimDate,
                    PoliceNo = c.Policy!.PolicyNumber,
                })
                .ToListAsync();

            var odemeler = await _context.Payments
                .Include(p => p.Policy)
                .Where(p => p.Policy!.CustomerId == id)
                .OrderByDescending(p => p.IslemTarihi)
                .Select(p => new
                {
                    p.Id,
                    p.Tutar,
                    p.Durum,
                    p.IslemTarihi,
                    p.IslemReferansi,
                    PoliceNo = p.Policy!.PolicyNumber,
                })
                .ToListAsync();

            return Ok(new
            {
                Musteri = musteri,
                Policeler = policeler,
                Hasarlar = hasarlar,
                Odemeler = odemeler,
            });
        }

        // sistem geneline bildirim yayinlama sistemi, adminler tüm müsterilere veya belirli tek bir müsteriye bildirim yollayabilir
        [HttpPost("bildirim-yayinla")]
        public async Task<IActionResult> BildirimYayinla(BildirimYayinDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Baslik) || dto.Baslik.Trim().Length < 3)
                return BadRequest("Başlık en az 3 karakter olmalıdır.");
            if (string.IsNullOrWhiteSpace(dto.Mesaj) || dto.Mesaj.Trim().Length < 10)
                return BadRequest("Mesaj en az 10 karakter olmalıdır.");

            var hedefler = dto.HedefMusteriId.HasValue
                ? new[] { dto.HedefMusteriId.Value }
                : await _context.Customers
                    .Where(c => c.IsActive && c.Rol == "Müşteri")   // admin'lere bildirim atmaya gerek yok
                    .Select(c => c.Id)
                    .ToArrayAsync();

            if (hedefler.Length == 0)
                return BadRequest("Bildirim gönderilecek müşteri bulunamadı.");

            // Toplu insert yapıyoz bildirim servisi yerine AddRange
            var simdi = DateTime.UtcNow;
            var bildirimler = hedefler.Select(mid => new InsecASPNET.Entities.Notification
            {
                CustomerId = mid,
                Tip = "Sistem",
                Baslik = dto.Baslik.Trim(),
                Mesaj = dto.Mesaj.Trim(),
                LinkUrl = string.IsNullOrWhiteSpace(dto.LinkUrl) ? null : dto.LinkUrl.Trim(),
                IconKey = "info",
                Okundu = false,
                CreatedAt = simdi,
            }).ToList();

            _context.Notifications.AddRange(bildirimler);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Mesaj = $"{bildirimler.Count} müşteriye bildirim yayınlandı.",
                HedefSayisi = bildirimler.Count,
            });
        }
    }

    // Admin bildirim yayını için DTO — controller dosyasında inline tutuyorum
    // çünkü sadece bu controller kullanıyor.
    public class BildirimYayinDto
    {
        public required string Baslik { get; set; }
        public required string Mesaj { get; set; }
        public string? LinkUrl { get; set; }

        // null = tüm aktif müşterilere; dolu = sadece o müşteriye
        public int? HedefMusteriId { get; set; }
    }
}
