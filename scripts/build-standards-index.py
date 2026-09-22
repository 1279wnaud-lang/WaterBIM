import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
import subprocess
import re

DATA_DIR = r"C:\Pruden_KH\.Data\03.설계기준_지침_자료실"
DB_PATH = os.path.join(DATA_DIR, "00_목록", "standards.sqlite")
RHWP_EXE = r"C:\Pruden_KH\rhwp\bin\rhwp\rhwp"
OUT_DIR = r"C:\Pruden_KH\WaterBIM\data"

SCOPES = [
    ("01_국가건설기준/상수도/", "supply"),
    ("01_국가건설기준/하수도/", "sewer"),
    ("01_국가건설기준/K-water_전문시방서/", "kwcs"),
    ("02_기관별_지침/상하수도_실무지침/", "guide"),
    # 상하수도 기준이 직접 참조하는 토목 공통 기준(굴착·흙막이·기초·콘크리트·내진·측량).
    ("01_국가건설기준/공통/", "civil"),
    ("01_국가건설기준/지반/", "civil"),
    ("01_국가건설기준/구조/", "civil"),
    ("01_국가건설기준/내진/", "civil"),
    ("01_국가건설기준/가설/", "civil"),
    ("01_국가건설기준/측량/", "civil"),
    # BIM 지침: K-water BIM 적용지침(본문·부속서 한글 파일)만. 국토부·조달청·다른 발주처 지침은 넣지 않는다(사용자 결정).
    # 같은 내용의 PDF 사본·엑셀 목록서는 bim_excluded에서 뺀다.
    ("03_기존보유_BIM/02.K-water BIM 적용지침/3-1. KWSP 10 20 01 개정/", "bim"),
    ("03_기존보유_BIM/02.K-water BIM 적용지침/3-2. KWSP 10 20 02 제정/", "bim"),
]


def bim_excluded(path):
    """BIM 범위에서 뺄 파일. 엑셀 목록서(WBS·속성정보세트·라이브러리·수량산출)는 코드검색 탭이 맡고 표 행이 수천 줄이라
    조항 검색 결과를 덮는다. K-water 폴더의 PDF는 같은 문서의 한글 파일 사본이고, 설계도면 예시는 그림뿐이다."""
    low = path.lower()
    if low.endswith(".xlsx"):
        return True
    if path.startswith("03_기존보유_BIM/02.K-water") and not low.endswith(".hwp"):
        return True
    return False


def category_of(path):
    for prefix, cat in SCOPES:
        if path.startswith(prefix):
            return cat
    return None



def get_all_documents():
    docs, replaced = get_core_documents()
    import json, datetime
    cat_path = r'C:\Pruden_KH\.Data\05.K-water_기술기준_2026-09-22\00_목록\catalog.json'
    cat = json.load(open(cat_path, encoding='utf-8'))
    
    old_by_path = {d['path']: d for d in docs}
    old_by_code = {d['code'].strip(): d for d in docs if d.get('code')}
    
    remove_paths = set()
    new_docs = []
    skipped_dam_river = []
    
    for doc in cat:
        path = doc['path']
        comp = doc.get('comparison')
        code = doc.get('code', '')
        title = doc.get('title', '')
        cat_type = doc.get('category', '')
        rev = doc.get('revision_date', '')
        
        if path.endswith('.zip') or path.endswith('.egg') or path.endswith('.drm'):
            continue
            
        if comp == '개정일 동일':
            continue
            
        final_cat = None
        if '설계지침' in cat_type or '적산지침' in cat_type or '설계도서' in cat_type:
            final_cat = 'kwdi'
        elif '과업표준분야' in cat_type or '유지운영분야' in cat_type or 'KWSP' in code or 'KWMI' in code:
            final_cat = 'kwsp'
        elif '자재구매시방서' in cat_type or comp == '사이트 게시본이 최신':
            final_cat = 'kwcs'
        else:
            final_cat = 'kwcs'
            
        if final_cat in ['kwdi', 'kwsp']:
            parts = code.split()
            if len(parts) >= 2 and parts[1] in ['51', '54']:
                skipped_dam_river.append(doc)
                continue
            
        if comp == '사이트 게시본이 최신':
            old_path = doc.get('previous_path')
            if old_path and old_path in old_by_path:
                remove_paths.add(old_path)
            elif code in old_by_code:
                remove_paths.add(old_by_code[code]['path'])
            new_docs.append({'path': '05.K-water_기술기준_2026-09-22/' + path.replace('\\', '/'), 'title': title, 'code': code, 'revision_date': rev, 'category': final_cat, 'document_role': 'kwcs'})
            continue
            
        if comp == '기존 코드 없음':
            new_docs.append({'path': '05.K-water_기술기준_2026-09-22/' + path.replace('\\', '/'), 'title': title, 'code': code, 'revision_date': rev, 'category': final_cat, 'document_role': final_cat})
            
    docs = [d for d in docs if d['path'] not in remove_paths]
    docs.extend(new_docs)
    
    with open('scratch/skipped_dam_river.json', 'w', encoding='utf-8') as f:
        json.dump(skipped_dam_river, f, ensure_ascii=False, indent=2)
        
    return docs, replaced

def get_core_documents():
    """1차 색인 대상. 범위 안의 압축파일은 압축을 푼 문서(04_압축해제)로 대신 색인한다.
    예전에는 10MB가 넘는 파일을 조용히 건너뛰었는데, 그 안에 수도정비기본계획 수립지침 같은
    핵심 통합본이 들어 있어 크기 제한을 없앴다(큰 이유는 대부분 그림이라 본문은 작다)."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute('''
    SELECT path, title, code, revision_date, document_role, metadata_json
    FROM documents
    WHERE duplicate_of IS NULL
    ORDER BY path ASC
    ''').fetchall()
    conn.close()

    in_scope = {}
    containers = {}
    for path, title, code, revision_date, role, meta_json in rows:
        cat = category_of(path)
        if cat:
            in_scope[path] = cat
            if path.lower().endswith(".zip"):
                containers[path] = cat

    docs, replaced = [], []
    for path, title, code, revision_date, role, meta_json in rows:
        meta = json.loads(meta_json) if meta_json else {}
        cat = in_scope.get(path)
        if cat == "bim" and bim_excluded(path):
            continue
        container = None
        if cat is None and path.startswith("04_압축해제/"):
            container = meta.get("container_path")
            cat = containers.get(container)
        if cat is None:
            continue
        if path in containers:
            replaced.append(path)
            continue
        docs.append({
            "path": path,
            "title": title,
            "code": code,
            "revision_date": revision_date,
            "edition_date_hint": meta.get("edition_date_hint"),
            "document_role": role,
            "category": cat,
            **({"container": container} if container else {}),
        })
    docs.sort(key=lambda d: d["path"])
    return docs, sorted(replaced)

def extract_hwp_text(filepath):
    try:
        res = subprocess.run([RHWP_EXE, "export-text", "--json", filepath], capture_output=True, text=True, encoding='utf-8')
        if res.returncode != 0:
            return None, f"rhwp error: {res.stderr}"
        data = json.loads(res.stdout)
        return data.get('pages', []), None
    except Exception as e:
        return None, str(e)

def extract_pdf_text(filepath):
    try:
        import pymupdf
        pages = []
        with pymupdf.open(filepath) as pdf:
            for i, page in enumerate(pdf):
                text = page.get_text()
                if text:
                    pages.append({"page": i + 1, "text": text})
        return pages, None
    except ImportError:
        return None, "pymupdf not installed"
    except Exception as e:
        return None, str(e)

def extract_excel_text(filepath):
    try:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, data_only=True)
        text_lines = []
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                line = " ".join([str(cell) for cell in row if cell is not None]).strip()
                if line:
                    text_lines.append(line)
        if text_lines:
            return [{"page": 1, "text": "\n".join(text_lines)}], None
        return [], None
    except ImportError:
        return None, "openpyxl not installed"
    except Exception as e:
        return None, str(e)

# 새 줄로 남겨야 하는 줄의 시작(항목 번호·기호·표/그림 표시).
LIST_START = re.compile(r'^\s*(\(\s*\d{1,2}\s*\)|\d{1,2}\)|[①-⑳⑴-⒇㉠-㉭㉮-㉻]|[가-하][.)]\s+\S|[-·•∙‧・⦁※○●□■◇◆▶▷◦▪*]|<|\[|「|〔|표\s*\d|그림\s*\d)')
SENTENCE_END = re.compile(r'([다음함됨임요]\.|[.:;?!])\s*$')
PAGE_NUMBER = re.compile(r'^\s*[-–—]\s*\d{1,4}\s*[-–—]\s*$')
# 기준 문서의 쪽 머리글·바닥글 형식. 짧은 문서는 몇 쪽에만 나와 반복 횟수로는 못 걸러서 형식으로 알아본다.
#   바닥글: 'KDS 11 00 00 지반설계기준', 'KCS 10 00 00 공통공사'
#   머리글: '앵커 <탭> KDS 11 60 00 : 2025'
STD_HEADER = re.compile(r'^\s*(?:(?:KDS|KCS|KWCS)\s\d{2}\s\d{2}\s\d{2}(?:\s\d{2})?\s+[가-힣·ㆍ\s]{2,30}(?:설계기준|공사|시방서|기준)|.{0,60}\b(?:KDS|KCS|KWCS)\s\d{2}\s\d{2}\s\d{2}(?:\s\d{2})?\s*:\s*\d{4})\s*$')
BARE_NUMBER = re.compile(r'^\s*\d{1,3}\s*$')
TOC_LEADER = re.compile(r'[·.…‥ㆍ─-]{5,}\s*\d{1,4}\s*$')


VERTICAL_CHAR = re.compile(r'^\s*[가-힣A-Za-z0-9]\s*$')


def join_vertical(lines):
    """표지·표 칸의 세로쓰기 글상자는 한 글자씩 줄로 나온다('상⏎수⏎도⏎공⏎사', 'K⏎C⏎S⏎2⏎1…'). 글자 한 개짜리 줄이
    3줄 이상 이어지면 한 단어로 붙인다. 숫자만 이어진 줄은 표의 값 열일 수 있어 글자가 섞였을 때만 붙인다."""
    out, run = [], []
    for raw in lines + [None]:
        if raw is not None and VERTICAL_CHAR.match(raw):
            run.append(raw)
            continue
        word = ''.join(x.strip() for x in run)
        if len(run) >= 3 and not word.isdigit():
            out.append(word)
        else:
            out.extend(run)
        run = []
        if raw is not None:
            out.append(raw)
    return out


def reflow(pages, heading_pattern, toc_pattern):
    """원문 한글 파일의 화면 줄바꿈을 원래 문단으로 되돌린다.
    rhwp 추출 텍스트는 어절 사이에서 줄이 바뀐 곳은 줄 끝에 공백을 남기고, 단어 중간에서 바뀐 곳은
    공백 없이 끝난다(예: '관로가 합류하' + '는 곳'). 이것을 근거로 띄어서 또는 붙여서 잇는다.
    문장 끝·조항 제목·항목 시작·짧은 줄(표 칸)은 잇지 않는다. 쪽이 바뀌는 곳도 이어 붙인다."""
    # 쪽마다 반복되는 머리글·바닥글(예: '관로시설 설계기준 … KDS 61 40 00 : 2025')과 '- 16 -' 같은
    # 쪽 번호 줄은 본문이 아니다. 그대로 두면 쪽 경계에서 끊긴 문장 사이에 끼어든다.
    # 머리글 끝에 쪽 번호가 붙어 쪽마다 글자가 달라지는 경우('… 건설측량 설계기준 2')도 같은 머리글로 보도록 끝 숫자는 떼고 비교한다.
    key = lambda s: re.sub(r'\s*\d{1,4}\s*$', '', re.sub(r'\s+', ' ', s).strip())
    seen = {}
    for page_data in pages:
        for k in {key(x) for x in page_data.get('text', '').split('\n') if key(x)}:
            seen[k] = seen.get(k, 0) + 1
    min_repeat = max(3, int(len(pages) * 0.3))
    running = {k for k, n in seen.items() if n >= min_repeat and len(k) <= 120}

    out = []  # (쪽, 문단)
    prev_raw = None
    after_header = False
    blank_pending = False
    for page_data in pages:
        page_num = page_data.get('page', 0)
        for raw in join_vertical(page_data.get('text', '').split('\n')):
            if toc_pattern.search(raw) or TOC_LEADER.search(raw):
                continue  # 목차 줄('제목<탭>12', '4.1 총설 ······ 46')은 본문이 아니다
            if PAGE_NUMBER.match(raw) or key(raw) in running or STD_HEADER.match(raw):
                after_header = True
                blank_pending = False  # 머리글 앞뒤 빈 줄은 문단 경계가 아니다(쪽 경계에서 끊긴 문장을 이어야 한다)
                continue  # 머리글·쪽 번호는 건너뛰되 앞 줄과의 이어 붙이기 판단은 유지한다
            if after_header and BARE_NUMBER.match(raw):
                continue  # 머리글 바로 옆에 숫자만 있는 줄은 쪽 번호다
            line = raw.strip()
            if not line:
                if not after_header:
                    blank_pending = True  # 다음 줄이 머리글이면 무시하고, 본문이면 문단 경계로 쓴다
                continue
            after_header = False
            if blank_pending:
                prev_raw = None  # 빈 줄은 문단 경계
                blank_pending = False
            starts_list = LIST_START.match(line)
            if starts_list and prev_raw is not None and re.match(r'\s*[가-하][.)]', line):
                # '…시점을 말한' + '다.  단, …'처럼 단어 중간에서 끊긴 문장 끝은 목록 기호('다. 내용')와 모양이 같다.
                # 앞 줄이 단어 중간에서 끊겼으면(공백·문장 끝 없이 긴 줄) 목록이 아니라 앞 문장의 끝으로 본다.
                p0 = prev_raw.rstrip()
                if not prev_raw.endswith(' ') and len(p0) >= 30 and not SENTENCE_END.search(p0):
                    starts_list = None
            joinable = (
                out and prev_raw is not None
                and not heading_pattern.match(line) and not starts_list
                and not heading_pattern.match(prev_raw.strip())
            )
            if joinable:
                prev = prev_raw.rstrip()
                soft_space = prev_raw.endswith(' ') and not SENTENCE_END.search(prev)
                soft_word = (not prev_raw.endswith(' ')) and len(prev) >= 30 and not SENTENCE_END.search(prev)
                if soft_space or soft_word:
                    p, text = out[-1]
                    out[-1] = (p, text + (' ' if soft_space else '') + line)
                    prev_raw = raw
                    continue
            out.append((page_num, line))
            prev_raw = raw
    return out


def chunk_text(pages, doc_title):
    chunks = []
    current_chunk = None
    path_stack = []
    
    toc_pattern = re.compile(r'\t\s*\d+\s*$')
    # 조항 번호(1, 1.2, 3.4.1 …) 다음에 글자로 시작하는 짧은 제목이 올 때만 조항으로 본다.
    # 예전 규칙은 '600 75 100' 같은 표 줄이나 '2 개 이상' 같은 본문 줄도 조항 제목으로 잘랐다.
    # 단위가 이어지는 줄('25 MPa 이상', '600 mm 이하')은 본문이므로 제외하고, 장 번호(점 없는 번호)는 20 이하만 본다.
    heading_pattern = re.compile(r'^\s*((?:[1-9]|1\d|20)(?:\.\d{1,2}){0,4})\.?\s+(?!(?:MPa|kPa|Pa|mm|cm|km|m|kN|N|kg|ton|t|L|l|%|℃|°)(?![A-Za-z]))([가-힣A-Za-z(「\[].{0,60})$')
    
    # 화면 줄바꿈을 문단으로 되돌린 줄 단위로 조항을 나눈다.
    for page_num, line_clean in reflow(pages, heading_pattern, toc_pattern):
        m = heading_pattern.match(line_clean)
        if m:
            num = m.group(1)
            title = m.group(2).strip()

            depth = num.count('.') + 1
            full_title = f"{num}. {title}" if not num.endswith('.') else f"{num} {title}"

            if len(path_stack) >= depth:
                path_stack = path_stack[:depth-1]
            path_stack.append(full_title)
            path_str = " > ".join(path_stack)

            if current_chunk:
                chunks.append(current_chunk)

            current_chunk = {
                "path_str": path_str,
                "clause_title": full_title,
                "text": [line_clean],
                "page": page_num
            }
        elif current_chunk:
            current_chunk["text"].append(line_clean)
        else:
            current_chunk = {
                "path_str": "일반사항",
                "clause_title": "일반사항",
                "text": [line_clean],
                "page": page_num
            }

    if current_chunk:
        chunks.append(current_chunk)
        
    final_chunks = []
    long_chunks = 0
    # 1만 자가 넘는 조항은 줄 경계에서 약 5천 자씩 나눈다. 글자 수로 자르면 문장·단어가 잘려
    # 경계에 걸친 검색어를 놓치므로, 한 줄이 통째로 너무 길 때만 문장 끝('다.' 등)에서 자른다.
    for c in chunks:
        # 제목 줄만 있고 본문이 없는 조항(예: '5. 터파기 지보' 다음에 바로 5.1이 오는 경우)은 결과로 보여도
        # 쓸모가 없으므로 뺀다. 제목은 하위 조항의 경로(path_str)에 남아 있어 그 제목으로도 검색된다.
        if len(c['text']) <= 1 and c['clause_title'] != '일반사항':
            continue
        joined_text = "\n".join(c['text'])
        if len(joined_text) <= 10000:
            c['text'] = joined_text
            final_chunks.append(c)
            continue
        long_chunks += 1
        pieces = split_on_boundaries(c['text'], 5000)
        for n, piece in enumerate(pieces, 1):
            sub_c = dict(c)
            sub_c['text'] = piece
            sub_c['path_str'] = f"{c['path_str']} (계속 {n}/{len(pieces)})"
            final_chunks.append(sub_c)

    return final_chunks, long_chunks


def split_on_boundaries(lines, target):
    units = []
    for line in lines:
        if len(line) <= target:
            units.append(line)
            continue
        # 한 줄이 target보다 길면 문장 끝에서 나눈다.
        buf = ''
        for sentence in re.split(r'(?<=[다요함음임됨]\.)\s+|(?<=[.;])\s+', line):
            if buf and len(buf) + 1 + len(sentence) > target:
                units.append(buf)
                buf = sentence
            else:
                buf = sentence if not buf else buf + ' ' + sentence
        if buf:
            units.append(buf)
    pieces, cur, size = [], [], 0
    for u in units:
        if cur and size + len(u) + 1 > target:
            pieces.append("\n".join(cur))
            cur, size = [], 0
        cur.append(u)
        size += len(u) + 1
    if cur:
        pieces.append("\n".join(cur))
    return pieces

def main():
    docs, replaced_containers = get_all_documents()
    print(f"Total documents to process: {len(docs)} (압축파일 {len(replaced_containers)}개는 풀린 문서로 대체)")
    
    indexed_by_cat = {"supply": [], "sewer": [], "kwcs": [], "guide": [], "civil": [], "bim": [], "kwdi": [], "kwsp": []}
    failures = []
    total_long_chunks = 0
    total_front_dropped = 0
    
    for i, doc in enumerate(docs):
        path = doc['path']
        full_path = os.path.join(DATA_DIR, path.replace("/", "\\"))
        if path.startswith("05.K-water"):
            full_path = os.path.join(r"C:\Pruden_KH\.Data", path.replace("/", "\\"))
        print(f"[{i+1}/{len(docs)}] {path}", flush=True)
        
        if not os.path.exists(full_path):
            failures.append({"path": path, "reason": "File not found"})
            continue
            
        ext = os.path.splitext(full_path)[1].lower()
        pages = None
        error = None
        
        if ext in ['.hwp', '.hwpx']:
            pages, error = extract_hwp_text(full_path)
        elif ext == '.pdf':
            pages, error = extract_pdf_text(full_path)
        elif ext in ['.xlsx', '.xls']:
            pages, error = extract_excel_text(full_path)
        else:
            error = f"Unsupported extension: {ext}"
            
        if error:
            print(f"  -> Error: {error}")
            failures.append({"path": path, "reason": error})
        elif pages:
            chunks, long_chunks = chunk_text(pages, doc['title'])
            # 첫 조항 앞 조각은 표지·목차·개정 이력이다(표지의 세로쓰기 글상자가 한 글자씩 줄로 나와 검색 결과를 어지럽힌다).
            # 기준 문서(KDS·KCS·KWCS와 K-water 수집본 KWDI·KWSP·KWMI·KWPS)는 뒤에 조항이 있으면 항상 뺀다. 실무지침은 첫 조항 앞에 고시 연혁·현황표 같은
            # 본문이 오기도 해서, '목차' 줄이 있거나 300자 이하(표지 글자만 있는 경우)일 때만 뺀다.
            if len(chunks) > 1 and chunks[0]['clause_title'] == '일반사항':
                is_code_doc = bool(re.match(r'K(DS|CS|WCS|WDI|WSP|WMI|WPS)\b', doc.get('code') or ''))
                front = chunks[0]['text']
                is_cover = len(front) <= 300 or re.search(r'^\s*목\s*차\s*$', front, re.M)
                if is_code_doc or is_cover:
                    chunks = chunks[1:]
                    total_front_dropped += 1
            if long_chunks > 0:
                print(f"  -> Had {long_chunks} chunks > 10,000 chars (split)")
                total_long_chunks += long_chunks
                
            if chunks:
                doc['chunks'] = chunks
                if doc['category'] in indexed_by_cat:
                    indexed_by_cat[doc['category']].append(doc)
            else:
                failures.append({"path": path, "reason": "No chunks extracted (empty)"})
                print("  -> Empty chunks")

    print(f"\nTotal chunks > 10,000 chars that were split: {total_long_chunks}")
    
    # 예전 빌드가 남긴 색인 파일(예: 이번에는 만들지 않는 guide-4)을 지운다. 남아 있으면 커밋·배포에 섞인다.
    for name in os.listdir(OUT_DIR):
        if name.startswith("standards-index-") and name.endswith(".js"):
            os.remove(os.path.join(OUT_DIR, name))

    manifest_files = []
    
    for cat, items in indexed_by_cat.items():
        if not items: continue
        
        # split by 15MB chunks
        file_idx = 1
        current_docs = []
        current_size = 0
        
        for doc in items:
            doc_str = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
            if current_size + len(doc_str.encode('utf-8')) > 15 * 1024 * 1024 and current_docs:
                out_js = f"standards-index-{cat}-{file_idx}.js"
                with open(os.path.join(OUT_DIR, out_js), 'w', encoding='utf-8') as f:
                    f.write("window.STANDARDS_INDEX = window.STANDARDS_INDEX || [];\n")
                    f.write("window.STANDARDS_INDEX.push(...(")
                    json.dump(current_docs, f, ensure_ascii=False, separators=(',', ':'))
                    f.write("));\n")
                manifest_files.append(out_js)
                file_idx += 1
                current_docs = []
                current_size = 0
                
            current_docs.append(doc)
            current_size += len(doc_str.encode('utf-8'))
            
        if current_docs:
            out_js = f"standards-index-{cat}-{file_idx}.js" if file_idx > 1 else f"standards-index-{cat}.js"
            with open(os.path.join(OUT_DIR, out_js), 'w', encoding='utf-8') as f:
                f.write("window.STANDARDS_INDEX = window.STANDARDS_INDEX || [];\n")
                f.write("window.STANDARDS_INDEX.push(...(")
                json.dump(current_docs, f, ensure_ascii=False, separators=(',', ':'))
                f.write("));\n")
            manifest_files.append(out_js)
            
    
    # 동의어 근거: 묶음마다 각 표기가 색인 본문에 몇 번 나오는지(띄어쓰기 무시) 센다.
    syn_src = open(os.path.join(OUT_DIR, 'standards-synonyms.js'), encoding='utf-8-sig').read()
    syn = json.loads(syn_src[syn_src.index('{'):syn_src.rindex('}') + 1])
    # 조항 사이에 구분 문자를 넣어 두 조항에 걸친 가짜 일치를 세지 않는다.
    corpus = "\u0000".join(re.sub(r"\s+", "", (c.get('clause_title') or '') + (c.get('text') or ''))
                           for items in indexed_by_cat.values() for d in items for c in d.get('chunks', []))
    def evidence(groups):
        return [{"group": g, "counts": {w: corpus.count(re.sub(r"\s+", "", w)) for w in g}} for g in groups]
    syn_evidence = {
        "note": "각 표기가 설계기준 색인 본문(띄어쓰기 무시)에 나온 횟수. 동의어 묶음을 넣거나 뺄 때의 근거로 쓴다.",
        "synonym_groups": evidence(syn.get("synonym_groups", [])),
        "review_needed": evidence(syn.get("review_needed", [])),
    }
    with open(os.path.join(OUT_DIR, 'standards-synonyms-evidence.json'), 'w', encoding='utf-8') as f:
        json.dump(syn_evidence, f, ensure_ascii=False, indent=1)
    for g in syn_evidence["synonym_groups"] + syn_evidence["review_needed"]:
        print("  동의어 근거:", g["counts"])

    # Write manifest
    with open(os.path.join(OUT_DIR, 'standards-manifest.js'), 'w', encoding='utf-8') as f:
        f.write("window.STANDARDS_MANIFEST = " + json.dumps(manifest_files) + ";\n")
        
    out_failures = os.path.join(OUT_DIR, "indexing_failures.json")
    with open(out_failures, 'w', encoding='utf-8') as f:
        json.dump(failures, f, ensure_ascii=False, indent=2)

    # 빌드 리포트: 같은 입력이면 같은 내용이 나오도록 시각 같은 변동값은 넣지 않는다.
    indexed = [d for items in indexed_by_cat.values() for d in items]
    report = {
        "documents_in_scope": len(docs),
        "documents_indexed": len(indexed),
        "failures": len(failures),
        "chunks": sum(len(d.get('chunks', [])) for d in indexed),
        "chunks_over_10000_chars_before_split": total_long_chunks,
        "front_matter_chunks_dropped": total_front_dropped,
        "by_category": {cat: len(items) for cat, items in indexed_by_cat.items()},
        "containers_replaced_by_extracted_files": replaced_containers,
        "files": {name: os.path.getsize(os.path.join(OUT_DIR, name)) for name in manifest_files},
    }
    with open(os.path.join(OUT_DIR, "standards-build-report.json"), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != "containers_replaced_by_extracted_files"}, ensure_ascii=False))

if __name__ == "__main__":
    main()
