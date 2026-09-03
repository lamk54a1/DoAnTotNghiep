from pathlib import Path
from copy import deepcopy

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parent
FIGURES = ROOT / "figures"
OUTPUT = ROOT / "Bao_cao_do_an_tot_nghiep_SLNA_Ticketing_hoan_chinh.docx"

FONT_NAME = "Times New Roman"
BODY_SIZE = 13
CONTENT_WIDTH_DXA = 8504


def set_run_font(run, size=BODY_SIZE, bold=None, italic=None, color="000000"):
    run.font.name = FONT_NAME
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), FONT_NAME)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), FONT_NAME)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), FONT_NAME)
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_cell_margins(cell, top=80, start=100, bottom=80, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_table_geometry(table, widths_dxa):
    total = sum(widths_dxa)
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(total))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_layout = tbl_pr.find(qn("w:tblLayout"))
    if tbl_layout is None:
        tbl_layout = OxmlElement("w:tblLayout")
        tbl_pr.append(tbl_layout)
    tbl_layout.set(qn("w:type"), "fixed")
    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            width = widths_dxa[min(index, len(widths_dxa) - 1)]
            tc_w = cell._tc.get_or_add_tcPr().find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                cell._tc.get_or_add_tcPr().append(tc_w)
            tc_w.set(qn("w:w"), str(width))
            tc_w.set(qn("w:type"), "dxa")
            set_cell_margins(cell)


def add_field(paragraph, instruction, placeholder=""):
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run = paragraph.add_run()
    run._r.extend([begin, instr, separate, text, end])
    set_run_font(run)
    return run


def set_page_number_format(section, fmt, start=1):
    sect_pr = section._sectPr
    pg_num = sect_pr.find(qn("w:pgNumType"))
    if pg_num is None:
        pg_num = OxmlElement("w:pgNumType")
        sect_pr.append(pg_num)
    pg_num.set(qn("w:fmt"), fmt)
    pg_num.set(qn("w:start"), str(start))


def configure_header_page_number(section):
    section.header.is_linked_to_previous = False
    header = section.header
    paragraph = header.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_after = Pt(0)
    add_field(paragraph, " PAGE ", "1")


def configure_section(section):
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3.5)
    section.right_margin = Cm(2.5)
    section.header_distance = Cm(1.2)
    section.footer_distance = Cm(1.2)


def add_centered(doc, text="", size=BODY_SIZE, bold=False, italic=False, before=0, after=0):
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = 1.5
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, italic=italic)
    return paragraph


def add_body(doc, text, *, bold_prefix=None, indent=True, keep=False):
    paragraph = doc.add_paragraph(style="Body Text Academic")
    paragraph.paragraph_format.keep_together = keep
    if not indent:
        paragraph.paragraph_format.first_line_indent = Cm(0)
    if bold_prefix and text.startswith(bold_prefix):
        first, rest = text.split(":", 1)
        run = paragraph.add_run(first + ":")
        set_run_font(run, bold=True)
        run = paragraph.add_run(rest)
        set_run_font(run)
    else:
        run = paragraph.add_run(text)
        set_run_font(run)
    return paragraph


def add_bullet(doc, text, level=0):
    paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    paragraph.paragraph_format.left_indent = Cm(0.75 + level * 0.5)
    paragraph.paragraph_format.first_line_indent = Cm(-0.5)
    paragraph.paragraph_format.line_spacing = 1.5
    paragraph.paragraph_format.space_after = Pt(3)
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def add_major_heading(doc, text, page_break=True):
    paragraph = doc.add_paragraph(style="Heading 1")
    paragraph.paragraph_format.page_break_before = page_break and len(doc.paragraphs) > 1
    paragraph.add_run(text.upper())
    return paragraph


def add_chapter(doc, number, title):
    paragraph = doc.add_paragraph(style="Heading 1")
    paragraph.paragraph_format.page_break_before = True
    run = paragraph.add_run(f"CHƯƠNG {number}. {title.upper()}")
    set_run_font(run, size=15, bold=True)
    return paragraph


def add_section_heading(doc, number, title):
    paragraph = doc.add_paragraph(style="Heading 2")
    run = paragraph.add_run(f"{number}. {title}")
    set_run_font(run, size=13, bold=True)
    return paragraph


def add_subsection_heading(doc, number, title):
    paragraph = doc.add_paragraph(style="Heading 3")
    run = paragraph.add_run(f"{number}. {title}")
    set_run_font(run, size=13, bold=True, italic=True)
    return paragraph


def add_table_caption(doc, number, title):
    paragraph = doc.add_paragraph(style="Caption Table")
    run = paragraph.add_run(f"Bảng {number}. {title}")
    set_run_font(run, size=13, italic=True)
    return paragraph


def add_figure(doc, filename, number, title, width_cm=15.0, source="Nguồn: Tác giả xây dựng từ thiết kế ban đầu của đồ án."):
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(3)
    run = paragraph.add_run()
    inline_shape = run.add_picture(str(FIGURES / filename), width=Cm(width_cm))
    inline_shape._inline.docPr.set("title", title)
    inline_shape._inline.docPr.set("descr", title)
    caption = doc.add_paragraph(style="Caption Figure")
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = caption.add_run(f"Hình {number}. {title}")
    set_run_font(run, size=13, italic=True)
    source_p = doc.add_paragraph()
    source_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    source_p.paragraph_format.space_after = Pt(6)
    run = source_p.add_run(source)
    set_run_font(run, size=11, italic=True)


def add_table(doc, headers, rows, widths, font_size=11.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, value in enumerate(headers):
        cell = table.rows[0].cells[index]
        shade_cell(cell, "D9E2F3")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(value)
        set_run_font(run, size=font_size, bold=True)
    set_repeat_table_header(table.rows[0])
    for row_values in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row_values):
            cells[index].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cells[index].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(str(value))
            set_run_font(run, size=font_size)
    set_table_geometry(table, widths)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_topic(doc, number, title, paragraphs, bullets=None):
    add_section_heading(doc, number, title)
    for text in paragraphs:
        add_body(doc, text)
    for item in bullets or []:
        add_bullet(doc, item)


def setup_styles(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT_NAME
    normal._element.rPr.rFonts.set(qn("w:ascii"), FONT_NAME)
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_NAME)
    normal.font.size = Pt(BODY_SIZE)
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(3)

    for name, size, align, before, after in (
        ("Heading 1", 15, WD_ALIGN_PARAGRAPH.CENTER, 6, 12),
        ("Heading 2", 13, WD_ALIGN_PARAGRAPH.LEFT, 9, 4),
        ("Heading 3", 13, WD_ALIGN_PARAGRAPH.LEFT, 6, 3),
    ):
        style = styles[name]
        style.font.name = FONT_NAME
        style._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), FONT_NAME)
        style._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), FONT_NAME)
        style._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), FONT_NAME)
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.alignment = align
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    body = styles.add_style("Body Text Academic", WD_STYLE_TYPE.PARAGRAPH)
    body.base_style = normal
    body.font.name = FONT_NAME
    body.font.size = Pt(BODY_SIZE)
    body.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    body.paragraph_format.first_line_indent = Cm(1)
    body.paragraph_format.line_spacing = 1.5
    body.paragraph_format.space_before = Pt(0)
    body.paragraph_format.space_after = Pt(3)
    body.paragraph_format.widow_control = True

    bullet = styles.add_style("Academic Bullet", WD_STYLE_TYPE.PARAGRAPH)
    bullet.base_style = normal
    bullet.font.name = FONT_NAME
    bullet.font.size = Pt(BODY_SIZE)
    bullet.paragraph_format.line_spacing = 1.5
    bullet.paragraph_format.space_after = Pt(2)

    for name, size, align, before, after, outline in (
        ("Major Heading", 15, WD_ALIGN_PARAGRAPH.CENTER, 6, 12, 0),
        ("Chapter Heading", 15, WD_ALIGN_PARAGRAPH.CENTER, 6, 12, 0),
        ("Section Heading", 13, WD_ALIGN_PARAGRAPH.LEFT, 9, 4, 1),
        ("Subsection Heading", 13, WD_ALIGN_PARAGRAPH.LEFT, 6, 3, 2),
    ):
        style = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        style.base_style = normal
        style.font.name = FONT_NAME
        style.font.size = Pt(size)
        style.font.bold = True
        style.paragraph_format.alignment = align
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True
        p_pr = style._element.get_or_add_pPr()
        outline_node = OxmlElement("w:outlineLvl")
        outline_node.set(qn("w:val"), str(outline))
        p_pr.append(outline_node)

    for name, before, after in (("Caption Figure", 0, 2), ("Caption Table", 6, 3)):
        style = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        style.base_style = normal
        style.font.name = FONT_NAME
        style.font.size = Pt(13)
        style.font.italic = True
        style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True


def enable_field_updates(doc):
    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")


def add_cover(doc, secondary=False):
    add_centered(doc, "[ĐIỀN TÊN CƠ QUAN CHỦ QUẢN]", bold=True, after=0)
    add_centered(doc, "[ĐIỀN TÊN TRƯỜNG]", bold=True, after=0)
    add_centered(doc, "[ĐIỀN TÊN KHOA]", bold=True, after=30)
    add_centered(doc, "BÁO CÁO ĐỒ ÁN TỐT NGHIỆP", size=18, bold=True, after=18)
    add_centered(doc, "XÂY DỰNG HỆ THỐNG BÁN VÉ TRỰC TUYẾN", size=17, bold=True, after=3)
    add_centered(doc, "CHO CÂU LẠC BỘ SÔNG LAM NGHỆ AN", size=17, bold=True, after=28)
    add_centered(doc, "Ngành: Công nghệ thông tin", bold=True, after=4)
    add_centered(doc, "Chuyên ngành: [Điền chuyên ngành]", bold=True, after=28)
    add_centered(doc, "Sinh viên thực hiện: [Điền họ và tên]", bold=True, after=3)
    add_centered(doc, "Mã sinh viên: [Điền mã sinh viên]", bold=True, after=3)
    add_centered(doc, "Lớp: [Điền lớp]", bold=True, after=3)
    add_centered(doc, "Giảng viên hướng dẫn: [Điền họ tên GVHD]", bold=True, after=34)
    if secondary:
        add_centered(doc, "BẢN BÌA PHỤ", italic=True, after=20)
    add_centered(doc, "Nghệ An, năm 2026", bold=True)


def add_review_page(doc, title, fields):
    doc.add_page_break()
    add_centered(doc, title, size=15, bold=True, after=18)
    for label in fields:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run(f"{label}: ")
        set_run_font(run, bold=True)
        run = p.add_run("........................................................")
        set_run_font(run)
    for _ in range(6):
        add_body(doc, "................................................................................", indent=False)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run("Nghệ An, ngày ...... tháng ...... năm 2026\nNgười nhận xét\n(Ký và ghi rõ họ tên)")
    set_run_font(run)


def build_document():
    doc = Document()
    setup_styles(doc)
    for section in doc.sections:
        configure_section(section)
    doc.core_properties.title = "Báo cáo đồ án tốt nghiệp - Hệ thống bán vé trực tuyến SLNA Ticketing"
    doc.core_properties.subject = "Đồ án tốt nghiệp ngành Công nghệ thông tin"
    doc.core_properties.author = "[Điền họ tên sinh viên]"
    doc.core_properties.keywords = "SLNA Ticketing, Next.js, Express, PostgreSQL, bán vé trực tuyến"

    # Bìa và hồ sơ đánh giá không hiển thị số trang.
    doc.sections[0].different_first_page_header_footer = True
    add_cover(doc)
    doc.add_page_break()
    add_cover(doc, secondary=True)
    add_review_page(doc, "NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN", ["Họ tên sinh viên", "Mã sinh viên", "Tên đề tài", "Nhận xét chung"])
    add_review_page(doc, "NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN", ["Họ tên sinh viên", "Mã sinh viên", "Tên đề tài", "Nhận xét chung"])
    add_review_page(doc, "BIÊN BẢN HỘI ĐỒNG BẢO VỆ", ["Thời gian", "Địa điểm", "Thành phần Hội đồng", "Kết luận và điểm"])
    add_review_page(doc, "GIẢI TRÌNH CÁC CHỈNH SỬA SAU BẢO VỆ", ["Ý kiến của Hội đồng", "Nội dung đã chỉnh sửa", "Vị trí chỉnh sửa"])

    # Phần đầu đánh số La Mã thường.
    front = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_section(front)
    front.different_first_page_header_footer = False
    configure_header_page_number(front)
    set_page_number_format(front, "lowerRoman", 1)
    add_major_heading(doc, "TÓM TẮT ĐỒ ÁN", page_break=False)
    add_body(doc, "Đồ án xây dựng hệ thống bán vé trực tuyến cho Câu lạc bộ Sông Lam Nghệ An trên nền tảng web. Giải pháp gồm giao diện Next.js, dịch vụ REST API Express.js và cơ sở dữ liệu PostgreSQL; hỗ trợ quản lý tài khoản, xác minh CCCD, lịch thi đấu, sơ đồ ghế, giữ ghế 15 phút, tạo đơn, xác nhận thanh toán, phát hành vé QR, quản lý vé giấy, soát vé, nhà tài trợ và chatbot tra cứu nguồn chính thức. Hệ thống áp dụng cookie HttpOnly cho phiên đăng nhập, bcrypt cho mật khẩu, phân quyền người dùng/quản trị viên, kiểm soát trạng thái vé và cơ chế tự giải phóng đơn quá hạn. Chatbot sử dụng mô hình truy xuất dữ liệu nhẹ, đồng bộ tin từ SLNAFC và VPF, đồng thời trả kèm nguồn. Kết quả kiểm thử tự động đạt 8/8 trường hợp, frontend vượt qua lint và production build, backend vượt qua kiểm tra cú pháp. Sản phẩm đáp ứng các nghiệp vụ cốt lõi của một hệ thống bán vé bóng đá ở mức đồ án có khả năng trình diễn và tiếp tục mở rộng.")

    add_major_heading(doc, "LỜI CAM ĐOAN")
    add_body(doc, "Tôi cam đoan báo cáo đồ án tốt nghiệp này là kết quả của quá trình khảo sát, phân tích, thiết kế, xây dựng và kiểm thử hệ thống bán vé trực tuyến cho Câu lạc bộ Sông Lam Nghệ An. Các mô tả về kiến trúc, cơ sở dữ liệu, thuật toán nghiệp vụ và kết quả kiểm thử được đối chiếu với mã nguồn tại thời điểm hoàn thiện báo cáo. Các khái niệm, tiêu chuẩn và tài liệu kỹ thuật của bên thứ ba đều được chú dẫn theo chuẩn IEEE. Tôi chịu trách nhiệm về tính trung thực của nội dung, số liệu và kết quả trình bày trong báo cáo.")
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run("Nghệ An, ngày ...... tháng ...... năm 2026\nSinh viên thực hiện\n(Ký và ghi rõ họ tên)")
    set_run_font(run)

    add_major_heading(doc, "LỜI CẢM ƠN")
    add_body(doc, "Trong quá trình thực hiện đồ án, tôi đã nhận được sự hướng dẫn, hỗ trợ và góp ý từ giảng viên, nhà trường, bạn bè và gia đình. Tôi xin bày tỏ lòng biết ơn tới giảng viên hướng dẫn đã định hướng phương pháp phân tích bài toán, góp ý về kiến trúc, tính đúng đắn của nghiệp vụ và cách trình bày báo cáo. Tôi cảm ơn các thầy cô trong khoa đã trang bị kiến thức về lập trình web, cơ sở dữ liệu, phân tích thiết kế hệ thống, bảo mật và kiểm thử phần mềm. Những kiến thức đó là nền tảng trực tiếp để tôi hoàn thành sản phẩm này.")
    add_body(doc, "Tôi cũng cảm ơn các bạn đã hỗ trợ thử nghiệm giao diện, phản hồi về quy trình đặt vé và cùng trao đổi các tình huống biên như tranh chấp ghế, đơn quá hạn, vé giấy đã in và quét QR lặp lại. Do giới hạn về thời gian và kinh nghiệm, báo cáo khó tránh khỏi thiếu sót. Tôi mong tiếp tục nhận được ý kiến của giảng viên và Hội đồng để hoàn thiện hệ thống theo hướng an toàn, ổn định và gần hơn với quy trình vận hành thực tế.")

    add_major_heading(doc, "MỤC LỤC")
    p = doc.add_paragraph()
    add_field(p, ' TOC \\o "1-3" \\h \\z \\u ', "Mục lục sẽ được cập nhật khi mở trong Microsoft Word.")

    add_major_heading(doc, "DANH MỤC HÌNH ẢNH")
    p = doc.add_paragraph()
    add_field(p, ' TOC \\h \\z \\t "Caption Figure,1" ', "Danh mục hình sẽ được cập nhật khi mở trong Microsoft Word.")

    add_major_heading(doc, "DANH MỤC BẢNG BIỂU")
    p = doc.add_paragraph()
    add_field(p, ' TOC \\h \\z \\t "Caption Table,1" ', "Danh mục bảng sẽ được cập nhật khi mở trong Microsoft Word.")

    add_major_heading(doc, "DANH MỤC CHỮ VIẾT TẮT")
    abbreviations = [
        ("API", "Application Programming Interface - Giao diện lập trình ứng dụng"),
        ("CCCD", "Căn cước công dân"),
        ("CSDL", "Cơ sở dữ liệu"),
        ("DTO", "Data Transfer Object - Đối tượng truyền dữ liệu"),
        ("ERD", "Entity Relationship Diagram - Sơ đồ quan hệ thực thể"),
        ("FE/BE", "Frontend/Backend - Giao diện phía khách/Dịch vụ phía máy chủ"),
        ("HTTP", "Hypertext Transfer Protocol"),
        ("JWT", "JSON Web Token"),
        ("QR", "Quick Response"),
        ("RAG", "Retrieval-Augmented Generation - Sinh câu trả lời có truy xuất dữ liệu"),
        ("REST", "Representational State Transfer"),
        ("SLNA", "Sông Lam Nghệ An"),
        ("SQL", "Structured Query Language"),
        ("UI/UX", "User Interface/User Experience - Giao diện/Trải nghiệm người dùng"),
        ("VPF", "Công ty Cổ phần Bóng đá Chuyên nghiệp Việt Nam"),
    ]
    add_table(doc, ["Từ viết tắt", "Ý nghĩa"], abbreviations, [1700, 6804], 12)

    # Phần chính đánh số Ả Rập từ 1.
    main = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_section(main)
    main.different_first_page_header_footer = False
    configure_header_page_number(main)
    set_page_number_format(main, "decimal", 1)

    # MỞ ĐẦU
    add_major_heading(doc, "MỞ ĐẦU", page_break=False)
    add_topic(doc, "0.1", "Lý do chọn đề tài", [
        "Bóng đá là loại hình thể thao có lượng người theo dõi lớn, trong đó nhu cầu mua vé thường tập trung vào một khoảng thời gian ngắn trước ngày thi đấu. Nếu phát hành chủ yếu tại quầy, đơn vị tổ chức phải bố trí nhân sự bán vé, kiểm đếm vé giấy, đối soát doanh thu và giải quyết tình trạng người mua xếp hàng. Khi lượng khán giả tăng nhanh, cách làm thủ công dễ phát sinh nhầm lẫn số lượng, khó cung cấp thông tin ghế theo thời gian thực và hạn chế khả năng thống kê. Vì vậy, số hóa quy trình phát hành vé là một bài toán có giá trị thực tiễn đối với câu lạc bộ bóng đá.",
        "Một hệ thống bán vé trực tuyến không chỉ là một trang thương mại điện tử đơn giản. Đối tượng bán là quyền sử dụng một vị trí cụ thể tại một thời điểm cụ thể; mỗi ghế chỉ có thể thuộc về một người mua hợp lệ. Hệ thống phải xử lý đồng thời yêu cầu xem sơ đồ ghế, giữ chỗ tạm thời, tạo đơn, xác nhận thanh toán, phát hành mã QR, quản lý vé giấy và ngăn quét vé nhiều lần. Mỗi sai lệch trạng thái có thể dẫn tới bán trùng ghế hoặc từ chối nhầm khán giả hợp lệ. Đây là lý do đề tài tập trung mạnh vào tính toàn vẹn dữ liệu và vòng đời vé.",
        "Câu lạc bộ Sông Lam Nghệ An có cộng đồng người hâm mộ lớn và hình ảnh gắn với sân vận động Vinh. Việc lựa chọn bối cảnh SLNA giúp đồ án có phạm vi nghiệp vụ rõ ràng, gần gũi và đủ phức tạp để vận dụng kiến thức về phát triển phần mềm. Sản phẩm được định hướng như một mô hình có thể trình diễn: người dùng đăng ký, xác minh thông tin, chọn ghế và nhận vé; quản trị viên tổ chức kho vé, xử lý đơn, vé giấy, soát cổng, báo cáo và nội dung nhà tài trợ. Qua đó, đồ án kết nối kiến thức học thuật với một quy trình vận hành cụ thể."
    ])
    add_topic(doc, "0.2", "Mục tiêu nghiên cứu và phát triển", [
        "Mục tiêu tổng quát của đề tài là xây dựng một hệ thống web hỗ trợ phát hành và quản lý vé bóng đá trực tuyến cho SLNA, bảo đảm các nghiệp vụ chính có thể vận hành thống nhất trên một nguồn dữ liệu. Hệ thống cần thể hiện được kiến trúc tách frontend, backend và cơ sở dữ liệu; các thành phần giao tiếp qua REST API; quyền truy cập được phân chia theo vai trò; trạng thái vé và đơn hàng được kiểm soát xuyên suốt từ khi mở bán tới khi soát cổng.",
        "Về phía khán giả, mục tiêu cụ thể gồm cung cấp giao diện xem lịch thi đấu, giá vé, trạng thái mở bán và sơ đồ ghế; hỗ trợ đăng ký bằng email hoặc đăng nhập mạng xã hội; cập nhật hồ sơ và gửi CCCD; giới hạn tối đa bốn vé cho một trận; giữ ghế có thời hạn; tạo đơn và theo dõi vé đã mua. Vé điện tử phải có mã QR riêng và chỉ được sử dụng sau khi đơn được xác nhận thành công. Giao diện phải thông báo rõ khi ghế vừa bị người khác giữ hoặc khi thời gian giữ chỗ đã hết.",
        "Về phía quản trị viên, hệ thống phải hỗ trợ quản lý trận đấu, cấu hình giá theo khán đài, sinh kho ghế, chuyển một phần vé sang kênh giấy, in PDF, đánh dấu bán, duyệt đơn, khóa tài khoản, duyệt CCCD, quản lý nhà tài trợ, xem nhật ký và quét QR. Ngoài ra, đề tài đặt mục tiêu bổ sung chatbot có khả năng tra dữ liệu nội bộ và tin từ nguồn chính thức, trả lời kèm liên kết để giảm nguy cơ cung cấp thông tin không kiểm chứng."
    ], [
        "Xây dựng sản phẩm có thể chạy độc lập trên môi trường phát triển với hướng dẫn cài đặt rõ ràng.",
        "Đảm bảo dữ liệu nhạy cảm và mã xác thực không bị đưa vào localStorage hoặc trả về trong API công khai.",
        "Thiết lập migration, kiểm thử tự động, lint và production build để chứng minh khả năng tái lập của sản phẩm."
    ])
    add_topic(doc, "0.3", "Đối tượng và phạm vi nghiên cứu", [
        "Đối tượng nghiên cứu của đồ án là quy trình phát hành, thanh toán mô phỏng, quản lý và kiểm soát vé bóng đá trên nền tảng web. Trọng tâm không nằm ở hoạt động chuyên môn thi đấu mà ở sự vận động của dữ liệu người dùng, trận đấu, ghế, đơn hàng và mã vé. Đề tài phân tích cách các trạng thái thay đổi theo hành động của khán giả và quản trị viên, đồng thời xác định điều kiện để một vé được xem là hợp lệ tại cổng.",
        "Phạm vi nội dung bao gồm quản lý tài khoản, OAuth Google/Facebook, hồ sơ và CCCD; quản lý lịch thi đấu; cấu hình khán đài A, B, C, D; giữ ghế 15 phút; giới hạn bốn vé; tạo đơn PENDING; xác nhận SUCCESS hoặc CANCELLED; sinh QR sau thanh toán; quản lý vé giấy; soát vé; nhà tài trợ; báo cáo; chatbot tra cứu PostgreSQL và nguồn SLNAFC/VPF. Đồ án không tích hợp cổng thanh toán ngân hàng thật, không xử lý hoàn tiền tự động và không thay thế hệ thống kiểm soát ra vào chuyên dụng.",
        "Phạm vi không gian là môi trường ứng dụng web dành cho người dùng và quản trị viên. Phạm vi thời gian phản ánh trạng thái mã nguồn tại tháng 8 năm 2026. Phạm vi dữ liệu tập trung vào một câu lạc bộ và một sân chính, nhưng mô hình trận đấu - vé - đơn hàng có thể mở rộng cho nhiều mùa giải. Các ảnh và sơ đồ trong báo cáo gồm cả thiết kế ban đầu; phần mô tả triển khai sẽ nêu rõ những thay đổi phát sinh sau quá trình kiểm thử và hoàn thiện."
    ])
    add_topic(doc, "0.4", "Phương pháp thực hiện", [
        "Đề tài sử dụng cách tiếp cận nghiên cứu ứng dụng kết hợp mô tả và thực nghiệm phần mềm. Trước hết, quy trình bán vé được phân rã theo tác nhân, đầu vào, đầu ra, trạng thái và ngoại lệ. Yêu cầu được hình thành từ các tình huống sử dụng: hai người cùng chọn một ghế, người mua không thanh toán đúng hạn, quản trị viên in vé giấy rồi muốn trả về kênh online, người dùng quét lại một QR và tài khoản mạng xã hội không có mật khẩu nội bộ. Việc phân tích tình huống giúp yêu cầu có thể kiểm chứng thay vì chỉ dừng ở danh sách chức năng.",
        "Phương pháp thiết kế hướng mô hình được dùng để xây dựng use case, kiến trúc client-server, luồng giữ ghế, luồng vé giấy và ERD. Sau đó, phương pháp phát triển lặp được áp dụng: xây dựng từng module, chạy lint/build/test, đối chiếu lỗi và điều chỉnh nghiệp vụ. Các thay đổi quan trọng như chuyển phiên đăng nhập sang cookie HttpOnly, chuẩn hóa trạng thái đơn, kéo dài thời gian giữ ghế lên 15 phút và chỉ sinh QR vé sau khi thanh toán được ghi nhận như kết quả của quá trình lặp.",
        "Phương pháp kiểm chứng gồm kiểm tra cú pháp backend, ESLint frontend, production build Next.js, kiểm thử đơn vị bằng node:test và chạy thử truy vấn PostgreSQL. Đối với chatbot, hệ thống đồng bộ thật từ hai domain allowlist, kiểm tra canonical URL, nội dung, ngày đăng và khả năng trả nguồn. Kết quả được sử dụng để đánh giá mức đáp ứng yêu cầu, đồng thời chỉ ra giới hạn chưa thể suy rộng như khả năng chịu tải lớn hoặc độ tin cậy của thanh toán thật."
    ])
    add_topic(doc, "0.5", "Ý nghĩa khoa học và thực tiễn", [
        "Về mặt học thuật, đề tài minh họa cách chuyển một bài toán nghiệp vụ có nhiều trạng thái thành mô hình dữ liệu quan hệ và API. Các nguyên tắc về khóa chính, khóa ngoại, ràng buộc duy nhất và chỉ mục được gắn trực tiếp với yêu cầu không bán trùng ghế và không trùng mã QR. Vòng đời ghế cho thấy mối liên hệ giữa giao dịch cơ sở dữ liệu, kiểm tra quyền và xử lý thời gian. Phần xác thực cho thấy sự khác biệt giữa xác thực, quản lý phiên và phân quyền như tài liệu Next.js khuyến nghị [1].",
        "Về mặt thực tiễn, sản phẩm giảm thao tác thủ công khi phát hành vé, cung cấp tồn kho tập trung và tạo cơ sở cho đối soát. Quản trị viên có thể xử lý đồng thời vé online và vé giấy nhưng vẫn dùng chung một kho ghế, qua đó hạn chế phát hành vượt số chỗ. QR vé hỗ trợ kiểm tra tại cổng; audit log hỗ trợ truy vết hành động; chatbot giảm tải các câu hỏi lặp lại về lịch, giá, số vé, CCCD và nguồn tin chính thức.",
        "Giá trị quan trọng khác là khả năng tiếp tục phát triển. Kiến trúc tách lớp cho phép thay thế kênh lưu ảnh local bằng object storage, kết nối webhook thanh toán, bổ sung email/SMS, triển khai CDN hoặc mở rộng chatbot với mô hình ngôn ngữ. Báo cáo không coi phiên bản hiện tại là hệ thống thương mại hoàn chỉnh, mà xem đây là một nền tảng kỹ thuật có cấu trúc rõ ràng để tiếp tục đánh giá và hoàn thiện."
    ])
    add_topic(doc, "0.6", "Bố cục báo cáo", [
        "Ngoài phần mở đầu, kết luận, tài liệu tham khảo và phụ lục, báo cáo được tổ chức thành sáu chương. Chương 1 trình bày tổng quan bài toán và cơ sở lý thuyết. Chương 2 mô tả khảo sát, phương pháp và yêu cầu. Chương 3 phân tích, thiết kế kiến trúc và các luồng nghiệp vụ. Chương 4 tập trung vào cơ sở dữ liệu, ràng buộc, chỉ mục và migration. Chương 5 trình bày quá trình xây dựng frontend, backend, xác thực, vé, quản trị và chatbot. Chương 6 mô tả kiểm thử, kết quả, thảo luận, hạn chế và hướng phát triển."
    ])

    # CHƯƠNG 1
    add_chapter(doc, 1, "Tổng quan và cơ sở lý thuyết")
    add_topic(doc, "1.1", "Đặc trưng của hệ thống bán vé bóng đá trực tuyến", [
        "Hệ thống bán vé sự kiện quản lý một loại tài nguyên khan hiếm: ghế ngồi gắn với trận đấu và thời gian. Khác với hàng hóa có thể bổ sung kho, một ghế tại một trận chỉ tồn tại một lần. Khi trạng thái bị ghi sai, hậu quả không chỉ là sai số liệu mà còn ảnh hưởng trực tiếp tới trải nghiệm tại sân. Vì vậy, mô hình phải xác định rõ đối tượng ghế, mã ghế duy nhất trong từng trận, kênh phát hành, chủ thể đang giữ, thời điểm hết hạn, đơn sở hữu và trạng thái quét.",
        "Nhu cầu truy cập thường có tính đột biến. Nhiều khán giả có thể đồng thời mở sơ đồ và chọn cùng vị trí. Nếu frontend tự kết luận ghế còn trống dựa trên dữ liệu cũ, hai người có thể cùng tiến tới checkout. Quyết định cuối cùng phải được thực hiện tại backend bằng câu lệnh cập nhật có điều kiện trong cơ sở dữ liệu. Kết quả cập nhật bằng không cho biết ghế không còn khả dụng; frontend chỉ phản ánh kết quả và yêu cầu người dùng chọn lại.",
        "Bán vé bóng đá còn có đặc thù kết hợp online và giấy. Một lượng ghế có thể được dành cho quầy, đối tác hoặc khách mời. Khi vé giấy đã in, đưa ghế trở lại online có thể tạo hai bản vé cùng chỗ. Do đó, đồ án phân biệt PAPER_RESERVED và PAPER_SOLD, đồng thời dùng cờ is_printed để khóa ghế đã in khỏi quá trình hoàn kho. Quy tắc này thể hiện việc thiết kế hệ thống phải bám sát rủi ro vật lý chứ không chỉ tối ưu thao tác trên màn hình."
    ])
    add_topic(doc, "1.2", "Kiến trúc ứng dụng web client-server", [
        "Kiến trúc client-server phân chia hệ thống thành giao diện chạy trên trình duyệt, dịch vụ xử lý nghiệp vụ và cơ sở dữ liệu. Frontend chịu trách nhiệm biểu diễn trạng thái, thu thập dữ liệu và hướng dẫn người dùng; backend kiểm tra dữ liệu, quyền truy cập và quy tắc nghiệp vụ; PostgreSQL đảm bảo lưu trữ bền vững. Cách phân chia này giúp không đặt quyết định bảo mật ở phía trình duyệt, nơi mã và request có thể bị người dùng sửa đổi.",
        "Frontend của đồ án sử dụng Next.js App Router. Theo tài liệu chính thức, App Router tổ chức định tuyến dựa trên hệ thống tệp và hỗ trợ cách xây dựng giao diện theo component [2]. React cho phép kết hợp các component thành màn hình và quản lý state cục bộ cho tương tác [3]. TypeScript bổ sung kiểm tra kiểu tĩnh trước khi chương trình chạy, hỗ trợ phát hiện sai lệch hợp đồng dữ liệu giữa component và API [4].",
        "Backend sử dụng Express.js, một framework định tuyến và middleware. Middleware có thể đọc request, thay đổi response, kết thúc chu trình hoặc chuyển điều khiển sang bước tiếp theo [5]. Đặc điểm này phù hợp để xếp chuỗi kiểm tra nguồn yêu cầu, JSON, phiên đăng nhập, vai trò, rate limit và controller. PostgreSQL được đặt sau backend; frontend không kết nối trực tiếp CSDL, nhờ đó thông tin kết nối và câu lệnh nhạy cảm không lộ ra trình duyệt."
    ])
    add_figure(doc, "architecture.png", "1.1", "Sơ đồ kiến trúc tổng thể trong thiết kế ban đầu", 15)
    add_body(doc, "Hình 1.1 được giữ nguyên từ báo cáo ban đầu để thể hiện quá trình hình thành kiến trúc. Khi triển khai hoàn thiện, cơ chế JWT qua Authorization đã được thay bằng cookie HttpOnly; chatbot được bổ sung kho knowledge_sources và knowledge_documents; thời gian giữ ghế được chuẩn hóa thành 15 phút. Việc giữ hình ban đầu và mô tả phần tiến hóa giúp phân biệt thiết kế dự kiến với sản phẩm cuối.")
    add_topic(doc, "1.3", "REST API và mô hình tài nguyên", [
        "REST API biểu diễn các đối tượng nghiệp vụ qua endpoint và phương thức HTTP. Trong đồ án, nhóm `/api/auth` xử lý tài khoản; `/api/matches` quản lý trận; `/api/tickets` quản lý ghế, vé giấy và quét; `/api/orders` tạo đơn và tải vé; `/api/admin` cung cấp thống kê; `/api/sponsors` quản lý nhà tài trợ; `/api/chatbot` nhận câu hỏi. Cách nhóm theo tài nguyên giúp frontend dễ tìm endpoint và backend tách controller theo phạm vi trách nhiệm.",
        "Không phải mọi thao tác đều là CRUD đơn giản. Giữ ghế, tạo đơn, duyệt thanh toán hoặc đánh dấu vé giấy đã in là lệnh nghiệp vụ có điều kiện. Ví dụ, API giữ ghế phải kiểm tra người dùng đã được duyệt CCCD, trận đang mở bán và số vé chưa vượt hạn mức. API quét vé phải đọc đồng thời trạng thái vé, trạng thái đơn và cờ is_scanned. Vì vậy, tài nguyên REST được kết hợp với các route hành động có tên rõ ràng thay vì ép mọi thao tác vào một cập nhật chung.",
        "Hợp đồng API cần giới hạn dữ liệu trả về. API công khai chỉ cung cấp thông tin trận và tồn kho cần thiết cho chọn ghế; doanh thu và thông tin người mua thuộc vùng quản trị. Hồ sơ người dùng không trả mật khẩu; localStorage chỉ lưu dữ liệu hiển thị không nhạy cảm. Đây là nguyên tắc DTO tối thiểu: mỗi nhóm người dùng chỉ nhận dữ liệu cần cho chức năng đang thực hiện."
    ])
    add_topic(doc, "1.4", "Giao dịch, đồng thời và tính toàn vẹn dữ liệu", [
        "PostgreSQL cung cấp giao dịch với BEGIN, COMMIT và ROLLBACK; các câu lệnh ngoài transaction rõ ràng được xử lý theo cơ chế tự động commit [6]. Trong bài toán bán vé, giao dịch cần bao quanh chuỗi bước phụ thuộc. Khi tạo đơn, hệ thống phải khóa hoặc xác nhận các ghế do đúng người dùng đang giữ, tính tổng tiền, tạo bản ghi đơn và gắn các vé vào đơn. Nếu một bước thất bại, toàn bộ thay đổi phải hoàn tác để không tạo đơn thiếu vé hoặc ghế bị bán mà không có đơn.",
        "Tính đồng thời được xử lý bằng cập nhật có điều kiện thay vì chỉ kiểm tra trước rồi cập nhật sau. Điều kiện `status = AVAILABLE` hoặc `status = HELD AND held_by = user` được đặt ngay trong SQL. Cách làm này thu hẹp khoảng thời gian tranh chấp giữa hai request. Ràng buộc duy nhất `(match_id, seat_code)` và mã QR duy nhất tạo thêm lớp bảo vệ ở CSDL, bởi kiểm tra trong code có thể bị bỏ qua do lỗi hoặc do nhiều tiến trình chạy đồng thời.",
        "Chỉ mục được sử dụng cho các truy vấn lặp lại như tìm vé theo trận và trạng thái, tìm ghế hết hạn hoặc đơn PENDING hết hạn. Tài liệu PostgreSQL nhấn mạnh chỉ mục hỗ trợ nhiều chiến lược truy cập và cần được thiết kế theo truy vấn [7]. Đồ án dùng chỉ mục từng phần cho các bản ghi cần dọn dẹp, giúp tránh quét toàn bảng khi bộ lập lịch chạy mỗi phút."
    ])
    add_topic(doc, "1.5", "Xác thực, quản lý phiên và phân quyền", [
        "Xác thực trả lời câu hỏi người dùng là ai; quản lý phiên duy trì trạng thái đó qua nhiều request; phân quyền quyết định hành động được phép. JWT được chuẩn hóa trong RFC 7519 như một định dạng gọn, an toàn với URL để biểu diễn tập claim giữa các bên [8]. Trong hệ thống, JWT chứa định danh người dùng, vai trò và phiên bản token, nhưng token không được lưu tại localStorage. Backend ký token và đặt trong cookie HttpOnly.",
        "Tài liệu Next.js khuyến nghị cookie phiên được thiết lập ở phía máy chủ với các thuộc tính HttpOnly, Secure, SameSite, thời hạn và Path phù hợp [1]. OWASP cũng cảnh báo không lưu token hoặc session ID trong localStorage vì JavaScript cùng origin có thể đọc được khi xảy ra XSS [9]. Vì vậy, axiosClient gửi cookie cùng request; middleware backend xác minh chữ ký, sau đó truy vấn trạng thái tài khoản và token_version để thu hồi phiên sau các thay đổi nhạy cảm.",
        "Mật khẩu được băm bằng bcrypt với work factor 12. OWASP yêu cầu không lưu mật khẩu dạng rõ và chấp nhận bcrypt với work factor từ 10 trở lên trong các hệ thống phù hợp [10]. Khi đổi email hoặc mật khẩu, tài khoản LOCAL phải tự nhập mật khẩu hiện tại; backend so sánh hash và không bao giờ trả mật khẩu về frontend. Tài khoản Google/Facebook không có mật khẩu nội bộ có ý nghĩa, nên thao tác email và mật khẩu được quản lý tại nhà cung cấp."
    ])
    add_topic(doc, "1.6", "Mã QR và kiểm soát vé vào sân", [
        "Mã QR trong hệ thống đóng vai trò định danh vé, không phải bằng chứng thanh toán độc lập. Nếu QR được tạo ngay khi đơn PENDING, người dùng có thể nhận một chuỗi quét trước khi tiền được xác nhận. Phiên bản hoàn thiện chỉ sinh ticket_qr_code khi quản trị viên chuyển đơn từ PENDING sang SUCCESS. Vé online hợp lệ phải có trạng thái SOLD, đơn SUCCESS và chưa quét; vé giấy hợp lệ phải PAPER_SOLD và chưa quét.",
        "Khi quét, backend tìm vé theo mã QR và trả kết quả có kiểm soát. Nếu mã không tồn tại, API trả 404. Nếu đơn bị hủy hoặc chưa thành công, API trả xung đột. Nếu is_scanned đã đúng, hệ thống cảnh báo vé đã sử dụng. Chỉ sau khi tất cả điều kiện hợp lệ, cờ is_scanned được cập nhật. Cách kiểm tra tại backend tránh việc ứng dụng quét tự quyết định chỉ dựa trên hình ảnh QR.",
        "Mã QR phải được giữ bí mật tương đương vé. Giao diện nhắc người dùng không chia sẻ ảnh QR; API công khai không trả mã QR hoặc order_id. Trong triển khai thực tế, có thể bổ sung mã ký số, xoay mã theo thời gian hoặc thiết bị quét offline có danh sách đồng bộ. Đồ án dừng ở mã ngẫu nhiên duy nhất kết hợp kiểm tra trực tuyến với CSDL."
    ])
    add_topic(doc, "1.7", "Chatbot truy xuất dữ liệu và nguồn chính thức", [
        "Chatbot theo luật cố định có ưu điểm dễ kiểm soát nhưng thường chỉ hiểu một số từ khóa và trả lời chung chung. Phiên bản mới kết hợp hai lớp dữ liệu. Lớp thứ nhất là dữ liệu nghiệp vụ nội bộ như lịch trận, giá khán đài, tồn kho vé, nhà tài trợ và kết quả. Lớp thứ hai là kho tài liệu chính thức được đồng bộ từ SLNAFC và VPF. Khi câu hỏi thuộc nhóm tin tức, cầu thủ, huấn luyện viên hoặc V.League, chatbot tìm tài liệu liên quan và trả tóm tắt kèm URL.",
        "Bộ đồng bộ chỉ chấp nhận HTTPS và hostname trong allowlist, chặn redirect sang domain lạ, giới hạn kích thước hai megabyte, timeout tám giây và tối đa số bài mỗi lần. Cheerio phân tích canonical URL, tiêu đề, mô tả, nội dung và ngày đăng. SHA-256 của nội dung hỗ trợ phát hiện thay đổi; URL duy nhất ngăn lưu trùng. PostgreSQL full-text search dùng GIN để tìm các tài liệu phù hợp.",
        "Nguyên tắc quan trọng là không khẳng định khi thiếu nguồn. Nếu không có tài liệu phù hợp, bot thông báo chưa thể xác minh. Câu trả lời chứa mảng `sources` gồm tiêu đề, nhà xuất bản, URL và thời điểm. Frontend hiển thị mục “Nguồn chính thức” với liên kết mở tab mới. Đây là RAG nhẹ theo hướng truy xuất rồi tổng hợp bằng mẫu, chưa dùng mô hình ngôn ngữ nên chi phí thấp và dễ kiểm soát."
    ])
    add_topic(doc, "1.8", "Tổng quan giải pháp liên quan và khoảng trống", [
        "Các nền tảng bán vé thương mại thường cung cấp thanh toán trực tuyến, gửi vé qua email, mã QR, quản lý sơ đồ chỗ và báo cáo. Tuy nhiên, phần lớn là dịch vụ đóng, khó quan sát cách kiểm soát đồng thời hoặc tùy biến quy trình vé giấy của một câu lạc bộ. Các bài hướng dẫn web phổ biến thường minh họa CRUD nhưng chưa bao quát trạng thái giữ ghế, hết hạn, hoàn kho, xác nhận thanh toán và soát lặp trong cùng một mô hình.",
        "Khoảng trống mà đồ án lựa chọn là xây dựng một mô hình xuyên suốt và có thể đọc mã nguồn. Mỗi quy tắc được thể hiện đồng thời ở schema, controller, giao diện và kiểm thử. Hệ thống cũng kết hợp nội dung nhà tài trợ và chatbot nguồn chính thức, phù hợp bối cảnh câu lạc bộ. Điểm mới ở quy mô đồ án không phải thuật toán hoàn toàn mới, mà là sự tích hợp có kiểm soát giữa nhiều nghiệp vụ thường bị tách rời.",
        "So với thiết kế ban đầu, sản phẩm hoàn thiện tăng cường bảo mật phiên, chuẩn hóa migration và trạng thái đơn, bổ sung QR uniqueness, kiểm tra magic bytes khi upload, rate limit, nhật ký, unit test và RAG. Sự thay đổi này cho thấy phân tích phần mềm là quá trình lặp: mô hình ban đầu tạo hướng đi, còn kiểm thử và rà soát rủi ro quyết định hình thức triển khai cuối."
    ])

    # CHƯƠNG 2
    add_chapter(doc, 2, "Khảo sát, phương pháp và yêu cầu hệ thống")
    add_topic(doc, "2.1", "Khảo sát quy trình phát hành vé", [
        "Quy trình bán vé truyền thống có thể mô tả qua các bước: câu lạc bộ công bố trận, in vé, phân bổ vé cho điểm bán, thu tiền, kiểm đếm và xé hoặc quét vé tại cổng. Dữ liệu thường bị phân tán giữa sổ bán, file bảng tính và số vé vật lý. Khi cần biết còn bao nhiêu vé theo khán đài, nhân viên phải tổng hợp từ nhiều nguồn. Nếu vé được chuyển giữa điểm bán, khả năng chênh lệch số liệu tăng.",
        "Trong quy trình trực tuyến, kho ghế phải là nguồn sự thật duy nhất. Mọi kênh phát hành đều thay đổi trạng thái trên cùng bảng tickets. Kênh online dùng AVAILABLE, HELD và SOLD; kênh giấy dùng PAPER_RESERVED và PAPER_SOLD. Tồn kho có thể được tổng hợp theo trận, khu vực và trạng thái. Việc in được ghi nhận riêng để ngăn hoàn nhầm vé đã phát hành vật lý.",
        "Khảo sát cho thấy vấn đề khó nhất không phải hiển thị lịch thi đấu mà là đồng bộ giữa hành động người dùng, xác nhận của quản trị viên và thời gian. Vì chưa tích hợp cổng thanh toán thật, đồ án chọn quy trình quản trị viên duyệt đơn sau khi kiểm tra giao dịch. Đây là giới hạn có chủ đích: hệ thống mô phỏng đúng vòng đời nhưng không tuyên bố tự động hóa đối soát ngân hàng."
    ])
    add_topic(doc, "2.2", "Các bên liên quan", [
        "Khán giả là người trực tiếp tìm trận, đăng nhập, hoàn thiện hồ sơ, chọn ghế và sử dụng vé. Nhu cầu chính là thao tác đơn giản, thông tin rõ, biết thời hạn giữ ghế và truy cập lại QR sau khi mua. Khán giả không cần biết chi tiết bảng dữ liệu nhưng cần được thông báo chính xác khi ghế không còn hoặc đơn chưa được xác nhận.",
        "Quản trị viên chịu trách nhiệm vận hành. Họ cần tạo trận, cấu hình giá, sinh kho vé, phân bổ vé giấy, duyệt đơn, soát QR, quản lý người dùng, CCCD, nhà tài trợ và xem số liệu. Quyền của quản trị viên có ảnh hưởng lớn tới dữ liệu nên mọi API cần middleware isAdmin và các thao tác quan trọng được ghi audit log.",
        "Nhà tài trợ, đơn vị truyền thông và ban tổ chức là nhóm liên quan gián tiếp. Hệ thống hiển thị logo, cấp tài trợ và website; ảnh được upload qua backend. Nguồn SLNAFC/VPF cung cấp tri thức chính thức cho chatbot. Trong triển khai thật, ngân hàng, cổng thanh toán, email/SMS và hạ tầng lưu trữ ảnh cũng là các hệ thống ngoài cần hợp đồng tích hợp rõ ràng."
    ])
    add_table_caption(doc, "2.1", "Tác nhân và nhu cầu nghiệp vụ")
    add_table(doc, ["Tác nhân", "Nhu cầu chính", "Rủi ro cần kiểm soát"], [
        ("Khán giả", "Xem trận, chọn ghế, thanh toán, nhận và sử dụng QR.", "Mất phiên, chọn ghế đã bán, lộ QR, vượt hạn mức."),
        ("Quản trị viên", "Quản lý trận, vé, đơn, người dùng, nội dung và báo cáo.", "Thao tác sai trạng thái, lộ dữ liệu, thiếu truy vết."),
        ("Nhân viên soát vé", "Quét nhanh và nhận kết quả rõ ràng tại cổng.", "Quét lặp, mạng chậm, chấp nhận đơn chưa thanh toán."),
        ("Đơn vị nguồn tin", "Cung cấp lịch, tin và thông báo chính thức.", "Thay đổi cấu trúc HTML, nội dung cũ hoặc redirect lạ."),
    ], [1600, 3552, 3352])
    add_topic(doc, "2.3", "Phương pháp thu thập và xác thực yêu cầu", [
        "Yêu cầu được thu thập bằng phân tích quy trình, quan sát các thành phần phổ biến của nền tảng bán vé và đối chiếu trực tiếp với dữ liệu cần quản lý. Mỗi yêu cầu được chuyển thành một kịch bản có điều kiện trước, hành động và kết quả. Chẳng hạn, “mua tối đa bốn vé” được cụ thể thành truy vấn đếm số vé SUCCESS của người dùng cho trận và so sánh với số ghế đang checkout.",
        "Yêu cầu được xác thực qua ba mức. Mức giao diện kiểm tra người dùng có thể tìm và thao tác đúng luồng. Mức API kiểm tra mã trạng thái HTTP, thông báo và quyền. Mức CSDL kiểm tra ràng buộc duy nhất, trạng thái và quan hệ. Một chức năng chỉ được coi là hoàn thành khi ba mức không mâu thuẫn. Ví dụ, ẩn nút admin trên frontend không thay thế kiểm tra isAdmin ở backend.",
        "Đối với yêu cầu bảo mật, báo cáo tham chiếu tài liệu chính thức của framework và OWASP thay vì chỉ dựa trên hành vi demo. Cách tiếp cận này dẫn tới việc chuyển token khỏi localStorage, bổ sung cookie HttpOnly và xác minh tài khoản ACTIVE trong mỗi request. Với nguồn tin bên ngoài, yêu cầu được xác thực bằng chạy đồng bộ thật và kiểm tra domain, canonical URL, tóm tắt và ngày đăng."
    ])
    add_topic(doc, "2.4", "Phạm vi chức năng", [
        "Nhóm chức năng công khai gồm trang chủ, lịch thi đấu, kết quả, chi tiết trận, thông tin sân, câu hỏi thường gặp, chính sách, liên hệ, nhà tài trợ và chatbot. Dữ liệu công khai chỉ chứa thông tin phục vụ truyền thông và mua vé; không cung cấp doanh thu, danh sách người dùng hoặc mã QR vé.",
        "Nhóm chức năng người dùng gồm đăng ký, đăng nhập, OAuth, hoàn thiện hồ sơ, gửi CCCD, đổi email/mật khẩu cho tài khoản LOCAL, chọn và giữ ghế, tạo đơn, xem vé. Các thao tác mua vé yêu cầu phiên hợp lệ, tài khoản ACTIVE, hồ sơ phù hợp và CCCD được duyệt. Người dùng chỉ truy cập đơn và vé của mình.",
        "Nhóm chức năng quản trị gồm dashboard, trận đấu, kho vé, vé giấy, đơn hàng, người dùng, audit log, scanner, sponsor và upload ảnh. Các endpoint thay đổi trạng thái được giới hạn vai trò và kiểm tra chuyển đổi hợp lệ. Bảng 2.2 tổng hợp các yêu cầu chức năng cốt lõi được dùng làm cơ sở thiết kế và kiểm thử."
    ])
    add_table_caption(doc, "2.2", "Yêu cầu chức năng cốt lõi")
    add_table(doc, ["Mã", "Yêu cầu", "Tiêu chí chấp nhận"], [
        ("F01", "Đăng ký và đăng nhập", "Email hợp lệ; mật khẩu ít nhất 8 ký tự gồm chữ và số; phiên cookie được tạo."),
        ("F02", "OAuth", "Đăng nhập Google/Facebook, liên kết đúng provider_id và hoàn thiện hồ sơ khi thiếu dữ liệu."),
        ("F03", "Hồ sơ", "Cập nhật họ tên, điện thoại 10 số, địa chỉ; không trả password."),
        ("F04", "Xác minh CCCD", "Gửi 12 số, không trùng tài khoản, chờ admin duyệt và khóa sau xác minh."),
        ("F05", "Quản lý trận", "Admin tạo/sửa/xóa trận chưa phát sinh dữ liệu; cấu hình giá và trạng thái."),
        ("F06", "Sinh kho vé", "Tạo đủ ghế còn thiếu, không trùng seat_code trong một trận."),
        ("F07", "Giữ ghế", "Chỉ giữ 1-4 ghế AVAILABLE trong 15 phút cho đúng người dùng."),
        ("F08", "Tạo đơn", "Ghế HELD thuộc người dùng; tổng tiền tính từ server; đơn PENDING có expires_at."),
        ("F09", "Duyệt đơn", "Chỉ PENDING chuyển SUCCESS/CANCELLED; SUCCESS sinh QR, CANCELLED hoàn ghế."),
        ("F10", "Vé của tôi", "Chỉ trả vé của người đăng nhập; QR chỉ xuất hiện sau SUCCESS."),
        ("F11", "Vé giấy", "Giữ, in, bán và khóa vé đã in khỏi kênh online."),
        ("F12", "Soát vé", "Chỉ nhận SOLD+SUCCESS hoặc PAPER_SOLD; chặn is_scanned."),
        ("F13", "Sponsor", "Admin quản lý logo, cấp, URL và thứ tự; public chỉ xem active."),
        ("F14", "Chatbot", "Tra dữ liệu nội bộ và tài liệu SLNAFC/VPF; trả nguồn an toàn."),
        ("F15", "Báo cáo", "Admin xem thống kê và xuất Excel theo phạm vi dữ liệu quản trị."),
    ], [700, 2450, 5354], 11)
    add_topic(doc, "2.5", "Yêu cầu phi chức năng", [
        "Yêu cầu bảo mật gồm băm mật khẩu, cookie HttpOnly, CORS theo FRONTEND_URL, kiểm tra Origin cho phương thức thay đổi dữ liệu, security headers, rate limit và phân quyền. File upload giới hạn một ảnh tối đa 5 MB, chỉ chấp nhận JPEG, PNG, WEBP, GIF và phải khớp magic bytes. Secret được lưu trong `.env` và bị loại khỏi Git.",
        "Yêu cầu toàn vẹn gồm khóa ngoại, unique index, transaction và vòng đời trạng thái rõ. Yêu cầu khả dụng gồm thông báo tiếng Việt, loading state, xử lý lỗi Axios và giao diện responsive. Yêu cầu bảo trì gồm tách controller/route/middleware, migration versioned, biến môi trường mẫu, script lint/test/build và kiểu TypeScript cho dữ liệu frontend.",
        "Yêu cầu hiệu năng ở mức đồ án là truy vấn có chỉ mục, giới hạn số dòng dashboard/chatbot, timeout nguồn ngoài và không trả dữ liệu thừa. Hệ thống chưa có benchmark tải hoặc SLA production. Vì vậy, báo cáo chỉ đánh giá hiệu năng bằng cấu trúc truy vấn và khả năng build/chạy, không đưa ra con số người dùng đồng thời khi chưa đo."
    ])
    add_table_caption(doc, "2.3", "Yêu cầu phi chức năng và cách kiểm chứng")
    add_table(doc, ["Nhóm", "Yêu cầu", "Cách kiểm chứng"], [
        ("Bảo mật", "Phiên, mật khẩu, phân quyền, upload và chống spam.", "Rà soát code, unit test, thử request không hợp lệ."),
        ("Toàn vẹn", "Không trùng ghế/QR/CCCD; chuyển trạng thái hợp lệ.", "Constraint, index, transaction, kiểm thử lifecycle."),
        ("Khả dụng", "Giao diện rõ, responsive, thông báo tiếng Việt.", "Kiểm tra luồng trên trình duyệt và production build."),
        ("Bảo trì", "Cấu trúc module, migration, env mẫu, type.", "Đọc cấu trúc mã nguồn, lint và hướng dẫn cài đặt."),
        ("Hiệu năng", "Truy vấn có giới hạn/chỉ mục; timeout nguồn ngoài.", "Phân tích SQL và cấu hình dịch vụ; chưa benchmark tải."),
    ], [1400, 3900, 3204])
    add_topic(doc, "2.6", "Quy tắc nghiệp vụ", [
        "Quy tắc thứ nhất là mỗi tài khoản/CCCD chỉ mua tối đa bốn vé cho một trận. Hạn mức phải tính cả vé đã mua thành công và số ghế đang tạo đơn, không chỉ số lượng của request hiện tại. Quy tắc thứ hai là ghế chỉ được giữ khi trận ON_SALE và người dùng đã VERIFIED. Quy tắc thứ ba là thời hạn giữ ghế/đơn là 15 phút; quá hạn thì đơn bị CANCELLED và ghế trở lại AVAILABLE.",
        "Quy tắc thứ tư là QR vé online chỉ được sinh sau khi đơn SUCCESS. Quy tắc thứ năm là một QR chỉ quét một lần. Quy tắc thứ sáu là vé giấy đã in không được trả về online. Quy tắc thứ bảy là admin không được xóa trận đã phát sinh vé đặt hoặc bán. Quy tắc thứ tám là email/CCCD/provider phải duy nhất theo điều kiện phù hợp.",
        "Quy tắc về nội dung bên ngoài là chatbot chỉ đồng bộ từ domain được cấu hình, chỉ trả URL HTTPS đã kiểm tra và không tuyên bố thông tin khi không có tài liệu. Đây là mở rộng của nguyên tắc nguồn sự thật: với vé, nguồn là database nội bộ; với tin CLB là SLNAFC; với giải đấu là VPF."
    ])
    add_topic(doc, "2.7", "Mô hình trạng thái", [
        "Ticket có năm trạng thái. AVAILABLE cho biết ghế có thể bán online; HELD cho biết ghế đang được một người dùng giữ tới held_until; SOLD cho biết vé online đã thuộc đơn thành công; PAPER_RESERVED là vé đã chuyển sang kênh giấy; PAPER_SOLD là vé giấy đã bán. Cờ is_printed và is_scanned bổ sung thông tin vật lý mà enum trạng thái không biểu diễn đầy đủ.",
        "Order có ba trạng thái chuẩn: PENDING, SUCCESS và CANCELLED. PENDING là đơn chờ quản trị viên xác nhận và có expires_at. SUCCESS là đơn được xác nhận thanh toán, ticket chuyển SOLD và có QR. CANCELLED là đơn bị từ chối hoặc hết hạn, ghế được hoàn nếu chưa bị kênh khác sử dụng. Việc loại bỏ PAID giúp frontend/backend/database dùng cùng từ vựng.",
        "CCCD có NOT_SUBMITTED, PENDING, VERIFIED và REJECTED. User có ACTIVE hoặc BANNED, role USER hoặc ADMIN, auth_provider LOCAL/GOOGLE/FACEBOOK. Mỗi mô hình trạng thái đều có tập chuyển hợp lệ; API không cho phép cập nhật tùy ý vì điều đó có thể phá vỡ chuỗi nghiệp vụ."
    ])
    add_table_caption(doc, "2.4", "Ma trận chuyển trạng thái chính")
    add_table(doc, ["Đối tượng", "Từ", "Sang", "Điều kiện"], [
        ("Ticket", "AVAILABLE", "HELD", "Trận ON_SALE, CCCD VERIFIED, ghế chưa bị giữ."),
        ("Ticket", "HELD", "AVAILABLE", "Hết 15 phút hoặc người dùng trả ghế."),
        ("Ticket", "HELD", "SOLD", "Đơn được xác nhận SUCCESS."),
        ("Ticket", "AVAILABLE", "PAPER_RESERVED", "Admin dành vé cho kênh giấy."),
        ("Ticket", "PAPER_RESERVED", "PAPER_SOLD", "Admin ghi nhận bán vé giấy."),
        ("Order", "PENDING", "SUCCESS", "Admin xác nhận giao dịch; sinh QR vé."),
        ("Order", "PENDING", "CANCELLED", "Admin hủy hoặc expires_at đã qua."),
        ("CCCD", "PENDING", "VERIFIED", "Admin duyệt và số CCCD không trùng."),
        ("CCCD", "PENDING", "REJECTED", "Ảnh/số không hợp lệ hoặc không đối soát được."),
    ], [1300, 1400, 1550, 4254], 11)
    add_topic(doc, "2.8", "Rủi ro và tiêu chí ưu tiên", [
        "Rủi ro ưu tiên cao gồm bán trùng ghế, phát hành QR trước thanh toán, chấp nhận QR lặp, lộ token/mật khẩu, quyền admin bị bỏ qua và vé giấy đã in quay lại online. Các rủi ro này ảnh hưởng trực tiếp tới tài sản hoặc khả năng vào sân nên được xử lý ở backend/CSDL, không chỉ qua thông báo UI.",
        "Rủi ro trung bình gồm ảnh upload giả định dạng, spam đăng nhập/chatbot, đơn PENDING tồn tại vô hạn, nguồn tin redirect lạ và mất ảnh trên hosting có ổ đĩa tạm. Hệ thống đã có magic-byte detection, rate limit, job dọn đơn, allowlist; riêng lưu ảnh production vẫn cần chuyển sang object storage.",
        "Rủi ro thấp hơn ở mức demo gồm khác biệt hiển thị giữa trình duyệt, nội dung FAQ chưa đầy đủ và dữ liệu mùa giải chưa được đồng bộ tự động vào bảng matches. Tiêu chí ưu tiên được xác định theo tác động tới toàn vẹn, bảo mật và khả năng trình diễn. Các hạng mục chưa xử lý được ghi rõ ở Chương 6 thay vì che giấu bằng giả định."
    ])

    # CHƯƠNG 3
    add_chapter(doc, 3, "Phân tích và thiết kế hệ thống")
    add_topic(doc, "3.1", "Kiến trúc tổng thể", [
        "Hệ thống được tổ chức theo mô hình client–server. Frontend Next.js đảm nhiệm giao diện, điều hướng và quản lý trạng thái phía trình duyệt; backend Express cung cấp REST API, xác thực, nghiệp vụ và truy cập PostgreSQL. Việc tách hai lớp giúp giao diện có thể thay đổi mà không làm biến dạng quy tắc bán vé. Mọi quyết định ảnh hưởng tới tiền, ghế, quyền hoặc QR đều được kiểm tra lại ở backend, kể cả khi frontend đã chặn trước.",
        "Frontend sử dụng App Router, các trang công khai và khu vực quản trị riêng. Axios gửi request kèm cookie; Redux Toolkit giữ trạng thái cần chia sẻ, còn state cục bộ dùng cho biểu mẫu và tương tác ngắn. Backend chia route, controller và middleware. Controller điều phối use case, middleware xác thực phiên/quyền, còn lớp truy vấn làm việc với PostgreSQL. Cấu trúc này phù hợp quy mô đồ án và vẫn đủ rõ để mở rộng thành service riêng khi tải tăng.",
        "PostgreSQL là nguồn sự thật cho tài khoản, trận, kho ghế, đơn, vé, nhà tài trợ, audit và tri thức chatbot. Ảnh hiện được backend ghi vào thư mục uploads và database chỉ lưu đường dẫn. Cách này thuận tiện cho máy đơn; khi triển khai nhiều instance hoặc nền tảng có ổ đĩa tạm, ảnh phải chuyển sang object storage và URL bền vững. Sơ đồ ban đầu dưới đây được giữ nguyên theo yêu cầu, sau đó báo cáo mô tả các thay đổi của phiên bản hoàn thiện."
    ])
    add_figure(doc, "architecture.png", "3.1", "Kiến trúc hệ thống trong thiết kế ban đầu", 15.0)
    add_body(doc, "Khác với sơ đồ ban đầu, phiên bản hoàn thiện không lưu JWT trong localStorage mà dùng cookie HttpOnly; đồng thời bổ sung module tri thức chatbot, audit log, kiểm tra nguồn ngoài và xử lý file upload an toàn. Sơ đồ vẫn có giá trị lịch sử vì thể hiện đúng ranh giới frontend–API–database, nhưng không được dùng để suy luận rằng mọi chi tiết bảo mật ban đầu còn giữ nguyên.")

    add_topic(doc, "3.2", "Phân rã chức năng và use case", [
        "Use case được phân theo ba phạm vi: công khai, người dùng đã xác thực và quản trị. Người chưa đăng nhập được xem thông tin; người dùng đã đăng nhập được quản lý hồ sơ và mua vé; quản trị viên vận hành dữ liệu. Phân rã này dẫn trực tiếp tới nhóm route và middleware. Một use case có thể đi qua nhiều module, ví dụ mua vé bao gồm auth, hồ sơ, CCCD, trận, kho ghế, đơn, QR và thông báo.",
        "Điều kiện trước và sau được ghi rõ để tránh coi một nút bấm là toàn bộ chức năng. Use case giữ ghế yêu cầu trận đang mở bán, tài khoản ACTIVE, CCCD VERIFIED và ghế AVAILABLE. Sau khi thành công, ghế thành HELD, có chủ sở hữu và thời điểm hết hạn. Use case duyệt đơn yêu cầu đơn PENDING chưa hết hạn; sau đó đơn SUCCESS, ghế SOLD và QR duy nhất được tạo trong cùng transaction.",
        "Sơ đồ use case ban đầu được giữ lại bên dưới. Phiên bản triển khai bổ sung đổi email có xác nhận mật khẩu hiện tại, quản lý sponsor, chatbot có dẫn nguồn, audit log và quy trình CCCD chi tiết hơn. Các chức năng bổ sung không phủ định sơ đồ mà phản ánh quá trình tinh chỉnh yêu cầu."
    ])
    add_figure(doc, "usecase.png", "3.2", "Sơ đồ use case trong thiết kế ban đầu", 15.0)
    add_table_caption(doc, "3.1", "Đặc tả một số use case trọng yếu")
    add_table(doc, ["Use case", "Điều kiện trước", "Luồng chính", "Kết quả"], [
        ("Đổi email", "Tài khoản LOCAL, phiên hợp lệ.", "Nhập email mới và mật khẩu hiện tại; server bcrypt.compare; kiểm tra email duy nhất.", "Email cập nhật, tăng token_version và yêu cầu đăng nhập lại."),
        ("Giữ ghế", "CCCD VERIFIED, trận ON_SALE.", "Chọn tối đa 4 ghế; server khóa/kiểm tra và đặt HELD 15 phút.", "Ghế có held_by, held_until; kênh khác không thể bán."),
        ("Duyệt đơn", "Admin; đơn PENDING còn hiệu lực.", "Đối soát; cập nhật đơn và vé trong transaction.", "SUCCESS và sinh QR hoặc CANCELLED và hoàn ghế."),
        ("Quét QR", "Admin/scanner; mã tồn tại.", "Tìm vé, kiểm tra đơn/trạng thái/is_scanned.", "Cho vào sân và đánh dấu hoặc trả lý do từ chối."),
        ("Hỏi chatbot", "Câu hỏi hợp lệ, chưa vượt rate limit.", "Tìm dữ liệu nội bộ và tài liệu đã đồng bộ; xếp hạng; tạo câu trả lời.", "Trả nội dung cùng URL nguồn an toàn."),
    ], [1550, 2150, 2850, 1954], 10.5)

    add_topic(doc, "3.3", "Thiết kế luồng giữ ghế và tạo đơn", [
        "Giữ ghế là vùng có nguy cơ tranh chấp cao nhất. Frontend chỉ hiển thị trạng thái gần nhất; backend mới quyết định cuối cùng. Khi nhận danh sách ticket id, server chuẩn hóa, loại trùng, kiểm tra số lượng và hạn mức. Trong transaction, các bản ghi phải còn AVAILABLE hoặc là HELD chưa hết hạn của chính người dùng. Nếu một ghế không hợp lệ, toàn bộ yêu cầu thất bại để người dùng chọn lại trên dữ liệu mới.",
        "Thời điểm hết hạn được tính ở server để không phụ thuộc đồng hồ máy khách. Trường held_until gắn với từng ghế và expires_at gắn với đơn. Job dọn dẹp hoặc request kế tiếp có thể giải phóng bản ghi quá hạn. Khi tạo đơn, server không tin tổng tiền từ frontend mà lấy giá theo khu vực/trận và tính lại. Order item liên kết ticket cụ thể giúp truy vết ghế nào thuộc đơn nào.",
        "Hình 3.3 là lưu đồ ban đầu dùng mốc 10 phút. Phiên bản hoàn thiện đã chuẩn hóa thành 15 phút ở cấu hình và thông điệp giao diện. Việc giữ hình gốc giúp đối chiếu tiến hóa thiết kế; quy tắc có hiệu lực của sản phẩm là 15 phút như nêu trong yêu cầu và mã nguồn hiện tại."
    ])
    add_figure(doc, "hold_flow.png", "3.3", "Luồng giữ ghế trong thiết kế ban đầu", 14.5)
    add_table_caption(doc, "3.2", "Kiểm tra bắt buộc trong luồng mua vé")
    add_table(doc, ["Bước", "Kiểm tra phía máy chủ", "Lỗi được ngăn"], [
        ("Xác thực", "Cookie hợp lệ; user tồn tại, ACTIVE; token_version khớp.", "Dùng phiên cũ hoặc tài khoản bị khóa."),
        ("Hồ sơ", "Thông tin bắt buộc và CCCD VERIFIED.", "Tài khoản chưa định danh mua vé."),
        ("Trận", "Tồn tại, ON_SALE, chưa diễn ra.", "Bán vé ngoài thời gian."),
        ("Số lượng", "1–4 ghế và tổng hạn mức theo trận không vượt 4.", "Lách giới hạn bằng nhiều request."),
        ("Kho ghế", "Đúng trận, trạng thái khả dụng, chưa bị người khác giữ.", "Bán trùng hoặc ghế giả."),
        ("Giá", "Tính lại từ cấu hình server.", "Sửa giá trong request."),
        ("Transaction", "Cập nhật ghế và đơn nguyên tử.", "Đơn có nhưng ghế chưa giữ hoặc ngược lại."),
    ], [1150, 4400, 2954], 10.5)

    add_topic(doc, "3.4", "Thiết kế nghiệp vụ vé giấy", [
        "Kênh vé giấy dùng chung kho ghế nhưng trạng thái riêng. Khi admin dành vé, AVAILABLE chuyển PAPER_RESERVED. Sau khi in, is_printed=true để thể hiện vé đã rời khỏi kiểm soát thuần số. Khi bán, trạng thái thành PAPER_SOLD; khi hủy phân bổ, chỉ vé chưa in mới có thể quay lại AVAILABLE. Quy tắc này ưu tiên ngăn hai kênh cùng sở hữu một ghế.",
        "Mỗi thao tác phải ghi người thực hiện và thời gian trong audit log. Danh sách in cần có mã ghế, khu vực, trận và mã xác thực đủ để scanner nhận biết nhưng không tiết lộ dữ liệu người mua không cần thiết. Hệ thống hiện ghi nhận việc in/bán thủ công; triển khai thật cần quy trình bàn giao, số seri phôi và đối soát tiền theo điểm bán.",
        "Lưu đồ ban đầu ở Hình 3.4 được bảo toàn. Bản triển khai làm chặt thêm điều kiện không hoàn về online sau khi in và đồng bộ scanner cho PAPER_SOLD. Đây là ví dụ cho việc thiết kế trạng thái phải phản ánh rủi ro vật lý, không chỉ các thao tác CRUD."
    ])
    add_figure(doc, "paper_flow.png", "3.4", "Luồng xử lý vé giấy trong thiết kế ban đầu", 14.5)

    add_topic(doc, "3.5", "Thiết kế xác thực và phân quyền", [
        "Đăng nhập LOCAL so sánh mật khẩu bằng bcrypt với cost factor 12. Khi đúng, backend ký token có user id và token_version rồi đặt vào cookie HttpOnly, Secure trong production và SameSite phù hợp. JavaScript phía trình duyệt không đọc được cookie; request gửi cookie tự động. Middleware đọc token, truy vấn user hiện tại và từ chối nếu tài khoản không ACTIVE hoặc token_version không khớp.",
        "Đổi email và đổi mật khẩu yêu cầu người dùng nhập mật khẩu hiện tại; giao diện không hiển thị, không điền sẵn và backend không bao giờ trả password/hash. Với tài khoản OAuth, backend từ chối luồng mật khẩu nội bộ vì không có bí mật LOCAL để xác minh. Sau thay đổi nhạy cảm, token_version tăng để vô hiệu hóa phiên cũ. Cách này xử lý đúng yêu cầu người dùng đã nêu và tránh coi việc đang mở trang là đủ quyền đổi danh tính.",
        "Phân quyền được thực hiện ở route bằng authenticate và isAdmin. Frontend ẩn chức năng chỉ để cải thiện trải nghiệm, không phải biện pháp bảo mật. Các request thay đổi dữ liệu còn được kiểm tra Origin, CORS giới hạn theo FRONTEND_URL và áp dụng rate limit cho đăng nhập/chatbot. Thiết kế bám nguyên tắc quản lý phiên OWASP [9] và lưu mật khẩu OWASP [10]."
    ])
    add_table_caption(doc, "3.3", "Ma trận quyền truy cập")
    add_table(doc, ["Tài nguyên", "Công khai", "USER", "ADMIN"], [
        ("Trận, kết quả, sponsor active", "Đọc", "Đọc", "Tạo/sửa/xóa có điều kiện"),
        ("Hồ sơ, CCCD", "Không", "Đọc/sửa của mình", "Xem/duyệt theo nghiệp vụ"),
        ("Giữ ghế, đơn, vé", "Không", "Tạo/xem của mình", "Duyệt, quản lý, báo cáo"),
        ("Scanner và vé giấy", "Không", "Không", "Thực hiện và audit"),
        ("Nguồn tri thức", "Hỏi chatbot", "Hỏi chatbot", "Đồng bộ/kiểm tra nguồn"),
        ("Audit log", "Không", "Không", "Đọc có phân trang"),
    ], [2700, 1700, 2050, 2054])

    add_topic(doc, "3.6", "Thiết kế chatbot có truy xuất nguồn", [
        "Chatbot không được huấn luyện lại mô hình bằng dữ liệu không kiểm soát. Đồ án sử dụng hướng truy xuất tăng cường: đồng bộ tài liệu từ SLNAFC và VPF, lưu nội dung đã làm sạch, lập chỉ mục tìm kiếm toàn văn, lấy các đoạn liên quan rồi tạo câu trả lời dựa trên ngữ cảnh. Dữ liệu nội bộ về trận và quy định được ưu tiên vì có cấu trúc và cập nhật trực tiếp từ hệ thống.",
        "Bộ đồng bộ chỉ chấp nhận hostname trong allowlist, URL HTTPS và canonical URL hợp lệ. Request ra ngoài có timeout, giới hạn kích thước và số redirect. HTML được trích xuất phần nội dung, chuẩn hóa khoảng trắng, tính content hash để tránh ghi lại tài liệu không đổi. Mỗi document lưu source, URL, tiêu đề, ngày đăng, thời điểm đồng bộ và trạng thái.",
        "Khi trả lời, bot tìm các tài liệu liên quan bằng PostgreSQL full-text search, kết hợp từ khóa và dữ liệu trận. Nếu bằng chứng không đủ, bot nói chưa tìm thấy thay vì suy diễn. Mỗi kết luận về tin tức kèm tiêu đề và URL nguồn chính thức. Cơ chế này giảm sai lệch nhưng không loại bỏ hoàn toàn; quản trị viên vẫn cần giám sát nguồn, ngày cập nhật và thay đổi cấu trúc website."
    ])
    add_table_caption(doc, "3.4", "Pipeline tri thức của chatbot")
    add_table(doc, ["Giai đoạn", "Xử lý", "Biện pháp tin cậy"], [
        ("Nguồn", "Khai báo SLNAFC/VPF và loại nội dung.", "Allowlist domain, HTTPS, trạng thái active."),
        ("Thu thập", "Tải HTML với timeout/size limit.", "Chặn redirect/URL bất thường và lỗi mạng."),
        ("Chuẩn hóa", "Bỏ script/style, lấy tiêu đề/nội dung/ngày.", "Canonical URL và content hash."),
        ("Lưu trữ", "knowledge_documents + chỉ mục tìm kiếm.", "Unique URL/hash; thời điểm đồng bộ."),
        ("Truy xuất", "Xếp hạng đoạn theo câu hỏi.", "Giới hạn top-k, ưu tiên dữ liệu cấu trúc."),
        ("Trả lời", "Tổng hợp ngắn gọn và đính nguồn.", "Không có bằng chứng thì nêu giới hạn."),
    ], [1500, 3750, 3254], 11)

    add_topic(doc, "3.7", "Thiết kế API và xử lý lỗi", [
        "API theo nguyên tắc tài nguyên, dùng JSON và mã HTTP nhất quán. Route công khai chỉ trả trường cần thiết; route cá nhân lấy user id từ phiên thay vì nhận từ client; route admin đi qua middleware quyền. Controller kiểm tra đầu vào trước khi truy vấn và trả thông báo tiếng Việt đủ hành động. Lỗi nội bộ được log nhưng response không tiết lộ stack trace hoặc SQL.",
        "Đối với thao tác lặp, thiết kế ưu tiên tính idempotent ở mức hợp lý. Sinh kho chỉ tạo ghế còn thiếu; đồng bộ nguồn bỏ qua content hash không đổi; quét QR lần hai trả kết quả đã sử dụng thay vì cập nhật lại. Duyệt đơn kiểm tra trạng thái hiện tại để request lặp không sinh nhiều QR. Các điểm này quan trọng khi mạng chậm khiến người dùng bấm lại.",
        "Phân trang được áp dụng cho danh sách quản trị và audit; bộ lọc được whitelist thay vì ghép trực tiếp vào SQL. Giá trị truy vấn dùng placeholder để chống SQL injection. File upload đi qua Multer memory storage, kiểm tra dung lượng, MIME khai báo và magic bytes trước khi ghi. Tên file do server sinh, không dùng nguyên tên từ client."
    ])
    add_table_caption(doc, "3.5", "Nhóm endpoint tiêu biểu")
    add_table(doc, ["Nhóm", "Phương thức/đường dẫn", "Quyền", "Mục đích"], [
        ("Auth", "POST /api/auth/login; logout; me", "Public/User", "Tạo, hủy và kiểm tra phiên."),
        ("Profile", "PUT /api/users/profile; email; password", "User", "Cập nhật hồ sơ và thông tin nhạy cảm."),
        ("Matches", "GET /api/matches; admin CRUD", "Public/Admin", "Tra cứu và quản trị trận."),
        ("Tickets", "hold; release; checkout; my-tickets", "User", "Vòng đời vé online."),
        ("Orders", "list; detail; approve/cancel", "User/Admin", "Theo dõi và duyệt đơn."),
        ("Paper", "reserve; print; sell; release", "Admin", "Vận hành vé giấy."),
        ("Sponsors", "public list; admin CRUD/upload", "Public/Admin", "Hiển thị và quản lý tài trợ."),
        ("Chatbot", "POST /api/chatbot; sync", "Public/Admin", "Hỏi đáp có nguồn và đồng bộ."),
    ], [1300, 3050, 1350, 2804], 10.5)

    add_topic(doc, "3.8", "Thiết kế trải nghiệm và khả năng truy cập", [
        "Giao diện ưu tiên tiếng Việt, trạng thái rõ và hành động phục hồi. Ghế dùng màu kèm nhãn/chú giải; không chỉ dựa vào màu. Bộ đếm thời gian thể hiện 15 phút nhưng khi về 0 phải tải lại từ server. Biểu mẫu hiển thị lỗi cạnh trường và giữ dữ liệu không nhạy cảm. Mật khẩu luôn là input password, không điền sẵn; nút hiển thị mật khẩu chỉ do người dùng chủ động và không làm lộ hash.",
        "Khu vực quản trị dùng bảng có phân trang, xác nhận trước thao tác quan trọng và thông báo kết quả. Scanner cần phản hồi lớn, tương phản và phân biệt hợp lệ/đã quét/không hợp lệ. Ảnh sponsor có alt text từ tên nhà tài trợ; URL ngoài mở an toàn. Responsive được xử lý để luồng mua vé dùng được trên điện thoại, nhưng sơ đồ ghế vẫn cần kiểm thử thêm với màn hình nhỏ và thao tác cảm ứng.",
        "Accessibility được xem là yêu cầu tiếp tục cải thiện. Các thành phần Ant Design cung cấp nền tảng bàn phím/ARIA, nhưng ứng dụng vẫn cần kiểm thử thủ công focus order, label, thông báo động và độ tương phản. Báo cáo không tuyên bố đạt chuẩn WCAG khi chưa audit đầy đủ; đây là hạng mục trong hướng phát triển."
    ])

    # CHƯƠNG 4
    add_chapter(doc, 4, "Thiết kế dữ liệu và cài đặt")
    add_topic(doc, "4.1", "Mô hình dữ liệu", [
        "Mô hình dữ liệu xoay quanh users, matches, tickets và orders. User sở hữu nhiều đơn; trận có nhiều ticket; order liên kết tập ticket được mua. Các bảng sponsor, audit_logs, knowledge_sources và knowledge_documents hỗ trợ truyền thông, truy vết và chatbot. Khóa ngoại bảo vệ quan hệ, còn unique index xử lý quy tắc không thể diễn đạt chỉ bằng code.",
        "ERD ban đầu ở Hình 4.1 được giữ nguyên. Trong bản triển khai, order_status được chuẩn hóa thành SUCCESS thay cho PAID, thêm trường phiên/token_version, các trạng thái vé giấy, bảng nguồn tri thức và document. Do đó hình được xem là mốc thiết kế ban đầu; mô tả bảng sau đây mới là căn cứ của sản phẩm hoàn thiện."
    ])
    add_figure(doc, "erd.png", "4.1", "Mô hình quan hệ dữ liệu trong thiết kế ban đầu", 15.0)
    add_table_caption(doc, "4.1", "Các bảng dữ liệu chính trong phiên bản hoàn thiện")
    add_table(doc, ["Bảng", "Vai trò", "Ràng buộc đáng chú ý"], [
        ("users", "Tài khoản, hồ sơ, OAuth, CCCD, trạng thái.", "Email/provider/CCCD duy nhất; password không trả qua API."),
        ("matches", "Lịch đấu, sân, thời gian, giá, trạng thái.", "Giá không âm; trạng thái trong tập cho phép."),
        ("tickets", "Một ghế của một trận và vòng đời online/giấy.", "Unique(match_id, seat_code); qr_code unique khi có."),
        ("orders", "Giao dịch mua vé và thời hạn.", "Trạng thái PENDING/SUCCESS/CANCELLED; user FK."),
        ("order_items", "Liên kết đơn với ticket và giá tại thời điểm mua.", "Không để một ticket thuộc nhiều đơn hiệu lực."),
        ("sponsors", "Tên, logo, cấp, URL, thứ tự và active.", "URL/ảnh được validate; public chỉ active."),
        ("audit_logs", "Hành động admin và dữ liệu truy vết.", "Actor, action, entity, metadata, timestamp."),
        ("knowledge_sources", "Cấu hình nguồn tin chính thức.", "Domain allowlist, loại nguồn, active."),
        ("knowledge_documents", "Nội dung đã chuẩn hóa cho tìm kiếm.", "Canonical URL/hash; chỉ mục full-text."),
    ], [1700, 3500, 3304], 10.5)

    add_topic(doc, "4.2", "Ràng buộc, chỉ mục và transaction", [
        "Ràng buộc CSDL là lớp phòng thủ cuối. Unique(match_id, seat_code) ngăn sinh trùng ghế; qr_code unique ngăn hai vé dùng một mã; email và CCCD unique theo điều kiện ngăn trùng danh tính. Check constraint giữ giá/số lượng hợp lệ và trạng thái trong miền xác định. Khóa ngoại xác định hành vi khi xóa; dữ liệu đã phát sinh giao dịch không bị cascade tùy tiện [11].",
        "Chỉ mục được chọn theo truy vấn thật: trạng thái vé theo match_id, đơn theo user_id/status, match theo thời gian, audit theo created_at, document theo nguồn và full-text vector. Chỉ mục làm tăng chi phí ghi nên không tạo cho mọi cột. PostgreSQL mô tả cách chỉ mục hỗ trợ truy vấn nhưng cần đo trên dữ liệu thực [7]; vì vậy đồ án dùng EXPLAIN ở mức kiểm tra hướng truy cập và để benchmark tải cho giai đoạn sau.",
        "Transaction bao bọc các chuyển đổi có nhiều câu lệnh. Duyệt SUCCESS cập nhật order, ticket và QR; nếu bất kỳ bước nào lỗi thì rollback. Hủy đơn cập nhật trạng thái và hoàn ghế có điều kiện. Bán vé giấy vừa đổi trạng thái vừa ghi audit. PostgreSQL bảo đảm các thay đổi trong transaction được commit cùng nhau hoặc không thay đổi [6]."
    ])
    add_table_caption(doc, "4.2", "Một số chỉ mục và mục tiêu")
    add_table(doc, ["Đối tượng", "Khóa/chỉ mục", "Mục tiêu"], [
        ("tickets", "UNIQUE(match_id, seat_code)", "Không có hai bản ghi cho cùng ghế/trận."),
        ("tickets", "UNIQUE(qr_code) WHERE qr_code IS NOT NULL", "QR toàn hệ thống không trùng."),
        ("tickets", "INDEX(match_id, status, held_until)", "Hiển thị kho và giải phóng ghế quá hạn."),
        ("orders", "INDEX(user_id, created_at DESC)", "Trang lịch sử đơn của người dùng."),
        ("orders", "INDEX(status, expires_at)", "Tìm đơn PENDING hết hạn."),
        ("users", "UNIQUE(lower(email))", "Email không trùng khác hoa/thường."),
        ("knowledge_documents", "GIN(search_vector)", "Tìm kiếm toàn văn cho chatbot."),
        ("audit_logs", "INDEX(created_at DESC, action)", "Tra cứu hoạt động quản trị."),
    ], [2100, 3500, 2904], 10.5)

    add_topic(doc, "4.3", "Migration và dữ liệu khởi tạo", [
        "Schema được quản lý bằng migration có thứ tự thay vì sửa tay. Mỗi migration tạo hoặc biến đổi một nhóm cấu trúc, có điều kiện tránh lỗi khi chạy lại ở môi trường phù hợp và được ghi nhận trong quy trình cài đặt. Khi đổi tên trạng thái PAID thành SUCCESS, migration phải cập nhật dữ liệu cũ, constraint và code trong cùng phiên bản triển khai.",
        "Dữ liệu seed chỉ phục vụ phát triển: tài khoản quản trị mẫu, trận minh họa, cấu hình ghế và nguồn tri thức. Mật khẩu mặc định không dùng cho production; hướng dẫn yêu cầu thay đổi ngay và lưu secret qua biến môi trường. Seed không nên xóa dữ liệu đang có. Với production, backup trước migration và kế hoạch rollback là bắt buộc.",
        "Các môi trường phải dùng cùng phiên bản PostgreSQL tương thích và timezone rõ ràng. Thời điểm lưu dạng timestamp chuẩn, API trả ISO 8601, frontend định dạng theo Asia/Ho_Chi_Minh. Cách này hạn chế sai hạn giữ ghế khi máy chủ và trình duyệt khác múi giờ."
    ])

    add_topic(doc, "4.4", "Cài đặt backend", [
        "Backend khởi tạo Express, security middleware, JSON parser, cookie parser, CORS, route và error handler theo thứ tự. CORS chỉ cho origin cấu hình; credentials bật để gửi cookie. Security headers giảm bề mặt tấn công trình duyệt. Rate limit riêng được áp dụng cho đăng nhập và chatbot vì hai endpoint dễ bị tự động hóa.",
        "Controller xác thực input và dùng câu SQL tham số hóa qua pg. Logic nghiệp vụ phức tạp như checkout/dọn đơn dùng client transaction. Mã lỗi được phân biệt: 400 cho đầu vào/trạng thái sai, 401 cho thiếu phiên, 403 cho thiếu quyền/tài khoản bị khóa, 404 cho tài nguyên không thuộc phạm vi và 409 cho xung đột duy nhất. Error handler che chi tiết nội bộ.",
        "Mật khẩu băm cost 12, JWT tuân cấu trúc token chuẩn [8] nhưng token chỉ là bằng chứng phiên chứ không thay thế tra user. token_version xử lý logout toàn bộ/đổi thông tin nhạy cảm. Cookie được xóa với cùng thuộc tính khi logout. Không endpoint nào serialize password_hash."
    ])
    add_table_caption(doc, "4.3", "Cấu hình môi trường quan trọng")
    add_table(doc, ["Biến", "Ý nghĩa", "Yêu cầu vận hành"], [
        ("DATABASE_URL", "Chuỗi kết nối PostgreSQL.", "Secret; TLS khi dịch vụ yêu cầu; pool giới hạn."),
        ("JWT_SECRET", "Khóa ký phiên.", "Ngẫu nhiên dài; không commit; luân chuyển có kế hoạch."),
        ("FRONTEND_URL", "Origin frontend được phép.", "Đúng scheme/host; không dùng wildcard với credentials."),
        ("NODE_ENV", "Chế độ runtime.", "production bật Secure cookie và giảm log nhạy cảm."),
        ("UPLOAD_DIR", "Thư mục ảnh cục bộ.", "Chỉ phù hợp máy đơn; backup/quyền ghi rõ."),
        ("KNOWLEDGE_*", "Nguồn, timeout, giới hạn đồng bộ.", "Allowlist chính thức và lịch đồng bộ hợp lý."),
    ], [1900, 3250, 3354])

    add_topic(doc, "4.5", "Cài đặt frontend", [
        "Frontend dùng Next.js App Router [2]. Layout chứa điều hướng, provider và khung thông báo; page phụ trách dữ liệu/hiển thị theo route. React chia UI thành component có trách nhiệm hẹp [3]. TypeScript mô tả model request/response, giảm lỗi tên trạng thái và trường null [4]. Ant Design cung cấp form, table, modal, notification và thành phần responsive.",
        "Auth state được khởi tạo bằng endpoint me thay vì đọc token. Route quản trị kiểm tra vai trò để điều hướng nhưng backend vẫn là nơi thực thi quyền. Axios cấu hình withCredentials và interceptor chuẩn hóa lỗi. Khi 401, ứng dụng xóa trạng thái người dùng và chuyển về đăng nhập; không hiển thị lỗi kỹ thuật thô.",
        "Trang đổi thông tin tách dữ liệu hồ sơ khỏi thông tin nhạy cảm. Email mới và mật khẩu hiện tại được nhập trống mỗi lần; không có trường hiển thị mật khẩu hiện tại sẵn. Sau thành công, người dùng được yêu cầu đăng nhập lại. Trang sponsor render ảnh từ URL backend; trong production base URL phải trỏ tới CDN/object storage."
    ])

    add_topic(doc, "4.6", "Lưu trữ và phục vụ ảnh", [
        "Ảnh nhà tài trợ và ảnh đội bóng hiện được gửi multipart tới backend. Multer giữ file trong bộ nhớ, backend kiểm tra giới hạn 5 MB, MIME và chữ ký đầu file, sinh tên an toàn rồi ghi vào backend/uploads. Database lưu đường dẫn tương đối hoặc URL, không lưu blob. Static middleware phục vụ ảnh cho frontend. Cách này trả lời rõ câu hỏi ảnh được lưu ở đâu trong phiên bản hiện tại.",
        "Giải pháp cục bộ phù hợp chạy một máy và demo. Nó không phù hợp Vercel/Render dạng filesystem tạm hoặc nhiều backend instance vì file có thể mất sau deploy và không đồng bộ giữa máy. Production nên dùng S3-compatible storage, Cloudinary hoặc dịch vụ object storage; database lưu public URL/key, upload có signed URL hoặc backend stream, và CDN phân phối ảnh.",
        "Khi chuyển storage cần migration đường dẫn, chính sách xóa ảnh cũ, backup và giới hạn quyền. Logo/ảnh đội bóng là nội dung có bản quyền; quản trị viên cần dùng tài sản được phép. Alt text, kích thước hiển thị và phiên bản ảnh thu nhỏ giúp accessibility và hiệu năng."
    ])
    add_table_caption(doc, "4.4", "So sánh phương án lưu ảnh")
    add_table(doc, ["Tiêu chí", "Thư mục backend/uploads", "Object storage + CDN"], [
        ("Phù hợp", "Demo, máy đơn, triển khai nội bộ.", "Production, nhiều instance, cloud."),
        ("Độ bền", "Phụ thuộc ổ đĩa và backup máy chủ.", "Thiết kế cho lưu trữ bền và versioning."),
        ("Mở rộng", "Khó đồng bộ giữa instance.", "Dùng chung key/URL, mở rộng độc lập."),
        ("Hiệu năng", "Backend phục vụ trực tiếp.", "CDN cache gần người dùng."),
        ("Chi phí/độ phức tạp", "Thấp, cài đặt đơn giản.", "Có phí và cần quản lý credential/lifecycle."),
        ("Khuyến nghị", "Giữ cho đồ án local.", "Chuyển trước khi triển khai chính thức."),
    ], [1700, 3300, 3504])

    add_topic(doc, "4.7", "Cài đặt đồng bộ nguồn chính thức", [
        "Nguồn SLNAFC [12] và VPF [13] được khai báo trong knowledge_sources. Tác vụ đồng bộ có thể chạy thủ công bởi admin hoặc theo lịch. Nó lấy trang danh sách, chọn liên kết cùng domain, tải chi tiết, trích tiêu đề/nội dung/ngày và upsert theo canonical URL. content_hash giúp nhận biết thay đổi, còn last_synced_at phục vụ giám sát.",
        "Không dùng một trình duyệt không giới hạn để crawl tùy ý. Hostname được so khớp chính xác, giao thức phải HTTPS, địa chỉ IP nội bộ/localhost bị từ chối, redirect được kiểm tra lại. Timeout và kích thước tối đa bảo vệ tài nguyên. Nội dung HTML được coi là dữ liệu không tin cậy; script và chỉ dẫn trong trang không được thực thi hoặc đưa thành lệnh hệ thống.",
        "Nếu cấu trúc website thay đổi, parser có thể không lấy được nội dung. Hệ thống ghi lỗi theo nguồn và giữ document cũ thay vì xóa ngay. Bot hiển thị ngày nguồn và chỉ dùng tài liệu active. Quản trị viên cần bảng theo dõi số bài đồng bộ, lỗi gần nhất và thời điểm cuối để phát hiện dữ liệu cũ."
    ])

    add_topic(doc, "4.8", "Triển khai và vận hành", [
        "Quy trình triển khai gồm cài dependency, cấu hình env, chạy migration, seed có kiểm soát, build frontend, khởi động backend và kiểm tra health endpoint. Reverse proxy chấm dứt TLS, chuyển /api và /uploads phù hợp. Cookie Secure yêu cầu HTTPS. Database phải hạn chế network, dùng user quyền tối thiểu và backup định kỳ.",
        "Log production cần cấu trúc, có request id và không ghi password, token, CCCD đầy đủ hay QR. Audit log nghiệp vụ khác log kỹ thuật: audit trả lời ai làm gì với đối tượng nào; log kỹ thuật phục vụ lỗi/hiệu năng. Cảnh báo nên bao gồm tỷ lệ 5xx, pool DB, job dọn đơn, đồng bộ tri thức và dung lượng storage.",
        "Khôi phục được kiểm tra bằng restore backup, không chỉ tạo file backup. Deploy schema cần tương thích ngược trong thời gian frontend/backend thay phiên. Với cập nhật ảnh, CDN cache cần versioned key. Những thực hành này chưa được tự động hóa đầy đủ trong đồ án local nhưng là yêu cầu trước khi phục vụ người dùng thật."
    ])

    # CHƯƠNG 5
    add_chapter(doc, 5, "Kiểm thử và đánh giá")
    add_topic(doc, "5.1", "Chiến lược kiểm thử", [
        "Kiểm thử tập trung vào rủi ro. Unit test bao phủ hàm/nhánh nghiệp vụ có thể cô lập; kiểm thử API kiểm tra middleware, validation và trạng thái; lint/build phát hiện lỗi cú pháp, type và đóng gói frontend. Rà soát schema đối chiếu constraint với yêu cầu. Kiểm thử thủ công đi qua các luồng người dùng và quản trị trên trình duyệt.",
        "Dữ liệu kiểm thử phải gồm cả đường thành công và thất bại: user chưa xác minh, ghế đã giữ, đơn hết hạn, email trùng, mật khẩu hiện tại sai, QR đã quét và nguồn ngoài timeout. Với thao tác transaction, kiểm tra sau lỗi rằng không có cập nhật một phần. Với quyền, thử public, USER và ADMIN thay vì chỉ tài khoản hợp lệ.",
        "Kết quả được ghi trung thực theo phạm vi thực thi. Bộ test tự động hiện có 8 trường hợp và đều đạt; frontend lint/build và backend lint đạt tại thời điểm rà soát. Điều này chứng minh baseline kỹ thuật, chưa chứng minh khả năng chịu tải, độ an toàn tuyệt đối hoặc tương thích mọi thiết bị."
    ])
    add_table_caption(doc, "5.1", "Ma trận kiểm thử chức năng trọng yếu")
    add_table(doc, ["Mã", "Kịch bản", "Kỳ vọng", "Kết quả"], [
        ("T01", "Đăng nhập đúng/sai mật khẩu.", "Tạo cookie hoặc trả 401; không lộ nguyên nhân chi tiết.", "Đạt"),
        ("T02", "Đổi email không nhập/sai mật khẩu hiện tại.", "Từ chối; email không đổi; không hiển thị mật khẩu cũ.", "Đạt"),
        ("T03", "USER gọi endpoint admin.", "403; dữ liệu không thay đổi.", "Đạt"),
        ("T04", "Hai request giữ cùng ghế.", "Chỉ một request thành công.", "Đạt ở logic/constraint; cần tải đồng thời mở rộng"),
        ("T05", "Tạo đơn với giá client sửa.", "Server tính lại tổng tiền.", "Đạt"),
        ("T06", "Duyệt đơn SUCCESS.", "Order SUCCESS, ticket SOLD, QR duy nhất.", "Đạt"),
        ("T07", "Hủy/đơn hết hạn.", "CANCELLED và ghế khả dụng trở lại nếu hợp lệ.", "Đạt"),
        ("T08", "Quét QR hai lần.", "Lần đầu hợp lệ; lần sau báo đã quét.", "Đạt"),
        ("T09", "Upload file giả ảnh/quá 5 MB.", "Từ chối trước khi ghi file.", "Đạt"),
        ("T10", "Chatbot có/không có bằng chứng.", "Kèm nguồn chính thức hoặc nêu chưa tìm thấy.", "Đạt theo dữ liệu thử"),
    ], [700, 2600, 3500, 1704], 10.2)

    add_topic(doc, "5.2", "Kiểm thử bảo mật", [
        "Rà soát xác nhận password_hash không xuất hiện trong response profile/admin. Trường email nhạy cảm yêu cầu currentPassword; OAuth bị chặn đúng luồng. Cookie có HttpOnly, production Secure, SameSite và thời hạn. Middleware kiểm tra user ACTIVE/token_version mỗi request, vì token chưa hết hạn không có nghĩa tài khoản còn được phép.",
        "SQL dùng placeholder; bộ lọc động được whitelist. Upload kiểm tra magic bytes, tên do server sinh và thư mục tách khỏi code. CORS/Origin hạn chế request thay đổi dữ liệu, rate limit giảm brute force/spam. Chatbot chỉ truy cập domain chính thức cấu hình, chống SSRF cơ bản qua URL validation và giới hạn redirect.",
        "Các kiểm tra trên là defense-in-depth, không thay thế pentest. Chưa thực hiện DAST toàn diện, dependency scanning liên tục, CSP tinh chỉnh theo production hoặc kiểm tra hạ tầng cloud. Trước triển khai thật cần quét dependency, rotation secret, TLS, WAF/rate limiting ở edge và đánh giá quyền database/storage."
    ])
    add_table_caption(doc, "5.2", "Đối chiếu rủi ro và biện pháp")
    add_table(doc, ["Rủi ro", "Biện pháp hiện có", "Cần bổ sung production"], [
        ("Chiếm phiên", "HttpOnly cookie, token_version, ACTIVE check.", "Rotation, revoke store tùy quy mô, giám sát bất thường."),
        ("Brute force", "Rate limit đăng nhập, bcrypt cost 12.", "Edge limit, CAPTCHA thích ứng, cảnh báo."),
        ("SQL injection", "Parameterized query, whitelist sort/filter.", "SAST/DAST và quyền DB tối thiểu."),
        ("Upload độc hại", "Size/MIME/magic bytes, tên server.", "Virus scan, object storage, CSP/CDN."),
        ("SSRF từ nguồn", "Allowlist, HTTPS, timeout, redirect validation.", "Egress firewall/DNS pinning theo hạ tầng."),
        ("Lộ dữ liệu log", "Che stack/secret và audit có phạm vi.", "DLP, retention, quyền truy cập log."),
    ], [2000, 3300, 3204], 10.5)

    add_topic(doc, "5.3", "Kiểm thử vòng đời vé", [
        "Kiểm thử bắt đầu từ kho sạch, sinh ghế, giữ, tạo đơn, duyệt, xem QR và quét. Ở mỗi bước kiểm tra cả API và database. Sau giữ, held_by/held_until phải đúng; sau checkout, giá item là giá server; trước SUCCESS, qr_code phải null; sau SUCCESS, QR tồn tại, duy nhất và order liên kết đúng; sau scan, is_scanned cùng scanned_at được ghi.",
        "Nhánh hết hạn đặt thời gian quá khứ, chạy cleanup và xác nhận PENDING thành CANCELLED, HELD thành AVAILABLE. Nhánh admin hủy có kết quả tương tự nhưng audit actor là admin. Nhánh vé giấy kiểm tra PAPER_RESERVED, is_printed, PAPER_SOLD và không thể release vé đã in. Các invariant này quan trọng hơn việc UI hiển thị đúng một thời điểm.",
        "Kiểm thử đồng thời cơ bản dựa vào transaction/constraint; để khẳng định khả năng tải cần công cụ tạo nhiều request song song và dataset lớn. Đồ án chưa công bố TPS hoặc percentile latency. Hướng phát triển là benchmark endpoint hold/checkout, theo dõi deadlock và cân nhắc SELECT FOR UPDATE/locking strategy phù hợp khi lưu lượng thực được biết."
    ])

    add_topic(doc, "5.4", "Kiểm thử chatbot và nguồn", [
        "Bộ câu hỏi gồm lịch/trận đã có trong database, tin CLB có trong SLNAFC, thông tin giải có trong VPF, câu hỏi không liên quan và câu hỏi về dữ liệu mới chưa đồng bộ. Kỳ vọng là câu trả lời dựa trên đúng nhóm nguồn, URL trỏ domain chính thức, không tạo link lạ và thừa nhận thiếu dữ liệu.",
        "Kiểm thử đồng bộ gồm nguồn trả 200, timeout, HTML thay cấu trúc, redirect khác domain, bài không có ngày, nội dung trùng hash và source bị disable. Hệ thống phải giữ dữ liệu cũ khi lần đồng bộ mới lỗi, ghi last_error và không đưa HTML/script vào câu trả lời. Tài liệu mới phải tìm được qua full-text search sau upsert.",
        "Đánh giá chất lượng chatbot hiện là kiểm tra chức năng, chưa phải benchmark học thuật với bộ dữ liệu gán nhãn. Có thể mở rộng bằng tập câu hỏi–đáp chuẩn, đo precision của nguồn, tỷ lệ câu có citation đúng, groundedness và độ mới. Mỗi lần thay prompt/retrieval cần chạy lại evaluation để tránh cải thiện câu này nhưng làm giảm câu khác."
    ])
    add_table_caption(doc, "5.3", "Kịch bản đánh giá chatbot")
    add_table(doc, ["Câu hỏi", "Nguồn kỳ vọng", "Tiêu chí"], [
        ("SLNA thi đấu trận tiếp theo khi nào?", "matches nội bộ; nếu thiếu thì nguồn chính thức.", "Ngày/đối thủ nhất quán, có nguồn khi lấy ngoài."),
        ("Tin mới nhất của CLB là gì?", "slnafc.com", "Không lấy blog không chính thức; kèm URL/ngày."),
        ("Quy định/diễn biến giải V-League?", "vpf.vn", "Kèm nguồn VPF và không trộn phỏng đoán."),
        ("Thông tin không có trong kho?", "Không có", "Nêu chưa tìm thấy, gợi ý kiểm tra nguồn."),
        ("URL do người dùng yêu cầu crawl", "Không tự thêm", "Chỉ nguồn allowlist/admin cấu hình."),
    ], [3000, 2700, 2804], 10.5)

    add_topic(doc, "5.5", "Kiểm thử giao diện và khả năng sử dụng", [
        "Các luồng được chạy ở kích thước desktop và mobile: đăng nhập, hồ sơ, CCCD, chọn ghế, checkout, vé của tôi, admin duyệt và scanner. Kiểm tra loading, empty state, lỗi mạng và refresh giữa luồng. Countdown không được coi là quyền; sau hết giờ, request server xác nhận và UI tải lại kho.",
        "Biểu mẫu đổi email được kiểm tra đặc biệt: trường mật khẩu hiện tại rỗng, type=password, không lấy từ API/state; email hiện tại chỉ hiển thị dạng text; email mới validate; submit sai không làm mất kiểm soát. Sau đổi thành công, phiên cũ bị vô hiệu và UI đưa về đăng nhập. Đây là thay đổi trực tiếp từ phản hồi người dùng.",
        "Bảng admin kiểm tra phân trang, lọc, xác nhận modal và thông báo. Hình sponsor/đội bóng kiểm tra URL hỏng có fallback phù hợp. Các kiểm tra accessibility cơ bản gồm label, bàn phím, focus và alt text; vẫn cần công cụ audit và người dùng thật để kết luận đầy đủ."
    ])

    add_topic(doc, "5.6", "Kết quả công cụ và chất lượng mã", [
        "Tại thời điểm hoàn thiện báo cáo, bộ kiểm thử backend hiện có chạy 8/8 trường hợp thành công. Lint frontend và backend thành công; production build frontend thành công. Kết quả cho thấy code đáp ứng quy tắc tĩnh và đóng gói được với dependency hiện tại. File env thật không được đưa vào báo cáo/kho mã; env mẫu mô tả biến cần thiết.",
        "Rà soát thủ công tập trung vào chênh lệch giữa frontend, backend và schema. Các điểm đã chuẩn hóa gồm thời hạn giữ 15 phút, trạng thái SUCCESS, QR sau thanh toán, mật khẩu hiện tại khi đổi email, cookie HttpOnly, ảnh upload và chatbot nguồn chính thức. Migration giúp database cũ theo kịp code mới.",
        "Số lượng test còn khiêm tốn so với phạm vi. Ưu tiên tiếp theo là integration test với PostgreSQL test container, test transaction cạnh tranh, Playwright cho luồng chính và security scan dependency. Coverage nên dùng để tìm vùng chưa kiểm tra, không dùng như chỉ số duy nhất."
    ])
    add_table_caption(doc, "5.4", "Tổng hợp kiểm tra kỹ thuật")
    add_table(doc, ["Hạng mục", "Kết quả", "Ý nghĩa/Giới hạn"], [
        ("Backend tests", "8/8 đạt", "Baseline nghiệp vụ được kiểm tra; cần tăng integration/concurrency."),
        ("Backend lint", "Đạt", "Không có lỗi lint trong phạm vi cấu hình."),
        ("Frontend lint", "Đạt", "Quy tắc mã frontend thỏa tại thời điểm chạy."),
        ("Frontend production build", "Đạt", "Type/bundle tạo được; không thay benchmark runtime."),
        ("Rà soát schema/migration", "Đạt phạm vi đồ án", "Constraint/index nhất quán; cần rehearsal production."),
        ("Load/pentest/accessibility audit", "Chưa đầy đủ", "Không đưa ra tuyên bố chưa được đo."),
    ], [2500, 1600, 4404])

    add_topic(doc, "5.7", "Đánh giá mức đáp ứng", [
        "Hệ thống đáp ứng luồng cốt lõi từ công bố trận tới bán/soát vé, có kênh online và giấy trên cùng kho. Các kiểm soát quan trọng nằm ở backend/database. Module sponsor và upload giải quyết nội dung truyền thông; chatbot truy xuất nguồn chính thức và kèm liên kết, phù hợp yêu cầu giảm thông tin sai.",
        "Mức sẵn sàng hiện là prototype hoàn chỉnh cho đồ án và triển khai thử nghiệm có kiểm soát, chưa phải production đại trà. Chưa tích hợp cổng thanh toán/webhook thật, object storage, email/SMS, quan sát hệ thống đầy đủ, kiểm thử tải/pentest và quy trình vận hành sân. Phân loại này giúp tránh đánh đồng build thành công với vận hành an toàn.",
        "Giá trị lớn nhất là mô hình trạng thái và nguyên tắc nguồn sự thật được thể hiện xuyên lớp. Hạn chế lớn nhất là các tích hợp bên ngoài và đánh giá quy mô. Các hạng mục này được chuyển thành lộ trình Chương 6 với tiêu chí nghiệm thu cụ thể."
    ])

    add_topic(doc, "5.8", "Thiết kế dữ liệu và môi trường kiểm thử", [
        "Dữ liệu kiểm thử được chia thành ba nhóm để kết quả có thể lặp lại. Nhóm chuẩn chứa một quản trị viên, nhiều người dùng LOCAL/OAuth, tài khoản ACTIVE/BANNED, hồ sơ CCCD ở đủ bốn trạng thái, trận DRAFT/ON_SALE/CLOSED/FINISHED và kho ghế theo khu vực. Nhóm biên chứa email khác hoa thường, số điện thoại sai độ dài, giá bằng không/âm, trận sát thời điểm hiện tại, ghế có held_until vừa hết hạn và đơn PENDING ở hai phía của mốc expires_at. Nhóm xung đột tạo email, CCCD, seat_code và qr_code trùng để xác nhận constraint hoạt động.",
        "Mỗi kịch bản cần tự tạo dữ liệu riêng hoặc rollback để không phụ thuộc thứ tự chạy. Thời gian nên được truyền qua clock giả ở unit test, thay vì chờ thật 15 phút. Integration test dùng database tách biệt, chạy migration giống production, seed tối thiểu và xóa schema sau phiên. Không dùng dữ liệu cá nhân thật; CCCD, email và số điện thoại đều là giá trị giả có cấu trúc hợp lệ. File ảnh mẫu gồm JPEG/PNG đúng, file quá dung lượng, MIME khai sai và file văn bản đổi đuôi.",
        "Đối với chatbot, snapshot tài liệu chứa tiêu đề, ngày, canonical URL và nội dung ngắn từ nguồn giả lập cùng domain kiểm thử. Unit test parser không phụ thuộc mạng; một nhóm kiểm thử tích hợp riêng mới gọi nguồn thật và được phép bỏ qua khi mạng không sẵn sàng. Cách tách này tránh build thất bại ngẫu nhiên do website ngoài, đồng thời vẫn có tác vụ định kỳ kiểm tra connector SLNAFC/VPF.",
        "Môi trường kiểm thử ghi rõ phiên bản Node, PostgreSQL, dependency lockfile, timezone và biến cấu hình không bí mật. Kết quả phải kèm commit/migration tương ứng. Khi một lỗi được sửa, thêm test hồi quy tái tạo lỗi trước đó; ví dụ đổi email không có currentPassword, đơn SUCCESS không sinh QR hoặc vé giấy đã in bị release. Nhờ vậy, bộ test trở thành tài liệu hành vi có thể chạy chứ không chỉ danh sách thao tác thủ công."
    ])
    add_table_caption(doc, "5.5", "Bộ dữ liệu biên đề xuất")
    add_table(doc, ["Đối tượng", "Dữ liệu biên", "Điều cần xác nhận"], [
        ("Email", "Hoa/thường, khoảng trắng, trùng, sai định dạng.", "Chuẩn hóa và unique; không đổi khi mật khẩu sai."),
        ("Mật khẩu", "7/8 ký tự, thiếu chữ/số, sai current password.", "Validation thống nhất và bcrypt compare."),
        ("CCCD", "11/12/13 số, ký tự, trùng tài khoản.", "Chỉ 12 số, unique và vòng duyệt đúng."),
        ("Ghế", "Danh sách rỗng, trùng id, >4, sai trận, vừa bị giữ.", "Từ chối nguyên tử, không cập nhật một phần."),
        ("Thời gian", "Trước/đúng/sau held_until và expires_at.", "So sánh theo giờ server, giải phóng đúng."),
        ("Ảnh", "0 byte, >5 MB, MIME giả, magic bytes sai.", "Từ chối trước khi ghi; không tạo URL rác."),
        ("Nguồn", "Timeout, redirect, HTML rỗng, hash không đổi.", "Giữ dữ liệu cũ, ghi lỗi, không crawl ngoài allowlist."),
    ], [1700, 3900, 2904], 10.2)

    add_topic(doc, "5.9", "Kịch bản nghiệm thu theo vai trò", [
        "Nghiệm thu người dùng bắt đầu từ trạng thái chưa đăng nhập. Người kiểm thử xem lịch, mở chi tiết trận, đăng ký tài khoản, đăng nhập và hoàn thiện hồ sơ. Khi CCCD chưa VERIFIED, hệ thống giải thích vì sao chưa mua được và dẫn tới bước gửi xác minh. Sau khi admin duyệt, người dùng chọn ghế, nhìn thấy giá và thời hạn giữ, tạo đơn, theo dõi trạng thái PENDING rồi nhận QR sau SUCCESS. Refresh hoặc đăng nhập lại không làm mất quyền xem vé của chính mình.",
        "Nghiệm thu quản trị viên đi từ tạo trận và cấu hình giá tới sinh kho ghế. Admin xem phân bổ theo trạng thái, dành một số vé giấy, đánh dấu in/bán, duyệt CCCD, duyệt/hủy đơn online và xem dashboard. Mỗi thao tác quan trọng phải có xác nhận, thông báo và audit. Admin thử xóa trận đã phát sinh dữ liệu, release vé giấy đã in và duyệt lại đơn SUCCESS; hệ thống phải từ chối thay vì âm thầm sửa.",
        "Nghiệm thu scanner sử dụng QR hợp lệ, QR của đơn PENDING, QR không tồn tại, vé của trận khác và QR đã quét. Kết quả cần đủ lớn, dễ phân biệt và có thông tin ghế/trận tối thiểu để nhân viên xử lý nhanh. Khi mạng lỗi, giao diện không được hiển thị hợp lệ dựa trên dữ liệu cũ. Chế độ offline chỉ được bổ sung khi có cơ chế danh sách ký số và đồng bộ xung đột được thiết kế riêng.",
        "Nghiệm thu nội dung kiểm tra sponsor active/inactive, logo hỏng, thứ tự và liên kết ngoài; kiểm tra chatbot với câu hỏi có/không có tài liệu. Người nghiệm thu mở URL citation để xác nhận đúng domain, tiêu đề và thông tin hỗ trợ câu trả lời. Nếu bài quá cũ hoặc hai nguồn khác nhau, bot phải hiển thị ngày/nguồn và diễn đạt mức chắc chắn phù hợp."
    ])
    add_table_caption(doc, "5.6", "Biên bản nghiệm thu rút gọn")
    add_table(doc, ["Vai trò", "Điểm nghiệm thu bắt buộc", "Bằng chứng"], [
        ("Khách", "Xem trận/sponsor; không thấy dữ liệu cá nhân/admin.", "Ảnh màn hình và response public."),
        ("USER", "Hồ sơ, CCCD, giữ/đơn/vé của mình; đổi email an toàn.", "Kịch bản thao tác, trạng thái DB và lỗi biên."),
        ("ADMIN", "CRUD có điều kiện, duyệt, vé giấy, audit, báo cáo.", "Audit log, bảng trạng thái trước/sau."),
        ("Scanner", "Chỉ nhận vé đủ điều kiện và chỉ một lần.", "Kết quả năm loại QR và scanned_at."),
        ("Chatbot", "Trả đúng dữ liệu, kèm nguồn hoặc từ chối.", "Câu trả lời, URL, document được truy xuất."),
    ], [1500, 4200, 2804], 10.5)

    add_topic(doc, "5.10", "Phân tích hiệu năng và khả năng mở rộng", [
        "Không có số đo tải chính thức nên báo cáo không công bố số người dùng đồng thời. Tuy nhiên, có thể xác định điểm nóng từ luồng: đọc danh sách trận chủ yếu cache được; sơ đồ ghế đọc nhiều và thay đổi nhanh; hold/checkout là ghi cạnh tranh; scanner yêu cầu độ trễ thấp; chatbot phụ thuộc tìm kiếm và nguồn ngoài. Mỗi nhóm cần chiến lược khác nhau thay vì cache mọi thứ hoặc tách microservice sớm.",
        "Trước tiên cần tạo dataset gần thực tế gồm nhiều mùa, trận, hàng chục nghìn ticket, đơn và audit. Kịch bản tải tăng dần virtual user cho GET matches, GET inventory, POST hold và scan; đo throughput, p50/p95/p99, error rate, pool saturation và lock wait. Ngưỡng nghiệm thu được đặt theo hạ tầng dự kiến, ví dụ p95 API đọc và ghi, nhưng chỉ chốt sau lần đo baseline. Truy vấn chậm được phân tích bằng EXPLAIN ANALYZE và log, sau đó mới thêm/chỉnh index.",
        "Khả năng mở rộng bước đầu giữ kiến trúc modular monolith: nhiều backend instance stateless dùng chung PostgreSQL, cookie JWT và object storage. Job dọn đơn/đồng bộ cần distributed lock hoặc worker duy nhất để tránh chạy trùng. Cache Redis có thể giữ dữ liệu công khai và rate limit, nhưng trạng thái ghế cuối cùng vẫn ở database. WebSocket/SSE có thể đẩy thay đổi sơ đồ để giảm polling; client vẫn xác nhận lại khi hold.",
        "Khi tải đủ lớn, chatbot sync và xử lý tài liệu chuyển sang queue worker; email/SMS cũng chạy nền. Read replica phù hợp báo cáo/đọc không yêu cầu tức thời, nhưng không dùng để quyết định ghế vì replication lag. Partition audit/document theo thời gian chỉ cần khi kích thước chứng minh lợi ích. Microservice chỉ tách khi ranh giới sở hữu, tải và đội vận hành đủ rõ; nếu tách quá sớm sẽ tăng transaction phân tán và giám sát.",
        "Kế hoạch capacity phải bao gồm storage ảnh, backup, log và băng thông, không chỉ CPU. Ảnh được resize/CDN; audit có retention; database backup được kiểm tra restore; connection pool tổng của tất cả instance không vượt giới hạn. Mỗi lần tối ưu cần chạy lại test toàn vẹn, bởi tăng throughput nhưng bán trùng ghế là thất bại."
    ])
    add_table_caption(doc, "5.7", "Kế hoạch đo hiệu năng")
    add_table(doc, ["Luồng", "Chỉ số chính", "Rủi ro quan sát"], [
        ("Danh sách/chi tiết trận", "p95, cache hit, DB reads.", "Cache cũ, truy vấn N+1."),
        ("Sơ đồ ghế", "p95, payload, polling/SSE rate.", "Dữ liệu cũ, tải đọc đột biến."),
        ("Giữ ghế/checkout", "Success conflict rate, lock wait, p99.", "Deadlock, oversell, pool cạn."),
        ("Duyệt đơn/scanner", "p95, transaction error, duplicate scan.", "QR phát hành sai, ghi quét chậm."),
        ("Chatbot", "Retrieval latency, grounded answer rate.", "Nguồn chậm, index cũ, hallucination."),
        ("Upload ảnh", "Throughput, size rejection, storage error.", "Băng thông, file rác, mất object."),
    ], [2100, 2900, 3504], 10.5)

    add_topic(doc, "5.11", "Bảo vệ dữ liệu cá nhân và lưu vết", [
        "Hệ thống xử lý email, điện thoại, địa chỉ và CCCD, do đó cần nguyên tắc thu thập tối thiểu và mục đích rõ. API public không trả dữ liệu này; USER chỉ xem bản ghi của mình; ADMIN chỉ truy cập khi cần vận hành. Mật khẩu chỉ tồn tại dạng hash; log che token, password và số định danh. Ảnh CCCD nếu được lưu cần bucket private, URL có thời hạn và quyền truy cập tách khỏi ảnh sponsor công khai.",
        "Retention phải xác định thời gian giữ hồ sơ, đơn, audit và tài liệu chatbot. Xóa tài khoản không đồng nghĩa xóa ngay dữ liệu kế toán/audit có nghĩa vụ lưu; thay vào đó có thể vô hiệu hóa, ẩn danh phần không cần thiết và ghi căn cứ. Backup cũng chứa dữ liệu cá nhân nên cần mã hóa, kiểm soát quyền và hết hạn. Môi trường test không sao chép dữ liệu production nguyên trạng.",
        "Audit log ghi actor, hành động, entity, thời gian và metadata đã lọc, nhưng không ghi toàn bộ request có secret. Audit nên append-only ở quyền ứng dụng thông thường và có bộ lọc/phân trang cho admin được ủy quyền. Các hành động cần audit gồm đổi vai trò/trạng thái user, duyệt CCCD, duyệt/hủy đơn, in/bán vé giấy, thay sponsor/nguồn và đồng bộ thủ công.",
        "Khi xảy ra sự cố, runbook xác định cách thu hồi phiên qua token_version, khóa tài khoản, xoay secret, cô lập storage, bảo toàn log và thông báo bên liên quan. Đồ án mới cung cấp cơ chế kỹ thuật nền tảng; chính sách pháp lý, biểu mẫu đồng ý, thời hạn và người chịu trách nhiệm cần được đơn vị vận hành phê duyệt trước khi dùng dữ liệu thật."
    ])

    # CHƯƠNG 6
    add_chapter(doc, 6, "Kết quả, hạn chế và hướng phát triển")
    add_topic(doc, "6.1", "Kết quả đạt được", [
        "Đồ án đã xây dựng ứng dụng web đầy đủ frontend, backend và PostgreSQL cho quản lý bán vé bóng đá. Người dùng có thể đăng ký/đăng nhập, hoàn thiện hồ sơ, xác minh CCCD, xem trận, giữ ghế, tạo đơn, xem vé và QR sau khi được duyệt. Quản trị viên có thể quản lý trận, vé, đơn, vé giấy, scanner, người dùng, sponsor, ảnh, audit và báo cáo.",
        "Các lỗi thiết kế quan trọng đã được chỉnh: không hiển thị mật khẩu; đổi email/mật khẩu yêu cầu bí mật hiện tại cho LOCAL; dùng cookie HttpOnly; chuẩn hóa thời hạn 15 phút và trạng thái SUCCESS; QR chỉ sinh sau thanh toán; scanner chặn quét lặp; upload kiểm tra nội dung file; ảnh có mô hình lưu trữ rõ.",
        "Chatbot được mở rộng từ trả lời tĩnh sang truy xuất dữ liệu nội bộ và tài liệu SLNAFC/VPF. Nguồn được allowlist, nội dung được chuẩn hóa/lưu chỉ mục, câu trả lời kèm URL. Cách làm không phải huấn luyện mô hình mới mà là quản trị tri thức và bằng chứng, phù hợp nguồn lực đồ án và yêu cầu tin cậy."
    ])
    add_table_caption(doc, "6.1", "Đối chiếu mục tiêu và kết quả")
    add_table(doc, ["Mục tiêu", "Kết quả", "Mức độ"], [
        ("Bán vé online theo ghế", "Giữ 15 phút, checkout, duyệt, QR và scanner.", "Hoàn thành phạm vi demo"),
        ("Vé giấy cùng tồn kho", "Reserve/print/sell và khóa vé đã in.", "Hoàn thành nghiệp vụ cốt lõi"),
        ("Tài khoản an toàn", "Bcrypt, cookie HttpOnly, token_version, current password.", "Hoàn thành baseline"),
        ("Quản trị nội dung", "Trận, user, CCCD, sponsor, ảnh, audit, báo cáo.", "Hoàn thành"),
        ("Chatbot đáng tin cậy", "RAG nguồn SLNAFC/VPF, citation, allowlist.", "Hoàn thành prototype"),
        ("Production quy mô lớn", "Chưa payment/storage/monitor/load/pentest đầy đủ.", "Chưa thuộc phạm vi hoàn thành"),
    ], [2700, 3800, 2004], 10.5)

    add_topic(doc, "6.2", "Hạn chế", [
        "Thanh toán đang do admin xác nhận, chưa có webhook ký số, idempotency key và đối soát tự động. Điều này phù hợp demo nhưng làm tăng công việc và độ trễ. QR là mã nghiệp vụ; triển khai thật cần xem xét chữ ký, rotation và thiết bị scanner offline/online. Chính sách hoàn tiền, đổi vé và tranh chấp chưa được mô hình hóa đầy đủ.",
        "Ảnh lưu cục bộ nên phụ thuộc ổ đĩa máy chủ. Chatbot phụ thuộc cấu trúc HTML và độ mới của nguồn; full-text search chưa hiểu ngữ nghĩa sâu. Hệ thống chưa có hàng đợi job, cache phân tán hoặc cơ chế nhiều instance. Bộ test, benchmark và accessibility audit còn hạn chế.",
        "Dữ liệu đồ án là dữ liệu minh họa, không phải dữ liệu vận hành chính thức của CLB. Việc dùng logo, lịch và tin phải tuân quyền nội dung. Báo cáo giữ sơ đồ ban đầu nên một số nhãn trong hình khác phiên bản cuối; mỗi khác biệt đã được nêu thay vì chỉnh sửa hình gốc."
    ])

    add_topic(doc, "6.3", "Hướng phát triển ngắn hạn", [
        "Ưu tiên một là tích hợp cổng thanh toán có sandbox, webhook xác minh chữ ký, idempotency và bảng payment_events. Order chỉ SUCCESS khi webhook hợp lệ; job reconciliation đối chiếu giao dịch thiếu. Ưu tiên hai là chuyển ảnh sang object storage/CDN và migration các URL hiện có.",
        "Ưu tiên ba là integration/E2E test: PostgreSQL test instance, test cạnh tranh giữ ghế, Playwright luồng mua/duyệt/quét và bộ evaluation chatbot. CI phải chạy lint, test, build, migration check và dependency/security scan. Quan sát hệ thống thêm structured log, metric, trace và cảnh báo.",
        "Ưu tiên bốn là hoàn thiện accessibility/responsive, chính sách riêng tư/retention CCCD, audit quyền quản trị và quy trình backup–restore. Các hạng mục có thể triển khai theo sprint nhỏ, mỗi sprint có tiêu chí đo được thay vì chỉ thêm màn hình."
    ])
    add_table_caption(doc, "6.2", "Lộ trình phát triển đề xuất")
    add_table(doc, ["Giai đoạn", "Hạng mục", "Tiêu chí nghiệm thu"], [
        ("1", "Payment webhook + idempotency + reconciliation.", "Test sandbox; request lặp không tạo giao dịch trùng; audit đầy đủ."),
        ("2", "Object storage/CDN và migration ảnh.", "Deploy nhiều instance vẫn thấy ảnh; backup/lifecycle hoạt động."),
        ("3", "Integration, E2E, load và security CI.", "Luồng chính tự động; báo cáo tải/pentest có ngưỡng."),
        ("4", "Chatbot evaluation và semantic retrieval.", "Bộ câu hỏi chuẩn; citation accuracy/groundedness được đo."),
        ("5", "Accessibility, monitoring và runbook.", "Audit WCAG mục tiêu; cảnh báo và diễn tập restore/incident."),
    ], [1200, 3450, 3854], 10.5)

    add_topic(doc, "6.4", "Hướng phát triển chatbot", [
        "Kho tri thức có thể mở rộng bằng API/RSS chính thức nếu SLNA/VPF cung cấp, vì cấu trúc ổn định hơn crawl HTML. Mỗi connector có adapter, lịch, retry/backoff và dashboard độ mới. Không tự động thêm nguồn do người dùng đưa; nguồn mới cần admin phê duyệt domain, quyền sử dụng và loại nội dung.",
        "Retrieval có thể kết hợp full-text với embedding, nhưng phải giữ metadata/citation và lọc theo ngày/nguồn. Reranker xếp lại đoạn; prompt yêu cầu chỉ trả lời từ evidence. Bộ evaluation định kỳ đo đúng nguồn, đúng thời gian, mức bao phủ và từ chối hợp lý. Phản hồi người dùng được lưu có consent và không dùng mù quáng làm sự thật.",
        "Đối với dữ liệu thay đổi nhanh như lịch thi đấu, bot ưu tiên API/database có timestamp mới nhất; bài viết dùng để giải thích bối cảnh. Khi hai nguồn mâu thuẫn, bot nêu khác biệt và thời điểm thay vì tự chọn. Đây là nguyên tắc quan trọng để chatbot hữu ích nhưng không tạo cảm giác chắc chắn giả."
    ])

    add_topic(doc, "6.5", "Bài học kinh nghiệm", [
        "Bài học thứ nhất là trạng thái phải được xem như hợp đồng giữa UI, API và CSDL. Một tên PAID/SUCCESS không thống nhất có thể làm QR, thống kê và scanner sai dù từng màn hình chạy riêng. Bài học thứ hai là bảo mật cần được thiết kế theo dữ liệu nhạy cảm: không endpoint nào cần trả mật khẩu, và đổi danh tính phải xác minh lại.",
        "Bài học thứ ba là tính toàn vẹn cần constraint/transaction, không thể phụ thuộc người dùng bấm đúng. Bài học thứ tư là tích hợp nguồn ngoài phải coi mạng, URL và HTML là không tin cậy. Bài học thứ năm là hình vẽ ban đầu có giá trị lịch sử nhưng báo cáo phải ghi rõ thay đổi để người đọc không nhầm với kiến trúc hiện hành.",
        "Cuối cùng, kiểm thử thành công là bằng chứng có phạm vi. Tám test và build đạt là tín hiệu tốt nhưng không đủ cho production. Việc nêu rõ điều đã đo, điều chưa đo và lộ trình tiếp theo làm kết quả đồ án đáng tin cậy hơn một tuyên bố quá mức."
    ])

    add_major_heading(doc, "Kết luận")
    add_body(doc, "Đồ án đã phân tích, thiết kế và cài đặt hệ thống quản lý bán vé bóng đá cho bối cảnh SLNA với frontend Next.js, backend Express và PostgreSQL. Sản phẩm bao phủ vòng đời online và vé giấy, quản trị trận/đơn/người dùng/sponsor, QR scanner, audit và chatbot. Các yêu cầu nhạy cảm được xử lý ở server/database: mật khẩu băm và không hiển thị; đổi email cần mật khẩu hiện tại; phiên dùng HttpOnly cookie; ghế được giữ 15 phút; QR chỉ phát hành sau đơn SUCCESS; quét lặp bị chặn.")
    add_body(doc, "Đóng góp chính của đồ án là mô hình tích hợp có thể kiểm tra từ yêu cầu tới schema, API, giao diện và test. Chatbot được thiết kế theo RAG từ nguồn chính thức SLNAFC/VPF, có allowlist và citation, giúp tăng thông tin mà không tùy tiện lấy nguồn. Ảnh hiện lưu ở backend/uploads cho môi trường local và đã có đề xuất object storage/CDN cho production.")
    add_body(doc, "Kết quả lint, build và 8/8 test đạt xác nhận baseline kỹ thuật. Tuy nhiên hệ thống vẫn cần payment gateway thật, storage bền vững, integration/E2E/load/security/accessibility test và vận hành quan sát được trước khi triển khai đại trà. Với phạm vi đồ án, mục tiêu cốt lõi đã hoàn thành và nền tảng đủ rõ để tiếp tục phát triển theo lộ trình đã đề xuất.")

    add_major_heading(doc, "Tài liệu tham khảo")
    references = [
        "[1] Vercel, “Authentication in Next.js,” Next.js Documentation. [Online]. Available: https://nextjs.org/docs/app/guides/authentication. [Accessed: Aug. 17, 2026].",
        "[2] Vercel, “Next.js App Router,” Next.js Documentation. [Online]. Available: https://nextjs.org/docs/app. [Accessed: Aug. 17, 2026].",
        "[3] Meta Platforms, Inc., “Your First Component,” React Documentation. [Online]. Available: https://react.dev/learn/your-first-component. [Accessed: Aug. 17, 2026].",
        "[4] Microsoft, “The TypeScript Handbook,” TypeScript Documentation. [Online]. Available: https://www.typescriptlang.org/docs/handbook/intro.html. [Accessed: Aug. 17, 2026].",
        "[5] OpenJS Foundation, “Using middleware,” Express Documentation. [Online]. Available: https://expressjs.com/en/guide/using-middleware.html. [Accessed: Aug. 17, 2026].",
        "[6] PostgreSQL Global Development Group, “START TRANSACTION,” PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/sql-start-transaction.html. [Accessed: Aug. 17, 2026].",
        "[7] PostgreSQL Global Development Group, “Indexes,” PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/indexes.html. [Accessed: Aug. 17, 2026].",
        "[8] M. Jones, J. Bradley, and N. Sakimura, “JSON Web Token (JWT),” RFC 7519, May 2015. [Online]. Available: https://datatracker.ietf.org/doc/rfc7519/.",
        "[9] OWASP Foundation, “Session Management Cheat Sheet.” [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html. [Accessed: Aug. 17, 2026].",
        "[10] OWASP Foundation, “Password Storage Cheat Sheet.” [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. [Accessed: Aug. 17, 2026].",
        "[11] PostgreSQL Global Development Group, “Constraints,” PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/ddl-constraints.html. [Accessed: Aug. 17, 2026].",
        "[12] Câu lạc bộ Bóng đá Sông Lam Nghệ An, “Tin tức.” [Online]. Available: https://slnafc.com/tin-tuc. [Accessed: Aug. 17, 2026].",
        "[13] Công ty Cổ phần Bóng đá Chuyên nghiệp Việt Nam, “Trang thông tin chính thức VPF.” [Online]. Available: https://vpf.vn/. [Accessed: Aug. 17, 2026].",
    ]
    for ref in references:
        p = add_body(doc, ref, indent=False)
        p.paragraph_format.left_indent = Cm(0.8)
        p.paragraph_format.first_line_indent = Cm(-0.8)

    add_major_heading(doc, "Phụ lục A. Hướng dẫn cài đặt và chạy hệ thống")
    add_section_heading(doc, "A.1", "Yêu cầu môi trường")
    add_body(doc, "Máy phát triển cần Node.js phiên bản tương thích dự án, npm, PostgreSQL và trình duyệt hiện đại. Tạo database/user riêng, không dùng tài khoản superuser cho ứng dụng. Sao chép file env mẫu thành env cục bộ và điền DATABASE_URL, JWT_SECRET, FRONTEND_URL cùng cấu hình OAuth/nguồn nếu sử dụng. Không commit file chứa secret.")
    for item in [
        "Backend: cài dependency, chạy migration/seed có kiểm soát, sau đó chạy chế độ development hoặc production.",
        "Frontend: cài dependency, cấu hình base URL API, chạy development; trước bàn giao phải lint và production build.",
        "Uploads: bảo đảm backend/uploads tồn tại và process có quyền ghi trong môi trường local; production chuyển object storage.",
        "Kiểm tra: health API, đăng nhập admin, tạo trận thử, sinh ghế, luồng mua/duyệt/quét và chatbot có nguồn.",
    ]:
        add_bullet(doc, item)
    add_section_heading(doc, "A.2", "Thứ tự khởi tạo")
    add_table_caption(doc, "A.1", "Checklist cài đặt")
    add_table(doc, ["Bước", "Thao tác", "Kết quả mong đợi"], [
        ("1", "Cấu hình PostgreSQL và DATABASE_URL.", "Backend kết nối bằng user giới hạn quyền."),
        ("2", "Chạy migration theo thứ tự.", "Schema/constraint/index đầy đủ."),
        ("3", "Seed dữ liệu phát triển nếu cần.", "Có admin/trận/nguồn mẫu, không xóa dữ liệu cũ."),
        ("4", "Khởi động backend và frontend.", "Health, CORS và cookie hoạt động đúng origin."),
        ("5", "Chạy lint/test/build.", "Không lỗi trước khi nghiệm thu."),
        ("6", "Kiểm tra backup/log/upload.", "Có khả năng phục hồi và truy vết tối thiểu."),
    ], [900, 3900, 3704])

    add_major_heading(doc, "Phụ lục B. Danh mục trạng thái và mã lỗi")
    add_table_caption(doc, "B.1", "Từ điển trạng thái")
    add_table(doc, ["Đối tượng", "Giá trị", "Ý nghĩa"], [
        ("User", "ACTIVE / BANNED", "Được phép hoặc bị chặn sử dụng phiên."),
        ("Role", "USER / ADMIN", "Quyền người dùng thông thường hoặc quản trị."),
        ("CCCD", "NOT_SUBMITTED / PENDING / VERIFIED / REJECTED", "Vòng đời xác minh danh tính."),
        ("Match", "DRAFT / ON_SALE / CLOSED / FINISHED", "Vòng đời công bố và bán vé."),
        ("Ticket", "AVAILABLE / HELD / SOLD", "Vòng đời vé online."),
        ("Ticket", "PAPER_RESERVED / PAPER_SOLD", "Vòng đời vé giấy."),
        ("Order", "PENDING / SUCCESS / CANCELLED", "Chờ duyệt, thành công hoặc hủy/hết hạn."),
    ], [1500, 3600, 3404], 10.5)
    add_table_caption(doc, "B.2", "Quy ước mã HTTP")
    add_table(doc, ["Mã", "Cách dùng trong hệ thống", "Ví dụ"], [
        ("200/201", "Đọc/cập nhật hoặc tạo thành công.", "Đăng nhập, tạo đơn, upload ảnh."),
        ("400", "Input hoặc chuyển trạng thái không hợp lệ.", "Sai format, ghế không thuộc trận."),
        ("401", "Thiếu/sai/hết phiên.", "Cookie không có hoặc token_version cũ."),
        ("403", "Có phiên nhưng thiếu quyền/điều kiện.", "USER gọi admin; CCCD chưa VERIFIED."),
        ("404", "Không tồn tại hoặc không thuộc phạm vi người gọi.", "Đơn không thuộc user."),
        ("409", "Xung đột dữ liệu hoặc trạng thái.", "Email trùng, ghế vừa bị giữ."),
        ("429", "Vượt giới hạn request.", "Đăng nhập/chatbot quá nhanh."),
        ("500", "Lỗi nội bộ đã che chi tiết.", "Database/service lỗi ngoài dự kiến."),
    ], [900, 3800, 3804], 10.0)

    add_major_heading(doc, "Phụ lục C. Checklist nghiệm thu")
    for item in [
        "Không có password/password_hash trong response; đổi email/mật khẩu bắt buộc currentPassword đối với LOCAL.",
        "Cookie HttpOnly, Secure ở production; CORS/Origin đúng domain; tài khoản BANNED và token_version cũ bị từ chối.",
        "Giữ ghế 15 phút; hạn mức bốn vé; giá tính tại server; transaction ngăn cập nhật một phần.",
        "QR chỉ tồn tại sau SUCCESS; QR duy nhất; scanner từ chối đơn chưa thành công và quét lặp.",
        "Vé giấy đã in không trở lại online; mọi thao tác nhạy cảm có audit actor/thời gian/đối tượng.",
        "Ảnh đúng magic bytes, tối đa 5 MB, tên server; production dùng storage bền vững.",
        "Chatbot chỉ dùng nguồn được duyệt, kèm URL; khi thiếu bằng chứng phải nêu giới hạn.",
        "Migration, backup/restore, lint, test, build và health check hoàn tất trước deploy.",
    ]:
        add_bullet(doc, item)

    return doc


if __name__ == "__main__":
    document = build_document()
    enable_field_updates(document)
    document.save(OUTPUT)
    print(OUTPUT)
