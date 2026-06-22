using InsecASPNET.Entities;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Data
{
    public class InsecDbContext : DbContext
    {
        // burası dışarıdan ayar alabilmemizi saglıyo
        public InsecDbContext(DbContextOptions<InsecDbContext> options) : base(options)
        {
        }

        // hangi classların veritabanında tablo olacagını belirliyoruz
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Policy> Policies { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Coverage> Coverages { get; set; }
        public DbSet<PolicyCoverage> PolicyCoverages { get; set; }  
        public DbSet<Claim> Claims { get; set; }
        public DbSet<ClaimImage> ClaimImages { get; set; }
        public DbSet<InsuredPerson> InsuredPersons { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<SupportMessage> SupportMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PolicyCoverage>()
                .HasOne(pc => pc.Coverage)
                .WithMany()
                .HasForeignKey(pc => pc.CoverageId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PolicyCoverage>()
                .HasOne(pc => pc.Policy)
                .WithMany(p => p.PolicyCoverages)
                .HasForeignKey(pc => pc.PolicyId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InsuredPerson>()
                .HasOne(ip => ip.Customer)
                .WithMany()
                .HasForeignKey(ip => ip.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Policy>()
                .HasOne(p => p.InsuredPerson)
                .WithMany(ip => ip.Policies)
                .HasForeignKey(p => p.InsuredPersonId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(pm => pm.Policy)
                .WithMany()
                .HasForeignKey(pm => pm.PolicyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Customer)
                .WithMany()
                .HasForeignKey(n => n.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SupportTicket>()
                .HasOne(t => t.Customer)
                .WithMany()
                .HasForeignKey(t => t.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SupportMessage>()
                .HasOne(m => m.SupportTicket)
                .WithMany(t => t.Messages)
                .HasForeignKey(m => m.SupportTicketId)
                .OnDelete(DeleteBehavior.Cascade);

            base.OnModelCreating(modelBuilder);
        }
    }
}