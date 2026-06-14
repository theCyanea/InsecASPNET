namespace InsecASPNET.Entities
{
    public class Customer
    {
        public int Id { get; set; }
        public required string Adi { get; set; }
        public required string Soyadi { get; set; }
        public required string KimlikNo { get; set; }
        public required string TelefonNo { get; set; }
        public required DateOnly DogumTarihi { get; set; }
        // DateTime kullanmadık çünkü saat almak istemiyoruz
        // müşterilerin doğum saatiyle işimiz yok
        public required string Email { get; set; }
        public required string Sifre { get; set; }
        public string Rol {  get; set; } = "Müşteri";
        public bool IsActive { get; set; } = true;

        public string? AvatarUrl { get; set; }

        // required yerine new list policy diyoruz cünkü yeni gelen
        // bir müsterinin policesi yoktur zorunluluk olamaz
        public ICollection<Policy> Policies { get; set; } = new List<Policy>();

    }
           
    }
