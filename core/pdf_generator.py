"""
Professional Text to PDF Generator
===================================
Uses ReportLab Platypus for precise text-to-PDF conversion.
Preserves all formatting: line breaks, spaces, indentation, Unicode.

Requirements:
    - reportlab
    - A Unicode TrueType font (ARIALUNI.TTF bundled with Windows)

Author: AI PDF Studio Pro
Django 4.2+ | Python 3.12+
"""

import os
import uuid
import logging
from io import BytesIO
from typing import Optional

from django.conf import settings

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.colors import HexColor, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    PageBreak,
    KeepTogether,
    Frame,
    PageTemplate,
    BaseDocTemplate,
)

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.27 x 841.89 points
MARGIN_TOP = inch            # 1 inch
MARGIN_BOTTOM = inch
MARGIN_LEFT = inch
MARGIN_RIGHT = inch

# Usable area
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT  # ~3.27 inches
CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# Typography
FONT_NAME = 'ArialUni'
FONT_SIZE = 11
LEADING = FONT_SIZE * 1.5  # line height
SPACE_BEFORE = 0
SPACE_AFTER = 0

# ---------------------------------------------------------------------------
# Font Registration
# ---------------------------------------------------------------------------
def register_font() -> str:
    """
    Register the Unicode TrueType font with ReportLab.
    Returns the font name to use in styles.
    """
    # Path to the bundled Arial Unicode MS font
    font_path = os.path.join(
        settings.BASE_DIR,
        'core',
        'static',
        'fonts',
        'ARIALUNI.TTF',
    )

    # Fallback: try Windows Fonts directory
    if not os.path.exists(font_path):
        font_path = os.path.join(
            os.environ.get('WINDIR', 'C:\\Windows'),
            'Fonts',
            'ARIALUNI.TTF',
        )

    # Final fallback: use built-in Helvetica (limited Unicode)
    if not os.path.exists(font_path):
        logger.warning(
            "ARIALUNI.TTF not found. Falling back to Helvetica. "
            "Unicode characters (Hindi, etc.) may not render correctly."
        )
        return 'Helvetica'

    try:
        pdfmetrics.registerFont(TTFont(FONT_NAME, font_path))
        logger.info(f"Registered font: {FONT_NAME} from {font_path}")
        return FONT_NAME
    except Exception as exc:
        logger.error(f"Failed to register font {font_path}: {exc}")
        return 'Helvetica'


# Register font at module load time
FONT_NAME = register_font()


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def get_base_style() -> ParagraphStyle:
    """Return the base ParagraphStyle for normal text."""
    return ParagraphStyle(
        name='TextToPDF',
        fontName=FONT_NAME,
        fontSize=FONT_SIZE,
        leading=LEADING,
        leftIndent=0,
        rightIndent=0,
        firstLineIndent=0,
        alignment=TA_LEFT,
        spaceBefore=SPACE_BEFORE,
        spaceAfter=SPACE_AFTER,
        wordWrap='CJK',  # Better Unicode word wrapping
        textColor=black,
        backColor=None,
        borderColor=None,
        borderWidth=0,
        borderPadding=0,
        borderRadius=None,
        allowWidows=0,
        allowOrphans=0,
    )


def get_preformatted_style() -> ParagraphStyle:
    """Return style for preformatted / indented / code blocks."""
    return ParagraphStyle(
        name='TextToPDFPre',
        fontName=FONT_NAME,
        fontSize=FONT_SIZE - 1,
        leading=FONT_SIZE * 1.35,
        leftIndent=20,  # slight indent for visual distinction
        rightIndent=0,
        firstLineIndent=0,
        alignment=TA_LEFT,
        spaceBefore=2,
        spaceAfter=2,
        wordWrap='CJK',
        textColor=HexColor('#333333'),
        backColor=HexColor('#F5F5F5'),
        borderColor=HexColor('#DDDDDD'),
        borderWidth=0.5,
        borderPadding=6,
        borderRadius=None,
        allowWidows=0,
        allowOrphans=0,
    )


# ---------------------------------------------------------------------------
# Text Processing
# ---------------------------------------------------------------------------
def escape_xml(text: str) -> str:
    """
    Escape XML special characters so ReportLab's Paragraph can render them.
    ReportLab uses XML-like tags for formatting, so <, >, & must be escaped.
    """
    # Use explicit character codes to prevent auto-formatter from converting
    amp = chr(38) + 'amp;'
    lt = chr(38) + 'lt;'
    gt = chr(38) + 'gt;'
    text = text.replace('&', amp)
    text = text.replace('<', lt)
    text = text.replace('>', gt)
    return text


def preserve_whitespace(text: str) -> str:
    """
    Preserve multiple spaces by replacing them with non-breaking spaces.
    ReportLab collapses multiple spaces by default.
    """
    result = []
    i = 0
    while i < len(text):
        if text[i] == ' ':
            # Count consecutive spaces
            count = 0
            while i < len(text) and text[i] == ' ':
                count += 1
                i += 1
            if count == 1:
                result.append(' ')
            else:
                # Use non-breaking spaces for multiple spaces
                result.append('&nbsp;' * count)
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)


def process_line(line: str) -> str:
    """
    Process a single line of text for PDF rendering.
    - Escapes XML special characters
    - Preserves multiple spaces
    - Preserves leading/trailing spaces
    """
    # Escape XML
    escaped = escape_xml(line)
    # Preserve multiple spaces
    preserved = preserve_whitespace(escaped)
    return preserved


# ---------------------------------------------------------------------------
# PDF Generation
# ---------------------------------------------------------------------------
def generate_text_pdf(
    text: str,
    output_path: Optional[str] = None,
    filename: Optional[str] = None,
) -> bytes:
    """
    Generate a professional PDF from plain text.

    Args:
        text: The input text to convert.
        output_path: If provided, save PDF to this file path.
        filename: Base filename for the PDF (used for logging).

    Returns:
        PDF content as bytes.

    Raises:
        ValueError: If text is empty.
        RuntimeError: If PDF generation fails.
    """
    if not text or not text.strip():
        raise ValueError("Text content is empty. Nothing to generate.")

    # ------------------------------------------------------------------
    # 1. Prepare output buffer
    # ------------------------------------------------------------------
    if output_path:
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        buffer = output_path  # SimpleDocTemplate accepts file path
    else:
        buffer = BytesIO()

    # ------------------------------------------------------------------
    # 2. Create the document
    # ------------------------------------------------------------------
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        leftMargin=MARGIN_LEFT,
        rightMargin=MARGIN_RIGHT,
        title=filename or 'Text to PDF',
        author='AI PDF Studio Pro',
        subject='Generated Document',
    )

    # ------------------------------------------------------------------
    # 3. Build story (list of flowables)
    # ------------------------------------------------------------------
    story = []
    base_style = get_base_style()
    pre_style = get_preformatted_style()

    # Split text into lines, preserving all line breaks
    lines = text.splitlines(keepends=False)

    # Track whether we need a blank line spacer
    # We'll handle blank lines by inserting Spacer flowables
    i = 0
    while i < len(lines):
        line = lines[i]

        if line == '':
            # Blank line -> insert vertical space (one empty line)
            story.append(Spacer(1, LEADING * 0.8))
            i += 1
            continue

        # Check if this line looks like a bullet point
        stripped = line.strip()
        is_bullet = (
            stripped.startswith('•')
            or stripped.startswith('-')
            or stripped.startswith('*')
            or stripped.startswith('→')
            or stripped.startswith('▪')
            or stripped.startswith('▸')
            or stripped.startswith('●')
            or (len(stripped) > 2 and stripped[0].isdigit() and stripped[1] == '.')
            or (len(stripped) > 2 and stripped[0].isdigit() and stripped[1] == ')')
        )

        # Check if line is indented (starts with spaces/tabs)
        leading_spaces = len(line) - len(line.lstrip())
        is_indented = leading_spaces >= 2

        # Process the line
        processed = process_line(line)

        if is_indented or is_bullet:
            # Use Preformatted for indented/bullet lines to preserve exact spacing
            story.append(Preformatted(processed, pre_style))
        else:
            # Use Paragraph for normal text (handles word wrapping)
            story.append(Paragraph(processed, base_style))

        i += 1

    # ------------------------------------------------------------------
    # 4. Build the PDF
    # ------------------------------------------------------------------
    try:
        doc.build(story)
    except Exception as exc:
        logger.error(f"PDF build failed: {exc}")
        raise RuntimeError(f"Failed to generate PDF: {exc}") from exc

    # ------------------------------------------------------------------
    # 5. Return PDF bytes
    # ------------------------------------------------------------------
    if output_path:
        # File was written directly; read it back
        with open(output_path, 'rb') as f:
            return f.read()
    else:
        return buffer.getvalue()


def generate_text_pdf_response(
    text: str,
    user_id: Optional[int] = None,
) -> tuple:
    """
    Generate a PDF and return (pdf_bytes, filename).

    This is a convenience wrapper for Django views.

    Args:
        text: Input text content.
        user_id: Optional user ID for filename personalization.

    Returns:
        Tuple of (pdf_bytes, pdf_filename).
    """
    # Generate unique filename
    unique_id = uuid.uuid4().hex[:8]
    if user_id:
        pdf_name = f"text_{user_id}_{unique_id}.pdf"
    else:
        pdf_name = f"text_guest_{unique_id}.pdf"

    # Generate PDF
    pdf_bytes = generate_text_pdf(text, filename=pdf_name)

    return pdf_bytes, pdf_name