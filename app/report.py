from __future__ import annotations

import io
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.platypus import Image as RLImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.config import HEATMAP_DIR, STATIC_DIR, UPLOAD_DIR
from app.models import Scan, User
from app.schemas import CLASSES


def _build_logo() -> Drawing:
    logo = Drawing(42, 42)
    logo.add(Rect(0, 0, 42, 42, rx=8, ry=8, fillColor=colors.HexColor("#0f766e"), strokeColor=colors.HexColor("#0f766e")))
    logo.add(String(10, 12, "BT", fontSize=16, fillColor=colors.white, fontName="Helvetica-Bold"))
    return logo


def _bar_chart_png(probabilities: list[float]) -> bytes:
    fig, ax = plt.subplots(figsize=(5.6, 2.2), dpi=180)
    bars = ax.bar(CLASSES, probabilities, color=["#0f766e", "#2563eb", "#f97316", "#7c3aed"], edgecolor="#0f172a")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Probability")
    ax.grid(axis="y", alpha=0.2)
    for bar, value in zip(bars, probabilities):
        ax.text(bar.get_x() + bar.get_width() / 2, value + 0.02, f"{value:.2f}", ha="center", va="bottom", fontsize=8)
    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buffer.seek(0)
    return buffer.read()


def _to_rl_image(path: Path, width: float) -> RLImage:
    image = Image.open(path)
    aspect = image.height / image.width
    return RLImage(str(path), width=width, height=width * aspect)


def _resolve_original_path(scan: Scan) -> Path:
    heatmap_name = Path(scan.heatmap_path).name
    return UPLOAD_DIR / heatmap_name


def build_scan_report_pdf(
    *,
    user: User,
    scan: Scan,
    probabilities: list[float],
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=40,
        bottomMargin=42,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22, alignment=TA_CENTER, textColor=colors.HexColor("#0f172a")))
    styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=colors.HexColor("#0f766e")))
    styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=11, textColor=colors.HexColor("#334155")))
    styles.add(ParagraphStyle(name="Disclaimer", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=8, leading=10, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER))

    original_path = _resolve_original_path(scan)
    heatmap_path = STATIC_DIR / "heatmaps" / Path(scan.heatmap_path).name
    chart_bytes = _bar_chart_png(probabilities)

    story = []

    header_table = Table(
        [[_build_logo(), Paragraph("Brain Tumor MRI Report", styles["ReportTitle"])]],
        colWidths=[0.8 * inch, 6.0 * inch],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]),
    )
    story.append(header_table)
    story.append(Spacer(1, 0.12 * inch))

    patient_rows = [
        [Paragraph("Patient", styles["Section"]), Paragraph(user.name, styles["BodySmall"])],
        [Paragraph("Email", styles["Section"]), Paragraph(user.email, styles["BodySmall"])],
        [Paragraph("Role", styles["Section"]), Paragraph(user.role, styles["BodySmall"])],
        [Paragraph("Scan time", styles["Section"]), Paragraph(scan.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"), styles["BodySmall"])],
        [Paragraph("File", styles["Section"]), Paragraph(scan.filename, styles["BodySmall"])],
    ]
    patient_table = Table(patient_rows, colWidths=[1.2 * inch, 5.4 * inch])
    patient_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#ecfeff")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#0f766e")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.16 * inch))

    pred_box = Table(
        [[Paragraph(f"Predicted class: <b>{scan.predicted_class}</b>", styles["BodySmall"]), Paragraph(f"Confidence: <b>{scan.confidence:.2%}</b>", styles["BodySmall"]) ]],
        colWidths=[3.1 * inch, 3.5 * inch],
    )
    pred_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0f172a")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(pred_box)
    story.append(Spacer(1, 0.16 * inch))

    image_table = Table(
        [
            [
                Paragraph("Original MRI", styles["Section"]),
                Paragraph("Grad-CAM Heatmap", styles["Section"]),
            ],
            [
                _to_rl_image(original_path, 2.85 * inch) if original_path.exists() else Paragraph("Original image unavailable", styles["BodySmall"]),
                _to_rl_image(heatmap_path, 2.85 * inch) if heatmap_path.exists() else Paragraph("Heatmap unavailable", styles["BodySmall"]),
            ],
        ],
        colWidths=[3.0 * inch, 3.0 * inch],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )
    story.append(image_table)
    story.append(Spacer(1, 0.16 * inch))

    chart_table = Table(
        [[Paragraph("Class probability distribution", styles["Section"]), ""], [RLImage(io.BytesIO(chart_bytes), width=6.0 * inch, height=2.4 * inch), ""]],
        colWidths=[6.0 * inch, 0.0],
        style=TableStyle([
            ("SPAN", (0, 0), (1, 0)),
            ("SPAN", (0, 1), (1, 1)),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )
    story.append(chart_table)
    story.append(Spacer(1, 0.12 * inch))
    story.append(
        Paragraph(
            "Medical disclaimer: This report is intended for informational support only and does not replace review by a qualified clinician.",
            styles["Disclaimer"],
        )
    )

    def draw_frame(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#0f766e"))
        canvas.rect(0, letter[1] - 20, letter[0], 20, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawRightString(letter[0] - 36, letter[1] - 14, "Clinical Decision Support")
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(letter[0] / 2, 20, "AI-assisted report. Review with radiology and oncology specialists before clinical use.")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_frame, onLaterPages=draw_frame)
    buffer.seek(0)
    return buffer.read()