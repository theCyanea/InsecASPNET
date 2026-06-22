namespace InsecASPNET.Entities
{
    public class SupportTicket
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public required string Konu { get; set; }

        public required string IlkMesaj { get; set; }

        public string Durum { get; set; } = "Acik";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SonYanitTarihi { get; set; }

        public bool IsActive { get; set; } = true;

        public List<SupportMessage> Messages { get; set; } = new();
    }
}
