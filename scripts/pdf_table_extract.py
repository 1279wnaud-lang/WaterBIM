import pymupdf
from table_utils import process_table
import re

def inject_pdf_tables_and_figures(filepath, pages, is_kwsd):
    tables_dict = {}
    table_counter = 0
    figures_list = []
    
    try:
        doc = pymupdf.open(filepath)
    except Exception as e:
        return pages, tables_dict, figures_list, str(e)
        
    new_pages = []
    page_text_map = {p["page"]: p["text"] for p in pages}
    
    for i, page in enumerate(doc):
        page_num = i + 1
        blocks = page.get_text("blocks")
        
        # FIGURES DISABLED BY USER

        # 2. Table Extraction
        tabs = page.find_tables()
        if not tabs.tables:
            text = page_text_map.get(page_num, "")
            if text:
                new_pages.append({"page": page_num, "text": text})
            continue
            
        tables_info = []
        for tab in tabs.tables:
            raw_rows = tab.extract()
            processed_rows, header_rows, error = process_table(raw_rows)
            if not processed_rows:
                continue
            tables_info.append({
                "bbox": tab.bbox,
                "rows": processed_rows,
                "header_rows": header_rows,
                "error": error
            })
            
        items = []
        for b in blocks:
            x0, y0, x1, y1, text, block_no, block_type = b
            if block_type != 0: continue
            
            block_rect = pymupdf.Rect(x0, y0, x1, y1)
            in_table = False
            for tab in tabs.tables:
                tab_rect = pymupdf.Rect(tab.bbox)
                intersect = pymupdf.Rect(block_rect).intersect(tab_rect)
                if intersect.get_area() > block_rect.get_area() * 0.5:
                    in_table = True
                    break
            
            if not in_table:
                text = text.replace('\r', '')
                items.append({"type": "text", "bbox": block_rect, "text": text})
                
        for t in tables_info:
            items.append({"type": "table", "bbox": pymupdf.Rect(t["bbox"]), "table": t})
            
        items.sort(key=lambda x: x["bbox"].y0)
        
        lines = []
        for item in items:
            if item["type"] == "text":
                lines.append(item["text"].strip('\n'))
            elif item["type"] == "table":
                lines.append(f"\n[[TABLE_{table_counter}]]\n")
                tables_dict[table_counter] = {
                    "type": "table",
                    "rows": item["table"]["rows"],
                    "header_rows": item["table"]["header_rows"]
                }
                if item["table"]["error"]:
                    tables_dict[table_counter]["error"] = item["table"]["error"]
                table_counter += 1
                
        text_joined = '\n'.join(lines).strip()
            
        if text_joined:
            new_pages.append({"page": page_num, "text": text_joined})
        
    doc.close()
    return new_pages, tables_dict, figures_list, None
