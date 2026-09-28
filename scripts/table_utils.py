import re

def clean_spaced_text(raw):
    raw = re.sub(r'제\s+(\d+)\s+장', r'제\1장', raw)
    raw = re.sub(r'(\d+)\s*-\s*(\d+)', r'\1-\2', raw)
    
    res = []
    for line in raw.split('\n'):
        words = line.split()
        if len(words) >= 2 and all(len(w) == 1 and '가' <= w <= '힣' for w in words):
            res.append(line[:len(line) - len(line.lstrip())] + ''.join(words))
        elif re.search(r'(?:^|\s)[가-힣一-鿿] [가-힣一-鿿](?:\s|$)', line):
            line = re.sub(r'(?<=[가-힣一-鿿]) (?=[가-힣一-鿿](?![가-힣一-鿿]))', '', line)
            res.append(re.sub(r'\(\s+', '(', re.sub(r'\s+([),])', r'\1', line)))
        else:
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
    error = None
    
    for r in rows:
        cells = [c if c is not None else '' for c in r]
        cells = [str(c) for c in cells]
        cells = [clean_spaced_text(c) for c in cells]
        cells = [_merge_wrapped_lines(c) for c in cells]

        line_counts = [len(c.split('\n')) for c in cells if c.strip()]
        cnt = max(line_counts) if line_counts else 1
        if cnt > 1:
            if all(n in (1, cnt) for n in line_counts):
                for i in range(cnt):
                    row = []
                    for c in cells:
                        parts = c.split('\n')
                        row.append(parts[i] if len(parts) == cnt else (c if i == 0 else ''))
                    new_rows.append(row)
            else:
                new_rows.append(cells)
                error = f'줄 수 불일치(최대 {cnt}줄, 실제 {line_counts})'
        else:
            new_rows.append(cells)
            
    # filter out empty rows and cols
    if not new_rows:
        return new_rows, header_rows, error
        
    valid_cols = [j for j in range(len(new_rows[0])) if any(r[j].strip() for r in new_rows)]
    filtered_rows = []
    for r in new_rows:
        new_r = [r[j] for j in valid_cols]
        if any(c.strip() for c in new_r):
            filtered_rows.append(new_r)
            
    if not filtered_rows:
        return filtered_rows, header_rows, error

    header_rows = 1
    while header_rows < len(filtered_rows) and not str(filtered_rows[header_rows][0]).strip():
        header_rows += 1
        
    return filtered_rows, header_rows, error
