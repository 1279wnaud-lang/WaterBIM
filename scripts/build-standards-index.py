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

# 실무지침 폴더의 압축파일 중 설계 업무와 거리가 먼 것(사용자 결정, 2026-09-22).
# 수질·토양 공정시험기준(ES, 221건)은 실험실 분석법이라 '납·망간' 같은 검색에서 설계 기준을 밀어내고,
# 상수도공사 표준시방서 옛 개정판(10건)은 상수도 분류의 최신 KCS 57과 겹친다.
GUIDE_EXCLUDED_ARCHIVES = (
    "_dfa314c079d3.zip",  # 먹는물수질공정시험기준 개정전문(20131106)
    "_b36a7c7430bc.zip",  # 먹는물수질공정시험기준 개정내용
    "_146ecd8e9cee.zip",  # 토양오염공정시험기준(전문)
    "_6412aaad52ea.zip",  # 토양오염공정시험기준 일부개정(130912)
    "_da01cc86c93f.zip",  # 상수도공사 표준시방서 개정 전문(옛 판)
)


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
            if container and any(h in container for h in GUIDE_EXCLUDED_ARCHIVES):
                continue
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


from text_cleanup import chunk_text

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
            chunks, long_chunks = chunk_text(pages, doc['title'], doc.get('code') or '')
            # 첫 조항 앞 조각은 표지·목차·개정 이력이다(표지의 세로쓰기 글상자가 한 글자씩 줄로 나와 검색 결과를 어지럽힌다).
            # 기준 문서(KDS·KCS·KWCS와 K-water 수집본 KWDI·KWSP·KWMI·KWPS)는 뒤에 조항이 있으면 항상 뺀다. 실무지침은 첫 조항 앞에 고시 연혁·현황표 같은
            # 본문이 오기도 해서, '목차' 줄이 있거나 300자 이하(표지 글자만 있는 경우)일 때만 뺀다.
            # 번호 없는 머리말('가. 편람 목적 … 한다.')이 목차와 같은 조각에 들어 있으면 문장이 2개 이상이므로 남긴다
            # (노후상수도 정비사업 업무편람: 편람 목적·적용범위가 여기 있다).
            if len(chunks) > 1 and chunks[0]['clause_title'] == '일반사항':
                is_code_doc = bool(re.match(r'K(DS|CS|WCS|WDI|WSP|WMI|WPS)\b', doc.get('code') or ''))
                front = chunks[0]['text']
                sentences = len(re.findall(r'.{20,}(?:[다음함됨임]\.)\s*$', front, re.M))
                is_cover = len(front) <= 300 or (re.search(r'^\s*목\s*차\s*$', front, re.M) and sentences < 2)
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
