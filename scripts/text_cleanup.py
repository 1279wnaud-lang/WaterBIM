import re

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
TOC_LEADER_END = re.compile(r'[·.…‥ㆍ]{5,}\s*$')
TOC_LEADER_ONLY = re.compile(r'^\s*(?:[◦○●□■◇◆-]\s*)?[·.…‥ㆍ]{5,}\s*$')
PARTICLE_START = re.compile(r'^\s*(의|는|은|을|를|에|와|과|로|에서|으로|까지|부터|보다|하게|하여|하고|지만|므로)(?:\s|$)')
BACK_MATTER_START = re.compile(r'^\s*(집\s*필\s*위\s*원|심\s*의\s*위\s*원|자\s*문\s*위\s*원|작\s*성\s*위\s*원|참\s*여\s*위\s*원'
                               r'|제\s*·\s*개\s*정\s*이\s*력|기\s*준\s*제\s*정\s*및\s*개\s*정\s*연\s*혁)\s*$')


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


def reflow(pages, heading_pattern, toc_pattern, doc_code=""):
    """원문 한글 파일의 화면 줄바꿈을 원래 문단으로 되돌린다.
    rhwp 추출 텍스트는 어절 사이에서 줄이 바뀐 곳은 줄 끝에 공백을 남기고, 단어 중간에서 바뀐 곳은
    공백 없이 끝난다(예: '관로가 합류하' + '는 곳'). 이것을 근거로 띄어서 또는 붙여서 잇는다.
    문장 끝·조항 제목·항목 시작·짧은 줄(표 칸)은 잇지 않는다. 쪽이 바뀌는 곳도 이어 붙인다."""
    # 기준 문서 끝의 집필위원·심의위원 명단과 제·개정 이력, 발행 정보는 본문이 아니다(마지막 조항 본문에 섞여 들어갔다).
    # 시작 표시 줄부터 문서 끝까지 버리되, 표시가 문서 끝부분(마지막 20% 또는 마지막 3쪽)에 있을 때만 자른다.
    # '소관부서'는 본문 표의 열 이름으로도 쓰여(KWSP 57 15 05 코드 표준화 표) 시작 표시로 쓰지 않는다.
    is_code_doc = bool(re.match(r"K(DS|CS|WCS|WDI|WSP|WMI|WPS)\b", doc_code))
    back_start = min(len(pages) * 0.8, len(pages) - 3)
    is_back_matter = False
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
    for page_idx, page_data in enumerate(pages):
        page_num = page_data.get('page', 0)
        page_lines = join_vertical(page_data.get('text', '').split('\n'))
        skip = set()
        for i, raw in enumerate(page_lines):
            # 쪽 번호가 다음 줄로 넘어간 목차 줄('1. 일반사항·······' ⏎ '2')은 두 줄 다 버린다.
            # 다음 줄이 숫자뿐일 때만 목차로 본다. 서식의 빈칸('시설명 : ......')과 자리표시('......')는 둔다.
            # 점선 모양만 본다(줄 끝 '─────'·'-----'는 표 테두리·본문일 수 있다).
            if TOC_LEADER_END.search(raw) and i + 1 < len(page_lines) and BARE_NUMBER.match(page_lines[i + 1]):
                skip.update((i, i + 1))
        for i, raw in enumerate(page_lines):
            if i in skip:
                continue
            # 한 글자씩 띄어 쓴 표 머리 줄('점 검 사 항', '구    분')은 붙인다. 두 글자 이상 어절이 섞이면 그대로 둔다.
            words = raw.split()
            if len(words) >= 2 and all(len(w) == 1 and '가' <= w <= '힣' for w in words):
                raw = raw[:len(raw) - len(raw.lstrip())] + ''.join(words)

            if is_code_doc and not is_back_matter and page_idx >= back_start and BACK_MATTER_START.match(raw):
                is_back_matter = True
            if is_back_matter:
                continue

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
            if starts_list and re.match(r'^\s*(표|그림)\s*<?\d[\d.A-Za-z-]*>?\s*(을|를|에|에서|의|과|와|은|는|로|으로|이|가|및|참조)', line):
                starts_list = None
            if starts_list and prev_raw is not None and re.match(r'\s*[가-하][.)]', line):
                # '…시점을 말한' + '다.  단, …'처럼 단어 중간에서 끊긴 문장 끝은 목록 기호('다. 내용')와 모양이 같다.
                # 앞 줄이 단어 중간에서 끊겼으면(공백·문장 끝 없이 긴 줄) 목록이 아니라 앞 문장의 끝으로 본다.
                p0 = prev_raw.rstrip()
                if not prev_raw.endswith(' ') and len(p0) >= 30 and not SENTENCE_END.search(p0):
                    starts_list = None
            # 조항 제목도 길면 화면에서 줄이 바뀌어 낱말 중간에서 끊긴다
            # ('4.2.5.1 … 인접한 웨브 부재가 있' ⏎ '는 평면 트러스의 웨브 부재인 ㄱ형강의 경우').
            # 다음 줄이 조사로 시작하면 제목 줄에도 이어 붙여 제목을 온전하게 만든다.
            joinable = (
                out and prev_raw is not None
                and not heading_pattern.match(line) and not starts_list
                and (not heading_pattern.match(prev_raw.strip()) or PARTICLE_START.match(line))
            )
            if joinable:
                prev = prev_raw.rstrip()
                soft_space = prev_raw.endswith(' ') and not SENTENCE_END.search(prev)
                soft_word = (not prev_raw.endswith(' ')) and len(prev) >= 30 and not SENTENCE_END.search(prev)
                
                # 다음 줄이 조사+공백으로 시작하면 낱말이 중간에서 끊긴 것이다('…모든 부재' ⏎ '의 존재 표현').
                # 붙여서 잇는다. 단독 '이·가·도'는 지시어('이 조항은')·표 칸과 구분이 안 돼 넣지 않는다.
                if PARTICLE_START.match(line) and not SENTENCE_END.search(prev):
                    soft_space = False
                    soft_word = True

                if re.match(r'^\s*(표|그림)\s*<?\d[\d.A-Za-z-]*>?\s*(을|를|에|에서|의|과|와|은|는|로|으로|이|가|및|참조)', line):
                    soft_space = True
                    
                if soft_space or soft_word:
                    p, text = out[-1]
                    out[-1] = (p, text + (' ' if soft_space else '') + line)
                    prev_raw = raw
                    continue
            out.append((page_num, line))
            prev_raw = raw
    return out


def chunk_text(pages, doc_title, doc_code="", heading_pattern=None, toc_pattern=None, is_valid_heading=None):
    chunks = []
    current_chunk = None
    path_stack = []
    
    if toc_pattern is None:
        toc_pattern = re.compile(r'\t\s*\d+\s*$')
    if heading_pattern is None:
        heading_pattern = re.compile(r'^\s*((?:[1-9]|1\d|20)(?:\.\d{1,2}){0,4})\.?\s+(?!(?:MPa|kPa|Pa|mm|cm|km|m|kN|N|kg|ton|t|L|l|%|℃|°)(?![A-Za-z]))([가-힣A-Za-z(「\[].{0,60})$')
    
    if is_valid_heading is None:
        def default_is_valid_heading(m):
            if not m:
                return False
            num, title = m.group(1), m.group(2).strip()
            if re.match(r'(이하|이상|초과|미만)(?![가-힣])', title):
                return False
            if re.match(r'[a-zμ]', title) or re.match(r'\([\d.]+\)', title):
                return False
            if re.match(r'\d', title) and not re.match(r'\d+[가-힣]', title):
                return False
            if '.0.' in num + '.':
                return False
            return True
        is_valid_heading = default_is_valid_heading

    
    # 화면 줄바꿈을 문단으로 되돌린 줄 단위로 조항을 나눈다.
    for page_num, line_clean in reflow(pages, heading_pattern, toc_pattern, doc_code):
        m = heading_pattern.match(line_clean)
        if is_valid_heading(m):
            num = m.group(1)
            title = m.group(2).strip()

            depth = num.count('.') + num.count('-') + (1 if not num.startswith('제') else 1)
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
        body_clean = re.sub(r'\s+', '', ''.join(c['text'][1:]))
        if body_clean in ['내용없음', '내용없음.', '해당없음', '해당없음.']:
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
