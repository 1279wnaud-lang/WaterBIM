import os
import re
import json
import hashlib
import subprocess
import shutil
import tempfile
from table_utils import clean_spaced_text

def parse_markdown_table(lines):
    rows = []
    for line in lines:
        line = line.strip()
        if not line or not line.startswith('|'):
            continue
        if re.match(r'^\|\s*[-:]+\s*\|', line):
            continue
            
        cells = [c.strip() for c in line.split('|')[1:-1]]
        cleaned_cells = []
        for c in cells:
            c_text = c.replace('<br>', '\n').replace('<br/>', '\n')
            c_lines = [clean_spaced_text(l.strip()) for l in c_text.split('\n')]
            cleaned_cells.append('\n'.join(c_lines).strip())
            
        rows.append(cleaned_cells)
        
    if not rows:
        return None
        
    if rows:
        num_cols = len(rows[0])
        empty_cols = []
        for col in range(num_cols):
            if all(col >= len(r) or not r[col].strip() for r in rows):
                empty_cols.append(col)
                
        if empty_cols:
            for r in rows:
                for col in reversed(empty_cols):
                    if col < len(r):
                        r.pop(col)
                        
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        return None
        
    num_cols = len(rows[0])
    for col in range(min(2, num_cols)):
        last_val = ""
        for row_idx in range(len(rows)):
            if col < len(rows[row_idx]):
                val = rows[row_idx][col].strip()
                if val:
                    last_val = val
                elif last_val and len(last_val) <= 40:
                    # 병합 칸은 아래 행에 값을 채워 어느 항목인지 알게 한다. 다만 칸에 장(章) 전체가
                    # 들어간 신구대조표 같은 표에서는 복제가 폭발한다(한 문서가 9,558만 자가 됐다).
                    # 짧은 값일 때만 채운다.
                    rows[row_idx][col] = last_val
                    
    return {
        "type": "table",
        "rows": rows,
        "header_rows": 1
    }

def extract_hwp_markdown(filepath, rhwp_exe, is_kwsd):
    temp_dir = tempfile.mkdtemp()
    try:
        res = subprocess.run([rhwp_exe, "export-markdown", filepath, "-o", temp_dir], capture_output=True, text=True, encoding='utf-8')
        if res.returncode != 0:
            return None, {}, [], f"rhwp export-markdown error: {res.stderr}"
            
        md_files = sorted([f for f in os.listdir(temp_dir) if f.endswith('.md')])
        
        pages = []
        tables_dict = {}
        figures_list = []
        table_counter = 0
        seen_tables = {}
        
        for i, md_file in enumerate(md_files):
            page_num = i + 1
            with open(os.path.join(temp_dir, md_file), 'r', encoding='utf-8') as f:
                content = f.read()
                
            lines = content.split('\n')
            new_lines = []
            
            in_table = False
            table_lines = []
            
            for line in lines:
                m_img = re.match(r'^!\[.*?\]\((.*?)\)', line.strip())
                if m_img:
                    # FIGURES DISABLED BY USER
                    continue
                
                if line.strip().startswith('|'):
                    in_table = True
                    table_lines.append(line)
                else:
                    if in_table:
                        parsed_table = parse_markdown_table(table_lines)
                        if parsed_table:
                            # 같은 표가 쪽마다 되풀이되는 문서가 있다(신구대조표는 같은 표가 838번 실렸다).
                            # 내용이 같은 표는 한 번만 넣는다.
                            sig = hashlib.md5(json.dumps(parsed_table['rows'], ensure_ascii=False).encode('utf-8')).hexdigest()
                            if sig not in seen_tables:
                                seen_tables[sig] = table_counter
                                tables_dict[table_counter] = parsed_table
                                new_lines.append(f"\n[[TABLE_{table_counter}]]\n")
                                table_counter += 1
                        in_table = False
                        table_lines = []
                    l = line.replace('\\*', '*').replace('\\[', '[').replace('\\]', ']')
                    new_lines.append(l)
                    
            if in_table:
                parsed_table = parse_markdown_table(table_lines)
                if parsed_table:
                    tables_dict[table_counter] = parsed_table
                    new_lines.append(f"\n[[TABLE_{table_counter}]]\n")
                    table_counter += 1
            
            pages.append({"page": page_num, "text": '\n'.join(new_lines)})
            
        return pages, tables_dict, figures_list, None
    except Exception as e:
        return None, {}, [], str(e)
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
