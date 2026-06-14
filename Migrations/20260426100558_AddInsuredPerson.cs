using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InsecASPNET.Migrations
{
    /// <inheritdoc />
    public partial class AddInsuredPerson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InsuredPersonId",
                table: "Policies",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "InsuredPersons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AdSoyad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TcKimlikNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DogumTarihi = table.Column<DateOnly>(type: "date", nullable: false),
                    Yakinlik = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Telefon = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InsuredPersons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InsuredPersons_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Policies_InsuredPersonId",
                table: "Policies",
                column: "InsuredPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuredPersons_CustomerId",
                table: "InsuredPersons",
                column: "CustomerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Policies_InsuredPersons_InsuredPersonId",
                table: "Policies",
                column: "InsuredPersonId",
                principalTable: "InsuredPersons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Policies_InsuredPersons_InsuredPersonId",
                table: "Policies");

            migrationBuilder.DropTable(
                name: "InsuredPersons");

            migrationBuilder.DropIndex(
                name: "IX_Policies_InsuredPersonId",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "InsuredPersonId",
                table: "Policies");
        }
    }
}
