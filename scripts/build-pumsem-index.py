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

DATA_DIR = r"C:\Pruden_KH\.Data"
PDF_PATH = os.path.join(DATA_DIR, r"06.2026년 건설공사 표준품셈\2026년 건설공사 표준품셈.pdf")
OUT_DIR = r"C:\Pruden_KH\WaterBIM\data"

def clean_spaced_text(raw):
    raw = re.sub(r'제\s+(\d+)\s+장', r'제\1장', raw)
    raw = re.sub(r'(\d+)\s*-\s*(\d+)', r'\1-\2', raw)
    res = []
    for line in raw.split('\n'):
        words = line.split()
        if len(words) >= 2 and all(len(w) == 1 and '가' <= w <= '힣' for w in words):
            res.append(line[:len(line) - len(line.lstrip())] + ''.join(words))
        else:
            # 괄호·한자·영문이 섞인 칸('굴 착 기 + 부 착 용 집 게', '토 적 ( 높 이 , 너 비 )')은
            # 한 글자 한글 사이의 공백만 없앤다. 다른 글자 앞뒤 공백은 그대로 둔다.
            if re.search(r'(?:^|\s)[가-힣一-鿿] [가-힣一-鿿](?:\s|$)', line):
                line = re.sub(r'(?<=[가-힣一-鿿]) (?=[가-힣一-鿿](?![가-힣一-鿿]))', '', line)
                line = re.sub(r'\(\s+', '(', re.sub(r'\s+([),])', r'\1', line))  # '( 野面石 )' → '(野面石)'
            res.append(line)
    return '\n'.join(res)

def _merge_wrapped_lines(cell):
    out = []
    for line in cell.split('\n'):
        if out and out[-1].count('(') > out[-1].count(')'):
            out[-1] = out[-1] + ' ' + line.strip()
        else:
            out.append(line)
    return '\n'.join(out)


def process_table(rows):
    new_rows = []
    header_rows = 1
    
    # Process cells
    for r in rows:
        cells = [c if c is not None else '' for c in r]
        cells = [clean_spaced_text(c) for c in cells]
        
        # 한 항목이 칸 너비에 걸려 두 줄로 접힌 경우('이형철근 (교량 · 지하철및이와유사한' + '복잡한구조물의주철근)')
        # 괄호가 닫히지 않은 줄은 다음 줄과 합친다. 그래야 칸마다 줄 수가 맞아 행으로 나눌 수 있다.
        cells = [_merge_wrapped_lines(c) for c in cells]

        # 한 칸에 여러 줄이 겹쳐 들어온 행은 줄 수만큼 행으로 나눈다.
        # 여러 행에 걸친 칸(시공량 '250')은 1줄로 나오므로 첫 행에만 넣는다.
        line_counts = [len(c.split('\n')) for c in cells if c.strip()]
        cnt = max(line_counts) if line_counts else 1
        if cnt > 1 and all(n in (1, cnt) for n in line_counts):
            for i in range(cnt):
                row = []
                for c in cells:
                    parts = c.split('\n')
                    row.append(parts[i] if len(parts) == cnt else (c if i == 0 else ''))
                new_rows.append(row)
        else:
            new_rows.append(cells)
            
    # Detect header_rows
    # We count rows starting from row 1 where the first cell is empty, up to the end
    # Actually, in split rows, the first column might not be empty if it had same lines?
    # No, usually merged headers don't have same lines as data rows, so they don't get split.
    while header_rows < len(new_rows) and not str(new_rows[header_rows][0]).strip():
        header_rows += 1
        
    return new_rows, header_rows

def main():
    print("Opening PDF...")
    doc = pymupdf.open(PDF_PATH)
    
    pages = []
    tables_list = []
    table_counter = 0
    
    for page_num in range(len(doc)):
        if page_num < 56:
            continue
            
        page = doc[page_num]
        
        # Determine category from header
        category = "공통"
        text = page.get_text("text")
        m = re.search(r'(공통|토목|건축|기계설비|유지관리)부문', text)
        if m:
            category = m.group(1)
            
        tabs = page.find_tables()
        tables_info = []
        for tab in tabs.tables:
            raw_rows = tab.extract()
            processed_rows, header_rows = process_table(raw_rows)
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
            "book_page": book_page,
            "category": category,
            "text": "\n".join(line for _, line in lines_stream)
        })

    page_categories = {p['page']: p['category'] for p in pages}
    page_books = {p['page']: p.get('book_page') for p in pages}
        
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
        
        # Determine category
        chunk["category"] = page_categories.get(chunk["page"], "공통")
        # 책에 인쇄된 쪽 번호. 출처에 'PDF 401쪽(책 345쪽)'으로 함께 보여준다.
        if page_books.get(chunk["page"]):
            chunk["book_page"] = page_books[chunk["page"]]
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
    report = {
        "total_pages": len(doc),
        "excluded_pages": 56,
        "items_count": len(final_chunks),
        "tables_count": len(tables_list),
        "cells_count": sum(len(r) for t in tables_list for r in t["rows"]),
        "failures": []
    }
    
    with open(os.path.join(OUT_DIR, "pumsem-build-report.json"), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
        
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()
