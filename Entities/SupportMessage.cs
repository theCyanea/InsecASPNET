namespace InsecASPNET.Entities
{
    public class SupportMessage
    {
        public int Id { get; set; }

        public int SupportTicketId { get; set; }
        public SupportTicket? SupportTicket { get; set; }

        public required string Gonderen { get; set; }

        public required string Mesaj { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
