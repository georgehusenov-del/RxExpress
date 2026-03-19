using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiplePodPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhotoAddressUrl",
                table: "Orders",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoHomeUrl",
                table: "Orders",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoPackageUrl",
                table: "Orders",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoAddressUrl",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PhotoHomeUrl",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PhotoPackageUrl",
                table: "Orders");
        }
    }
}
