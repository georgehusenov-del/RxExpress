using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverLocationTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CurrentHeading",
                table: "Drivers",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CurrentSpeed",
                table: "Drivers",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLocationUpdate",
                table: "Drivers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DriverLocationLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DriverId = table.Column<int>(type: "INTEGER", nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: false),
                    Longitude = table.Column<double>(type: "REAL", nullable: false),
                    Speed = table.Column<double>(type: "REAL", nullable: true),
                    Heading = table.Column<double>(type: "REAL", nullable: true),
                    Accuracy = table.Column<double>(type: "REAL", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverLocationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverLocationLogs_Drivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DriverLocationLogs_DriverId",
                table: "DriverLocationLogs",
                column: "DriverId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverLocationLogs");

            migrationBuilder.DropColumn(
                name: "CurrentHeading",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "CurrentSpeed",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "LastLocationUpdate",
                table: "Drivers");
        }
    }
}
