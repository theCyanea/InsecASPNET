using InsecASPNET.Data;
using InsecASPNET.Entities;

namespace InsecASPNET.Services.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly InsecDbContext _context;

        public NotificationService(InsecDbContext context)
        {
            _context = context;
        }

        public async Task OlusturAsync(
            int customerId,
            string tip,
            string baslik,
            string mesaj,
            string? linkUrl = null,
            string? iconKey = null)
        {
            if (baslik.Length > 200) baslik = baslik[..200];
            if (mesaj.Length > 500) mesaj = mesaj[..500];

            var bildirim = new Notification
            {
                CustomerId = customerId,
                Tip = tip,
                Baslik = baslik,
                Mesaj = mesaj,
                LinkUrl = linkUrl,
                IconKey = iconKey,
                Okundu = false,
                CreatedAt = DateTime.UtcNow,
            };

            _context.Notifications.Add(bildirim);
            await _context.SaveChangesAsync();
        }
    }
}
