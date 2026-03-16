using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsRefrigeratedToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRefrigerated",
                table: "Orders",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRefrigerated",
                table: "Orders");
        }
    }
}
