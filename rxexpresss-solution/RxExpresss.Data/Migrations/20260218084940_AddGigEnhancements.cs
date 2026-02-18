using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGigEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAutoCreated",
                table: "RoutePlans",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ServiceZoneId",
                table: "RoutePlans",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoutePlanId",
                table: "Orders",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoutePlans_ServiceZoneId",
                table: "RoutePlans",
                column: "ServiceZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_RoutePlans_ServiceZones_ServiceZoneId",
                table: "RoutePlans",
                column: "ServiceZoneId",
                principalTable: "ServiceZones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoutePlans_ServiceZones_ServiceZoneId",
                table: "RoutePlans");

            migrationBuilder.DropIndex(
                name: "IX_RoutePlans_ServiceZoneId",
                table: "RoutePlans");

            migrationBuilder.DropColumn(
                name: "IsAutoCreated",
                table: "RoutePlans");

            migrationBuilder.DropColumn(
                name: "ServiceZoneId",
                table: "RoutePlans");

            migrationBuilder.DropColumn(
                name: "RoutePlanId",
                table: "Orders");
        }
    }
}
