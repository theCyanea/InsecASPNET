using InsecASPNET.Data;
using InsecASPNET.DTOs;
using InsecASPNET.Entities;
using InsecASPNET.Services.Notifications;
using InsecASPNET.Services.Payment;
using InsecASPNET.Services.Pdf;
using InsecASPNET.Services.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace InsecASPNET.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoliciesController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly IEnumerable<IPricingStrategy> _strategiler;
        private readonly DefaultPricingStrategy _varsayilanStrategy;
        private readonly IPaymentService _paymentService;
        private readonly IPolicePdfService _pdfService;
        private readonly INotificationService _notificationService;

        public PoliciesController(
            InsecDbContext context,
            IEnumerable<IPricingStrategy> strategiler,
            DefaultPricingStrategy varsayilanStrategy,
            IPaymentService paymentService,
            IPolicePdfService pdfService,
            INotificationService notificationService)
        {
            _context = context;
            _strategiler = strategiler;
            _varsayilanStrategy = varsayilanStrategy;
            _paymentService = paymentService;
            _pdfService = pdfService;
            _notificationService = notificationService;
        }

        // strategy secici — PricingController ile aynı mantık
        private IPricingStrategy SecStrategy(string? productCode)
        {
            if (string.IsNullOrWhiteSpace(productCode))
                return _varsayilanStrategy;
            var match = _strategiler.FirstOrDefault(s =>
                string.Equals(s.ProductCode, productCode, StringComparison.OrdinalIgnoreCase));
            return match ?? _varsayilanStrategy;
        }

        // TeklifOlustur icinde tekrar etmesin diye üc senaryoyu tek metoda topluyoruz
        // 1- hem id hem yeni null ise null döndür yani: sigortali = sigorta ettiren
        // 2- id verilmis ise kayit bulup id dondur yani: daha once yakin eklenmis
        // 3- yeni verilmis ise db'ye yaz yeni id'yi döndür yani: yeni yakin eklendi
        private async Task<(int? insuredPersonId, string? error)> SigortaliKisiResolve(
            int customerId, int? gelenId, InsuredPersonOlusturDto? yeniSigortali)
        {
            // senaryo 1: kullanıcı kendisi icin sigorta yapıyor
            if (gelenId == null && yeniSigortali == null)
                return (null, null);

            // senaryo 2: mevcut yakın secildi
            if (gelenId.HasValue)
            {
                var yakin = await _context.InsuredPersons
                    .FirstOrDefaultAsync(ip => ip.Id == gelenId.Value && ip.IsActive);
                if (yakin == null)
                    return (null, "Seçilen yakın bulunamadı veya silinmiş.");
                // bir kullanıcı baska kullanıcının yakın listesine erisemez
                if (yakin.CustomerId != customerId)
                    return (null, "Bu yakın size ait değil.");
                return (yakin.Id, null);
            }

            // senaryo 3: yeni yakın olusturuluyor
            if (yeniSigortali != null)
            {
                if (string.IsNullOrWhiteSpace(yeniSigortali.AdSoyad))
                    return (null, "Sigortalının adı soyadı zorunludur.");
                if (string.IsNullOrWhiteSpace(yeniSigortali.TcKimlikNo) ||
                    yeniSigortali.TcKimlikNo.Length != 11 ||
                    !yeniSigortali.TcKimlikNo.All(char.IsDigit))
                    return (null, "TC Kimlik No 11 haneli ve sadece rakamlardan oluşmalıdır.");

                var yas = DateTime.Now.Year - yeniSigortali.DogumTarihi.Year;
                if (yas < 0 || yas > 120)
                    return (null, "Doğum tarihi geçersiz.");

                var izinliYakinlik = new[] { "Kendisi", "Es", "Anne", "Baba", "Cocuk", "Kardes", "Diger" };
                if (!izinliYakinlik.Contains(yeniSigortali.Yakinlik))
                    return (null, "Geçersiz yakınlık değeri.");

                // tc kontrolü: mevcut yakinin tcsi tekrar girilip tekrar eklenemez
                var mevcut = await _context.InsuredPersons.FirstOrDefaultAsync(
                    ip => ip.CustomerId == customerId &&
                          ip.TcKimlikNo == yeniSigortali.TcKimlikNo &&
                          ip.IsActive); 
                if (mevcut != null)
                    return (mevcut.Id, null);

                var yeni = new InsuredPerson
                {
                    AdSoyad = yeniSigortali.AdSoyad.Trim(),
                    TcKimlikNo = yeniSigortali.TcKimlikNo,
                    DogumTarihi = yeniSigortali.DogumTarihi,
                    Yakinlik = yeniSigortali.Yakinlik,
                    Telefon = yeniSigortali.Telefon,
                    CustomerId = customerId,
                };
                _context.InsuredPersons.Add(yeni);
                await _context.SaveChangesAsync();
                return (yeni.Id, null);
            }

            return (null, null);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("tum-policeleri-getir")]
        public async Task<IActionResult> TumPoliceleriGetir(string? durum = null)
        {
            var sorgu = _context.Policies.Where(p => p.IsActive == true);

            if (!string.IsNullOrEmpty(durum))
                sorgu = sorgu.Where(p => p.Status == durum);

            var policeler = await sorgu.ToListAsync();
            return Ok(policeler);
        }

        [Authorize]
        [HttpPost("teklif-olustur")]
        public async Task<IActionResult> TeklifOlustur(TeklifOlusturDto dto)
        {
            // ürün ve teminatları tek seferde cekiyoruz cünkü
            //  - zorunlu teminatların hepsinin gönderildigini doğrulamamız lazım
            //  - gönderilen id'lerin baska ürüne ait olmadıgını kontrol etmemiz lazım
            //  - prim hesabı yapmak için CoveragePrice'lar lazım
            var secilenUrun = await _context.Products
                .Include(u => u.Coverages)
                .FirstOrDefaultAsync(u => u.Id == dto.ProductId);

            if (secilenUrun == null)
                return NotFound("Seçilen sigorta ürünü sistemde bulunamadı.");

            var urunTeminatlari = secilenUrun.Coverages ?? new List<Coverage>();
            var urunTeminatIdSet = urunTeminatlari.Select(c => c.Id).ToHashSet();
            var gonderilenSet = dto.SelectedCoverageIds.ToHashSet();

            // yabancı teminat id'si varsa reddet (başka ürünün teminatı yapıstırılmıs olabilir)
            var yabanci = gonderilenSet.Except(urunTeminatIdSet).ToList();
            if (yabanci.Count > 0)
                return BadRequest($"Geçersiz teminat ID'leri: {string.Join(", ", yabanci)}. Bu teminatlar seçili ürüne ait değil.");

            // zorunlu teminatlar eksiksiz olmalı
            var zorunluIdler = urunTeminatlari.Where(c => c.IsRequired).Select(c => c.Id).ToList();
            var eksikZorunlular = zorunluIdler.Except(gonderilenSet).ToList();
            if (eksikZorunlular.Count > 0)
                return BadRequest("Bu ürünün zorunlu teminatları seçilmek zorunda — frontend tarafında otomatik işaretli olmalı.");

            var secilenTeminatlar = urunTeminatlari.Where(c => gonderilenSet.Contains(c.Id)).ToList();
            var riskDict = dto.RiskParameters ?? new Dictionary<string, string>();
            var strategy = SecStrategy(secilenUrun.ProductCode);
            var fiyatSonuc = strategy.Hesapla(secilenUrun, secilenTeminatlar, riskDict);

            string? riskDataJson = null;
            if (dto.RiskParameters != null && dto.RiskParameters.Count > 0)
            {
                riskDataJson = JsonSerializer.Serialize(dto.RiskParameters,
                    new JsonSerializerOptions
                    {
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                    });
            }

            var (insuredPersonId, kisiHatasi) =
                await SigortaliKisiResolve(dto.CustomerId, dto.InsuredPersonId, dto.YeniSigortali);
            if (kisiHatasi != null) return BadRequest(kisiHatasi);

            var yeniTeklif = new Policy
            {
                PolicyNumber = dto.PolicyNumber,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Price = fiyatSonuc.Total,    // pricing engine'in döndürdügü vergi dahil final fiyat
                Status = "Teklif Bekliyor",
                IsActive = true,
                ProductId = dto.ProductId,
                CustomerId = dto.CustomerId,
                InsuredPersonId = insuredPersonId,
                RiskDataJson = riskDataJson,
                PolicyCoverages = secilenTeminatlar
                    .Select(c => new PolicyCoverage { CoverageId = c.Id })
                    .ToList()
            };

            _context.Policies.Add(yeniTeklif);
            await _context.SaveChangesAsync();

            // yeni teklif olustuguna dair bildirim dönüyoruz
            await _notificationService.OlusturAsync(
                customerId: dto.CustomerId,
                tip: "Teklif",
                baslik: "Teklifiniz hazır",
                mesaj: $"{secilenUrun.ProductName} için {yeniTeklif.PolicyNumber} numaralı teklifiniz oluşturuldu. Ödemenizi tamamlayarak poliçenizi aktive edebilirsiniz.",
                linkUrl: $"/dashboard/policeler/{yeniTeklif.Id}",
                iconKey: "package");

            return Ok(new
            {
                Mesaj = "Teklif başarıyla hesaplandı ve sisteme kaydedildi.",
                TeklifId = yeniTeklif.Id,
                HesaplananFiyat = yeniTeklif.Price,
                BazFiyat = secilenUrun.Price,
                TeminatlarToplami = fiyatSonuc.CoverageTotal,
                RiskCarpani = fiyatSonuc.RiskMultiplier,
                Vergi = fiyatSonuc.Tax,
                Breakdown = fiyatSonuc.Breakdown,
                Durum = yeniTeklif.Status
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/policeyi-onayla")]
        public async Task<IActionResult> PoliceyiOnayla(int id)
        {
            var teklif = await _context.Policies.FindAsync(id);

            if (teklif == null || teklif.IsActive == false)
                return NotFound("Böyle bir teklif sistemde bulunamadı veya silinmiş.");

            if (teklif.Status == "Aktif Poliçe")
                return BadRequest("Bu poliçe zaten onaylanmış ve yürürlükte.");

            var orijinalSureGun = (teklif.EndDate - teklif.StartDate).Days;
            var yeniBaslangic = DateTime.UtcNow;
            teklif.StartDate = yeniBaslangic;
            teklif.EndDate = yeniBaslangic.AddDays(orijinalSureGun);
            teklif.Status = "Aktif Poliçe";
            await _context.SaveChangesAsync();
            return Ok("Ödeme başarıyla alındı ve poliçe artık kullanılabilir.");
        }

        // musteri teklifin odemesini yapar
        [Authorize]
        [HttpPost("{id}/odeme-tamamla")]
        public async Task<IActionResult> OdemeTamamla(int id, OdemeDto dto)
        {

            var teklif = await _context.Policies.FindAsync(id);
            if (teklif == null || !teklif.IsActive)
                return NotFound("Teklif bulunamadı veya iptal edilmiş.");

            var girisYapanMusteriId = MevcutMusteriId();
            if (girisYapanMusteriId == null || girisYapanMusteriId != teklif.CustomerId)
                return Forbid();

            if (teklif.Status != "Teklif Bekliyor")
                return BadRequest("Sadece 'Teklif Bekliyor' durumundaki kayıtlar ödenebilir.");

            // payment service'e yolla
            var sonuc = await _paymentService.OdemeyiIsleAsync(dto, teklif.Price);

            // payment kaydı olustu
            var paymentKaydi = new Payment
            {
                PolicyId = teklif.Id,
                Tutar = teklif.Price,
                IslemTarihi = DateTime.UtcNow,
                KartSon4 = sonuc.KartSon4,
                KartSahibi = dto.KartSahibi.Trim(),
                Durum = sonuc.Durum,
                HataMesaji = sonuc.HataMesaji,
                IslemReferansi = sonuc.IslemReferansi
            };
            _context.Payments.Add(paymentKaydi);

            // odeme basariliysa police olustu
            if (sonuc.Basarili)
            {
                
                // kullanıcı teklif olusturdugunda henüz police yürürlüge girmediği icin policenin baslangic tarihi odeme tarihi olarak belirlenir
                // tabii eger ileri bir tarih icin alınmadıysa
                var orijinalSureGun = (teklif.EndDate - teklif.StartDate).Days;
                var yeniBaslangic = DateTime.UtcNow;
                teklif.StartDate = yeniBaslangic;
                teklif.EndDate = yeniBaslangic.AddDays(orijinalSureGun);
                teklif.Status = "Aktif Poliçe";
                await _context.SaveChangesAsync();

                // police aktif bildirimi
                await _notificationService.OlusturAsync(
                    customerId: teklif.CustomerId,
                    tip: "Police",
                    baslik: "Poliçeniz aktif",
                    mesaj: $"{teklif.PolicyNumber} numaralı poliçeniz {teklif.EndDate:dd.MM.yyyy} tarihine kadar yürürlüktedir. PDF belgesini indirebilir, hasar bildiriminde bulunabilirsiniz.",
                    linkUrl: $"/dashboard/policeler/{teklif.Id}",
                    iconKey: "shield-check");

                return Ok(new
                {
                    Mesaj = "Ödemeniz başarıyla alındı, poliçeniz artık aktif.",
                    PolicyId = teklif.Id,
                    Tutar = teklif.Price,
                    KartSon4 = sonuc.KartSon4,
                    IslemReferansi = sonuc.IslemReferansi,
                    YeniBaslangic = teklif.StartDate,
                    YeniBitis = teklif.EndDate
                });
            }

            // basarısız olsa bile payment kaydı olusur ama basarisiz olarak
            await _context.SaveChangesAsync();
            return BadRequest(new
            {
                Mesaj = sonuc.HataMesaji ?? "Ödeme reddedildi.",
                Durum = sonuc.Durum,
                IslemReferansi = sonuc.IslemReferansi
            });
        }

        [Authorize]
        [HttpPut("{id}/teklif-guncelle")]
        public async Task<IActionResult> TeklifGuncelle(int id, TeklifGuncelleDto dto)
        {
            // mevcut teklifi teminatları ile birlikte cek
            var mevcutTeklif = await _context.Policies
                .Include(p => p.PolicyCoverages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (mevcutTeklif == null || mevcutTeklif.IsActive == false)
                return NotFound("Güncellenmek istenen teklif bulunamadı veya iptal edilmiş.");

            if (mevcutTeklif.Status != "Teklif Bekliyor")
                return BadRequest("Sadece 'Teklif Bekliyor' durumundaki kayıtlar güncellenebilir.");

            var girisYapanMusteriId = MevcutMusteriId();
            var rol = User.FindFirst(ClaimTypes.Role)?.Value;
            if (rol != "Admin" && girisYapanMusteriId != mevcutTeklif.CustomerId)
                return Forbid();

            // yeni ürün ve teminatları cek
            var yeniUrun = await _context.Products
                .Include(u => u.Coverages)
                .FirstOrDefaultAsync(u => u.Id == dto.ProductId);
            if (yeniUrun == null)
                return NotFound("Seçmek istediğiniz yeni sigorta ürünü sistemde bulunamadı.");

            var urunTeminatlari = yeniUrun.Coverages ?? new List<Coverage>();
            var urunTeminatIdSet = urunTeminatlari.Select(c => c.Id).ToHashSet();
            var gonderilenSet = dto.SelectedCoverageIds.ToHashSet();

            var yabanci = gonderilenSet.Except(urunTeminatIdSet).ToList();
            if (yabanci.Count > 0)
                return BadRequest($"Geçersiz teminat ID'leri: {string.Join(", ", yabanci)}.");

            var zorunluIdler = urunTeminatlari.Where(c => c.IsRequired).Select(c => c.Id).ToList();
            var eksikZorunlular = zorunluIdler.Except(gonderilenSet).ToList();
            if (eksikZorunlular.Count > 0)
                return BadRequest("Bu ürünün zorunlu teminatları seçilmek zorunda.");

            // insurtech ile primi yeniden hesaplıyoruz
            var secilenTeminatlar = urunTeminatlari.Where(c => gonderilenSet.Contains(c.Id)).ToList();
            var riskDict = dto.RiskParameters ?? new Dictionary<string, string>();
            var strategy = SecStrategy(yeniUrun.ProductCode);
            var fiyatSonuc = strategy.Hesapla(yeniUrun, secilenTeminatlar, riskDict);

            string? riskDataJson = null;
            if (dto.RiskParameters != null && dto.RiskParameters.Count > 0)
            {
                riskDataJson = JsonSerializer.Serialize(dto.RiskParameters,
                    new JsonSerializerOptions
                    {
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                    });
            }

            // eski teminat secimlerini silip yenisini ekliyoruz
            if (mevcutTeklif.PolicyCoverages != null && mevcutTeklif.PolicyCoverages.Count > 0)
                _context.PolicyCoverages.RemoveRange(mevcutTeklif.PolicyCoverages);

            mevcutTeklif.ProductId    = dto.ProductId;
            mevcutTeklif.Price        = fiyatSonuc.Total;
            mevcutTeklif.StartDate    = dto.StartDate;
            mevcutTeklif.EndDate      = dto.EndDate;
            mevcutTeklif.RiskDataJson = riskDataJson;   // eskisinin uzerine yeni snapshot
            mevcutTeklif.PolicyCoverages = secilenTeminatlar
                .Select(c => new PolicyCoverage { PolicyId = mevcutTeklif.Id, CoverageId = c.Id })
                .ToList();

            await _context.SaveChangesAsync();
            return Ok(new
            {
                Mesaj = "Teklifiniz başarıyla güncellendi ve fiyat yeniden hesaplandı!",
                YeniFiyat = fiyatSonuc.Total,
                BazFiyat = yeniUrun.Price,
                TeminatlarToplami = fiyatSonuc.CoverageTotal,
                RiskCarpani = fiyatSonuc.RiskMultiplier,
                Vergi = fiyatSonuc.Tax,
                Breakdown = fiyatSonuc.Breakdown,
                GuncelUrunId = mevcutTeklif.ProductId
            });
        }

        // cookie'den giris yapan müsterinin id'sini cekmek icin - loginde MusteriId custom claimi tokena yazılıyor
        private int? MevcutMusteriId()
        {
            var s = User.FindFirst("MusteriId")?.Value;
            return int.TryParse(s, out var id) ? id : null;
        }


        [Authorize]
        [HttpGet("musterinin-policelerini-getir/{musteriId}")]
        public async Task<IActionResult> MusterininPoliceleriniGetir(int musteriId)
        {

            var policeler = await _context.Policies
                .Include(p => p.Product)
                .Include(p => p.InsuredPerson)   
                .Include(p => p.PolicyCoverages!)
                    .ThenInclude(pc => pc.Coverage)
                .Where(p => p.CustomerId == musteriId && p.IsActive == true)
                .ToListAsync();

            if (policeler.Count == 0)
                return Ok(new { Mesaj = "Henüz aktif bir poliçeniz bulunmuyor.", Policeler = policeler });

            return Ok(policeler);
        }

        [Authorize]
        [HttpGet("police-detaylarini-getir/{id}")]
        public async Task<IActionResult> PoliceDetaylariniGetir(int id)
        {
            
            var police = await _context.Policies
                .Include(p => p.Customer)
                .Include(p => p.InsuredPerson)   
                .Include(p => p.Product)
                    .ThenInclude(u => u!.Coverages)
                .Include(p => p.PolicyCoverages!)
                    .ThenInclude(pc => pc.Coverage)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (police == null)
                return NotFound("Bu numaraya ait bir poliçe bulunamadı.");

            return Ok(police);
        }

        // policenin ödeme gecmisini gösteriyoruz
        [Authorize]
        [HttpGet("{id}/odemeler")]
        public async Task<IActionResult> PoliceOdemeleri(int id)
        {
            var police = await _context.Policies.FindAsync(id);
            if (police == null || !police.IsActive)
                return NotFound("Poliçe bulunamadı.");

            var girisYapanMusteriId = MevcutMusteriId();
            var rol = User.FindFirst(ClaimTypes.Role)?.Value;
            if (rol != "Admin" && girisYapanMusteriId != police.CustomerId)
                return Forbid();

            var odemeler = await _context.Payments
                .Where(p => p.PolicyId == id)
                .OrderByDescending(p => p.IslemTarihi)
                .Select(p => new
                {
                    p.Id,
                    p.Tutar,
                    p.IslemTarihi,
                    p.KartSon4,
                    p.KartSahibi,
                    p.Durum,
                    p.HataMesaji,
                    p.IslemReferansi
                })
                .ToListAsync();

            return Ok(odemeler);
        }

        // questpdf kullanarak kullanıcının police detaylarını pdf olarak kaydetmesini saglıyoruz
        [Authorize]
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> PolicePdfIndir(int id)
        {
            // tüm bilgileri cekiyoruz
            var police = await _context.Policies
                .Include(p => p.Customer)
                .Include(p => p.InsuredPerson)
                .Include(p => p.Product)
                .Include(p => p.PolicyCoverages!)
                    .ThenInclude(pc => pc.Coverage)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (police == null || !police.IsActive)
                return NotFound("Poliçe bulunamadı.");

            // kendi policesi olup olmadıgını kontrol eddiyoruz (admin degilse)
            var girisYapanMusteriId = MevcutMusteriId();
            var rol = User.FindFirst(ClaimTypes.Role)?.Value;
            if (rol != "Admin" && girisYapanMusteriId != police.CustomerId)
                return Forbid();

            // sadece aktif poliçeler için pdf olusturuyoz teklif asamasındakilerle isimiz yok 
            if (police.Status != "Aktif Poliçe" && rol != "Admin")
                return BadRequest("Sadece aktif poliçeler için belge indirilebilir.");

            var pdfBytes = _pdfService.PoliceUret(police);

            var dosyaAdi = $"police_{police.PolicyNumber}.pdf";
            return File(pdfBytes, "application/pdf", dosyaAdi);
        }

        // questpdf'le makbuz oluşturuyoruz sadece basarılı ödeme icin makbuz olusturuyor ama basarısız denemeleri de görebiliyoruz
        [Authorize]
        [HttpGet("{policyId}/odeme/{paymentId}/makbuz")]
        public async Task<IActionResult> OdemeMakbuzIndir(int policyId, int paymentId)
        {
            var police = await _context.Policies
                .Include(p => p.Customer)
                .Include(p => p.Product)
                .FirstOrDefaultAsync(p => p.Id == policyId);

            if (police == null || !police.IsActive)
                return NotFound("Poliçe bulunamadı.");

            var girisYapanMusteriId = MevcutMusteriId();
            var rol = User.FindFirst(ClaimTypes.Role)?.Value;
            if (rol != "Admin" && girisYapanMusteriId != police.CustomerId)
                return Forbid();

            var odeme = await _context.Payments
                .FirstOrDefaultAsync(pm => pm.Id == paymentId && pm.PolicyId == policyId);
            if (odeme == null)
                return NotFound("Ödeme kaydı bulunamadı.");

            var pdfBytes = _pdfService.MakbuzUret(odeme, police);
            var dosyaAdi = $"makbuz_{odeme.IslemReferansi}.pdf";
            return File(pdfBytes, "application/pdf", dosyaAdi);
        }

        // teklif iptal etme endpointi
        [Authorize]
        [HttpDelete("{id}/teklifimi-iptal-et")]
        public async Task<IActionResult> TeklifimiIptalEt(int id)
        {
            var teklif = await _context.Policies.FindAsync(id);
            if (teklif == null || teklif.IsActive == false)
                return NotFound("Böyle bir teklif bulunamadı veya zaten iptal edilmiş.");

            // sadece teklif sahibi yapabilir (admin için ayrı endpoint var)
            var girisYapanMusteriId = MevcutMusteriId();
            if (girisYapanMusteriId == null || girisYapanMusteriId != teklif.CustomerId)
                return Forbid();

            // burda durum kontrolü yapıyoruz aktif poliçeye dokunamaz
            if (teklif.Status != "Teklif Bekliyor")
                return BadRequest("Sadece henüz onaylanmamış teklifler iptal edilebilir. Aktif poliçeler için lütfen müşteri hizmetlerine başvurun.");

            teklif.IsActive = false;
            teklif.Status = "Teklif İptal Edildi";
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Teklifiniz başarıyla iptal edildi." });
        }

        // kullanınıcının yakınlarını listeler. teklif olustururken halihazırda olan yakinları göstermek icin lazım
        [Authorize]
        [HttpGet("yakinlarim")]
        public async Task<IActionResult> Yakinlarim()
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var yakinlar = await _context.InsuredPersons
                .Where(ip => ip.CustomerId == musteriId.Value && ip.IsActive)
                .OrderBy(ip => ip.Yakinlik == "Kendisi" ? 0 : 1)  // Kendisi en üstte
                .ThenBy(ip => ip.AdSoyad)
                .ToListAsync();

            return Ok(yakinlar);
        }

        // Yeni yakın ekleme metodu (police olusturmadan once) 
        [Authorize]
        [HttpPost("yakin-ekle")]
        public async Task<IActionResult> YakinEkle(InsuredPersonOlusturDto dto)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var (yeniId, hata) = await SigortaliKisiResolve(musteriId.Value, null, dto);
            if (hata != null) return BadRequest(hata);

            var yakin = await _context.InsuredPersons.FindAsync(yeniId);
            return Ok(yakin);
        }

        //  IsActive=false ile soft delete yaparak yakınları siliyoruz, gecmis policelerde referansı oldugu icin tam silinmemesi lazim vs.
        [Authorize]
        [HttpDelete("yakin/{id}")]
        public async Task<IActionResult> YakinSil(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var yakin = await _context.InsuredPersons.FindAsync(id);
            if (yakin == null || !yakin.IsActive)
                return NotFound("Yakın bulunamadı veya zaten silinmiş.");
            if (yakin.CustomerId != musteriId.Value)
                return Forbid();

            // aktif poliçesi varsa silme — kullanıcının önce policeyi iptal etmesi lazım
            var aktifPolice = await _context.Policies.AnyAsync(
                p => p.InsuredPersonId == id && p.IsActive);
            if (aktifPolice)
                return BadRequest("Bu kişi için aktif bir poliçe var. Önce poliçeyi iptal edin.");

            yakin.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = "Yakın listenizden kaldırıldı." });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("teklif-police-iptal-et/{id}")]
        public async Task<IActionResult> TeklifVeyaPoliceIptalEt(int id)
        {
            var kayit = await _context.Policies.FindAsync(id);

            if (kayit == null || kayit.IsActive == false)
                return NotFound("Böyle bir kayıt bulunamadı veya zaten iptal edilmiş.");

            kayit.IsActive = false;

            if (kayit.Status == "Teklif Bekliyor")
                kayit.Status = "Teklif İptal Edildi";
            else if (kayit.Status == "Aktif Poliçe")
                kayit.Status = "Poliçe İptal Edildi";

            await _context.SaveChangesAsync();
            return Ok(kayit.Status);
        }
    }
}