namespace InsecASPNET.Entities
{

    public class Notification
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public required string Tip { get; set; }

        public required string Baslik { get; set; }

        public required string Mesaj { get; set; }

        public bool Okundu { get; set; } = false;

        public string? LinkUrl { get; set; }

        public string? IconKey { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
