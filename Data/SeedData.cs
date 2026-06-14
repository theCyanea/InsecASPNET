using InsecASPNET.Entities;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Data
{

    public static class SeedData
    {

        private static readonly string[] LegacySeedAdlari =
        {
            "Sağlık Sigortası",
            "Ferdi Kaza Sigortası",
        };

        public static void Initialize(InsecDbContext context)
        {
            context.Database.EnsureCreated();

            // eski tohumları temizle
            var temizlenecekler = context.Products
                .Where(p => LegacySeedAdlari.Contains(p.ProductName))
                .ToList();
            if (temizlenecekler.Count > 0)
            {
                context.Products.RemoveRange(temizlenecekler);
            }

            var tohumUrunler = new List<Product>
            {
                new Product
                {
                    ProductName = "Tamamlayıcı Sağlık Sigortası",
                    ProductDescription = "SGK'nın karşılamadığı özel hastane fark ücretlerini ve hizmet kalitesini güvence altına alır.",
                    Price = 2500m,
                    DisplayOrder = 1,
                    CanCustomStartDate = true,
                    AllowedDurationsDays = "365",
                    ProductCode = "SAGLIK",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Yatarak tedavi (özel hastane farkı)", CoveragePrice = 1200m, IsRequired = true  },
                        new Coverage { CoverageName = "Ayakta tedavi",                       CoveragePrice = 600m,  IsRequired = true  },
                        new Coverage { CoverageName = "Tanı ve görüntüleme",                 CoveragePrice = 400m,  IsRequired = false },
                        new Coverage { CoverageName = "İlaç katkı payı",                     CoveragePrice = 300m,  IsRequired = false }
                    }
                },

                new Product
                {
                    ProductName = "DASK",
                    ProductDescription = "Zorunlu Deprem Sigortası — meskenler için yasal zorunluluk. Devlet kontrolünde standart fiyatlandırma.",
                    Price = 350m,
                    DisplayOrder = 2,
                    CanCustomStartDate = false,
                    AllowedDurationsDays = "365", 
                    ProductCode = "DASK",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Deprem ve deprem kaynaklı yangın", CoveragePrice = 200m, IsRequired = true },
                        new Coverage { CoverageName = "Deprem kaynaklı patlama",          CoveragePrice = 150m, IsRequired = true }
                    }
                },

                new Product
                {
                    ProductName = "Konut Sigortası",
                    ProductDescription = "Ev ve eşyalarınız için kapsamlı koruma — yangın, hırsızlık, sel, cam ve daha fazlası.",
                    Price = 900m,
                    DisplayOrder = 3,
                    CanCustomStartDate = true,
                    AllowedDurationsDays = "180,365",
                    ProductCode = "KONUT",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Yangın ve patlama",        CoveragePrice = 350m, IsRequired = true  },
                        new Coverage { CoverageName = "Hırsızlık",                CoveragePrice = 300m, IsRequired = true  },
                        new Coverage { CoverageName = "İç su hasarı",             CoveragePrice = 250m, IsRequired = false },
                        new Coverage { CoverageName = "Sel ve su baskını",        CoveragePrice = 280m, IsRequired = false },
                        new Coverage { CoverageName = "Cam kırılması",            CoveragePrice = 150m, IsRequired = false },
                        new Coverage { CoverageName = "Komşuluk mali sorumluluk", CoveragePrice = 200m, IsRequired = false }
                    }
                },

                new Product
                {
                    ProductName = "Kasko Sigortası",
                    ProductDescription = "Aracınız için kapsamlı koruma — çarpışma, çalınma, doğal afet, cam ve mali mesuliyet.",
                    Price = 4500m,
                    DisplayOrder = 4,
                    CanCustomStartDate = true,
                    AllowedDurationsDays = "90,180,365",
                    ProductCode = "KASKO",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Çarpışma ve devrilme",            CoveragePrice = 1500m, IsRequired = true  },
                        new Coverage { CoverageName = "Hırsızlık ve çalınma",            CoveragePrice = 1000m, IsRequired = true  },
                        new Coverage { CoverageName = "Yangın ve infilak",               CoveragePrice = 600m,  IsRequired = true  },
                        new Coverage { CoverageName = "Doğal afet (sel, dolu, fırtına)", CoveragePrice = 500m,  IsRequired = false },
                        new Coverage { CoverageName = "Cam kırılması",                   CoveragePrice = 350m,  IsRequired = false },
                        new Coverage { CoverageName = "İhtiyari mali mesuliyet",         CoveragePrice = 700m,  IsRequired = false },
                        new Coverage { CoverageName = "Yedek araç hizmeti",              CoveragePrice = 250m,  IsRequired = false }
                    }
                },

                new Product
                {
                    ProductName = "Trafik Sigortası",
                    ProductDescription = "Yasal zorunlu — üçüncü şahıslara verilen maddi ve bedeni zararları karşılar.",
                    Price = 2200m,
                    DisplayOrder = 5,
                    CanCustomStartDate = true,
                    AllowedDurationsDays = "365",
                    ProductCode = "TRAFIK",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Maddi zarar (üçüncü şahıs)",  CoveragePrice = 1100m, IsRequired = true },
                        new Coverage { CoverageName = "Bedeni zarar (üçüncü şahıs)", CoveragePrice = 1100m, IsRequired = true }
                    }
                },

                new Product
                {
                    ProductName = "Seyahat Sigortası",
                    ProductDescription = "Yurt içi ve yurt dışı seyahatlerde acil sağlık, bagaj ve uçuş güvencesi.",
                    Price = 300m,
                    DisplayOrder = 6,
                    CanCustomStartDate = true,
                    AllowedDurationsDays = "7,14,30,60",
                    ProductCode = "SEYAHAT",
                    Coverages = new List<Coverage>
                    {
                        new Coverage { CoverageName = "Acil tıbbi tedavi",       CoveragePrice = 200m, IsRequired = true  },
                        new Coverage { CoverageName = "Bagaj kaybı/gecikmesi",   CoveragePrice = 100m, IsRequired = false },
                        new Coverage { CoverageName = "Uçuş gecikmesi/iptali",   CoveragePrice = 80m,  IsRequired = false },
                        new Coverage { CoverageName = "Yurt dışı sağlık nakli",  CoveragePrice = 150m, IsRequired = false }
                    }
                }
            };

            foreach (var seed in tohumUrunler)
            {
                var mevcut = context.Products
                    .Include(p => p.Coverages)
                    .FirstOrDefault(p => p.ProductName == seed.ProductName);

                if (mevcut == null)
                {
                    context.Products.Add(seed);
                }
                else
                {
                    mevcut.DisplayOrder         = seed.DisplayOrder;
                    mevcut.CanCustomStartDate   = seed.CanCustomStartDate;
                    mevcut.AllowedDurationsDays = seed.AllowedDurationsDays;
                    mevcut.ProductCode          = seed.ProductCode;

                    foreach (var seedCov in seed.Coverages)
                    {
                        var mevcutCov = mevcut.Coverages
                            .FirstOrDefault(c => c.CoverageName == seedCov.CoverageName);

                        if (mevcutCov == null)
                        {
                            seedCov.ProductId = mevcut.Id;
                            context.Coverages.Add(seedCov);
                        }
                        else
                        {
                            mevcutCov.IsRequired = seedCov.IsRequired;
                        }
                    }
                }
            }

            context.SaveChanges();
        }
    }
}
