namespace InsecASPNET.Entities
{

    public class InsuredPerson
    {
        public int Id { get; set; }
        public required string AdSoyad { get; set; }

        public required string TcKimlikNo { get; set; }

        public DateOnly DogumTarihi { get; set; }

        public string Yakinlik { get; set; } = "Kendisi";

        public string? Telefon { get; set; }

        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public bool IsActive { get; set; } = true;

        public ICollection<Policy> Policies { get; set; } = new List<Policy>();
    }
}
