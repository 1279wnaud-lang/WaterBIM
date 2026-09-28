import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')
try:
    import pymupdf
except ImportError:
    print("pymupdf is required. Run: pip install pymupdf")
    sys.exit(1)

from text_cleanup import chunk_text
from table_utils import process_table

DATA_DIR = r"C:\Pruden_KH\.Data"
PDF_PATH = os.path.join(DATA_DIR, r"06.2026년 건설공사 표준품셈\2026년 건설공사 표준품셈.pdf")
OUT_DIR = r"C:\Pruden_KH\WaterBIM\data"






global_failures = []
global_missing_pages = []



def main():
    print("Opening PDF...")
    doc = pymupdf.open(PDF_PATH)
    
    print("Parsing TOC...")
    categories_start = {}
    expecting = None
    for i in range(2, 51):
        for b in doc[i].get_text('blocks'):
            txt = b[4].strip()
            m = re.fullmatch(r'(공통|토목|건축|기계설비|유지관리)부문', txt)
            if m:
                expecting = m.group(1)
            elif expecting:
                m2 = re.search(r'제\s*\d+\s*장\n[^\n]+\n(\d+)', txt)
                if m2:
                    categories_start[expecting] = int(m2.group(1))
                    expecting = None

    print(f"Categories Start: {categories_start}")
    
    # helper to find category by page
    def get_category_by_page(p):
        if not p: return None
        if p >= categories_start.get('유지관리', 857): return '유지관리'
        if p >= categories_start.get('기계설비', 645): return '기계설비'
        if p >= categories_start.get('건축', 569): return '건축'
        if p >= categories_start.get('토목', 307): return '토목'
        return '공통'

    pages = []
    tables_list = []
    table_counter = 0
    
    for page_num in range(len(doc)):
        if page_num < 56:
            continue
            
        page = doc[page_num]
        
        # Extract printed page from footer
        printed_page = None
            
        for b in page.get_text("blocks"):
            if b[6] != 0: continue
            if b[1] > 790:
                m2 = re.search(r'^\s*(\d+)\s*(?:\n|$)', b[4])
                if m2:
                    printed_page = int(m2.group(1))
                    break
            
        tabs = page.find_tables()
        tables_info = []
        for tab in tabs.tables:
            raw_rows = tab.extract()
            processed_rows, header_rows, error = process_table(raw_rows)
            if error:
                global_failures.append({"reason": error})
            tables_info.append({
                "bbox": tab.bbox,
                "rows": processed_rows,
                "header_rows": header_rows
            })
            
        # 쪽 첫머리에 책에 인쇄된 쪽 번호가 있다(PDF 401쪽 = 책 345쪽). 출처 표시에 함께 쓴다.
        book_page = next((l.strip() for l in page.get_text().split('\n')[:3] if re.fullmatch(r'\d{1,4}', l.strip())), None)

        blocks = page.get_text("blocks")
        items = []
        
        for b in blocks:
            x0, y0, x1, y1, text, block_no, block_type = b
            if block_type != 0: continue
            if y0 > 790: continue
            
            block_rect = pymupdf.Rect(x0, y0, x1, y1)
            in_table = False
            for tab in tabs.tables:
                tab_rect = pymupdf.Rect(tab.bbox)
                intersect = pymupdf.Rect(block_rect).intersect(tab_rect)
                if intersect.get_area() > block_rect.get_area() * 0.5:
                    in_table = True
                    break
                    
            if not in_table:
                # Replace multiple newlines with single newline to be safe
                text = text.replace('\r', '')
                items.append({"type": "text", "bbox": block_rect, "text": text})
                
        for t in tables_info:
            items.append({"type": "table", "bbox": pymupdf.Rect(t["bbox"]), "table": t})
            
        items.sort(key=lambda x: x["bbox"].y0)
        
        # Yield lines
        lines_stream = []
        for item in items:
            if item["type"] == "text":
                for line in item["text"].split('\n'):
                    sline = line.strip()
                    if not sline: continue
                    if re.match(r'^(공통|토목|건축|기계설비|유지관리)부문$', sline.replace(' ', '')): continue
                    if re.match(r'^\d+$', sline): continue
                    if sline == '2026': continue
                    
                    if lines_stream and lines_stream[-1][1].startswith('제') and re.match(r'^제\s*\d+\s*장$', lines_stream[-1][1].strip()):
                        lines_stream[-1] = (lines_stream[-1][0], lines_stream[-1][1] + ' ' + line)
                    else:
                        lines_stream.append((page_num + 1, line))
            elif item["type"] == "table":
                lines_stream.append((page_num + 1, f"[[TABLE_{table_counter}]]"))
                tables_list.append(item["table"])
                table_counter += 1
                
        pages.append({
            "page": page_num + 1,
            "printed_page": printed_page,
            "text": "\n".join(line for _, line in lines_stream)
        })

    page_printed = {p['page']: p['printed_page'] for p in pages if p.get('printed_page')}
        
    print(f"Total tables: {len(tables_list)}")
    
    # Custom patterns for pumsem
    heading_pattern = re.compile(r'^\s*(제\s*\d+\s*장|(?:\d{1,2}-){1,2}\d{1,2})\s+([가-힣A-Za-z(「\[].{0,60})$')
    
    def is_valid_heading(m):
        if not m: return False
        # m.group(1) is the number, m.group(2) is the text
        if m.group(1).startswith('제'): return True
        text_part = m.group(2).strip()
        if not re.match(r'^[가-힣A-Za-z(「\[]', text_part): return False
        return True
        
    toc_pattern = re.compile(r'\t\s*\d+\s*$')

    print("Chunking text...")
    chunks, long_chunks = chunk_text(pages, "2026년 건설공사 표준품셈", heading_pattern=heading_pattern, toc_pattern=toc_pattern, is_valid_heading=is_valid_heading)
    
    print("Reconstructing blocks...")
    final_chunks = []
    
    for chunk in chunks:
        blocks = []
        for part in chunk["text"].split('\n'):
            if part.startswith('[[TABLE_') and part.endswith(']]'):
                idx = int(part[8:-2])
                blocks.append({"type": "table", **tables_list[idx]})
            else:
                if blocks and blocks[-1]["type"] == "text":
                    blocks[-1]["text"] += "\n" + part
                else:
                    blocks.append({"type": "text", "text": part})
        
        chunk["blocks"] = blocks
        del chunk["text"]
        
        # Determine category and printed page
        if chunk["page"] in page_printed:
            chunk["printed_page"] = page_printed[chunk["page"]]
            chunk["category"] = get_category_by_page(chunk["printed_page"])
        else:
            # Fallback to previous chunk's category
            if len(final_chunks) > 0:
                chunk["category"] = final_chunks[-1]["category"]
            else:
                chunk["category"] = "공통"
            global_missing_pages.append({"page": chunk["page"], "clause_title": chunk["clause_title"]})
        final_chunks.append(chunk)
        
    # Document info
    doc_info = {
        "title": "2026년 건설공사 표준품셈",
        "revision_date": "2026",
        "path": "2026년 건설공사 표준품셈.pdf",
        "chunks": final_chunks
    }
    
    # Save index
    doc_str = json.dumps([doc_info], ensure_ascii=False, separators=(',', ':'))
    out_js = "pumsem-index.js"
    with open(os.path.join(OUT_DIR, out_js), 'w', encoding='utf-8') as f:
        f.write("window.PUMSEM_INDEX = window.PUMSEM_INDEX || [];\n")
        f.write("window.PUMSEM_INDEX.push(...(")
        f.write(doc_str)
        f.write("));\n")
        
    print("Saved data/pumsem-index.js")
    
    with open(os.path.join(OUT_DIR, "pumsem-manifest.js"), "w", encoding="utf-8") as f:
        f.write("window.PUMSEM_MANIFEST = ['pumsem-index.js'];\n")
    
    # Build report
    chapter_count = sum(1 for c in final_chunks if re.match(r'^제\s*\d+\s*장\.?', c["clause_title"].split()[0]))
    nm_count = sum(1 for c in final_chunks if re.match(r'^\d{1,2}-\d{1,2}\.?$', c["clause_title"].split()[0]))
    nmk_count = sum(1 for c in final_chunks if re.match(r'^\d{1,2}-\d{1,2}-\d{1,2}\.?$', c["clause_title"].split()[0]))

    report = {
        "total_pages": len(doc),
        "excluded_pages": 56,
        "items_count": len(final_chunks),
        "chapter_count": chapter_count,
        "nm_count": nm_count,
        "nmk_count": nmk_count,
        "tables_count": len(tables_list),
        "cells_count": sum(len(r) for t in tables_list for r in t["rows"]),
        "failures": global_failures,
        "missing_pages": global_missing_pages,
        "toc_categories": categories_start
    }
    
    with open(os.path.join(OUT_DIR, "pumsem-build-report.json"), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
        
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()
