import uuid
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import Building, ComplianceReport
from app.schemas.admin import ComplianceReportRequest, ComplianceReportResponse, ComplianceReportStatusResponse
from app.services.admin import get_analytics
from app.services.storage import storage_path


def _naive_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=None) if value.tzinfo else value


def create_report(db: Session, body: ComplianceReportRequest, now: datetime | None = None) -> ComplianceReportResponse:
    now = now or utc_now()
    period_from, period_to = _naive_utc(body.period_from), _naive_utc(body.period_to)
    if period_from >= period_to or period_to > now.replace(microsecond=999999):
        raise ApiException(422, "VALIDATION_ERROR", "Periode compliance report tidak valid.")
    building = db.get(Building, settings.demo_building_id)
    if building is None:
        raise ApiException(503, "BUILDING_NOT_CONFIGURED", "Demo building belum dikonfigurasi.")

    report_id = str(uuid.uuid4())
    path = storage_path("reports", f"{report_id}.pdf")
    report = ComplianceReport(
        id=report_id,
        building_id=settings.demo_building_id,
        period_from=period_from,
        period_to=period_to,
        status="pending",
        file_url=f"/api/admin/compliance-reports/{report_id}/download",
        generated_at=now,
    )
    db.add(report)
    db.flush()
    try:
        analytics = get_analytics(db, period_from, period_to)
        _render_pdf(path, building.name, period_from, period_to, analytics, now)
        report.status = "ready"
        db.commit()
    except Exception:
        report.status = "failed"
        report.file_url = None
        report.error_message = "PDF generation failed"
        db.commit()
        raise ApiException(500, "PDF_GENERATION_FAILED", "Compliance report gagal dibuat.")
    return ComplianceReportResponse(report_id=report_id, status="ready")


def _table_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A2947")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F3E4C9")),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#0A2947")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#8B5E3C")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])


def _render_pdf(path: Path, building_name: str, period_from, period_to, analytics, generated_at) -> None:
    document = SimpleDocTemplate(
        str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title="3MINUTES Compliance Report", author="3MINUTES",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle", parent=styles["Title"], textColor=colors.HexColor("#0A2947"),
        alignment=TA_CENTER, spaceAfter=12,
    )
    story = [
        Paragraph("3MINUTES Safety Compliance Report", title_style),
        Paragraph(f"<b>Building:</b> {building_name}", styles["BodyText"]),
        Paragraph(f"<b>Period:</b> {period_from:%d %b %Y} - {period_to:%d %b %Y}", styles["BodyText"]),
        Paragraph(f"<b>Generated:</b> {generated_at:%d %b %Y %H:%M UTC}", styles["BodyText"]),
        Spacer(1, 8 * mm),
    ]
    summary = Table([
        ["Metric", "Value"],
        ["Participation", f"{analytics.participation_rate_percentage:.1f}%"],
        ["Average time to shelter", f"{analytics.average_shelter_time_ms / 1000:.1f} seconds"],
        ["Tracked locations", str(len(analytics.heatmap_cells))],
    ], colWidths=[90 * mm, 70 * mm])
    summary.setStyle(_table_style())
    story.extend([Paragraph("Summary", styles["Heading2"]), summary, Spacer(1, 7 * mm)])

    trend_data = [["Period", "Average evacuation"]] + [
        [item["period"], f'{item["averageEvacuationTimeMs"] / 1000:.1f} seconds']
        for item in analytics.escape_route_trends
    ]
    if len(trend_data) == 1:
        trend_data.append(["No completed drill", "-"])
    trend_table = Table(trend_data, colWidths=[80 * mm, 80 * mm])
    trend_table.setStyle(_table_style())
    story.extend([Paragraph("Evacuation Trend", styles["Heading2"]), trend_table, Spacer(1, 7 * mm)])

    heatmap_data = [["Location", "Failure", "Average evacuation", "Samples"]] + [
        [cell.location_ref, f"{cell.failure_rate_percentage:.1f}%",
         f"{cell.average_evacuation_time_ms / 1000:.1f}s", str(cell.sample_count)]
        for cell in analytics.heatmap_cells
    ]
    if len(heatmap_data) == 1:
        heatmap_data.append(["No location data", "-", "-", "0"])
    heatmap_table = Table(heatmap_data, colWidths=[60 * mm, 30 * mm, 45 * mm, 25 * mm])
    heatmap_table.setStyle(_table_style())
    story.extend([Paragraph("Location Safety Matrix", styles["Heading2"]), heatmap_table])
    document.build(story)


def get_report(db: Session, report_id: str) -> ComplianceReportStatusResponse:
    item = db.scalar(select(ComplianceReport).where(
        ComplianceReport.id == report_id,
        ComplianceReport.building_id == settings.demo_building_id,
    ))
    if item is None:
        raise ApiException(404, "REPORT_NOT_FOUND", "Compliance report tidak ditemukan.")
    return ComplianceReportStatusResponse(
        report_id=item.id, status=item.status,
        download_url=item.file_url if item.status == "ready" else None,
        generated_at=item.generated_at,
    )


def report_file(db: Session, report_id: str) -> Path:
    item = db.scalar(select(ComplianceReport).where(
        ComplianceReport.id == report_id,
        ComplianceReport.building_id == settings.demo_building_id,
        ComplianceReport.status == "ready",
    ))
    path = storage_path("reports", f"{report_id}.pdf")
    if item is None or not path.exists():
        raise ApiException(404, "REPORT_NOT_FOUND", "Compliance report belum tersedia.")
    return path
