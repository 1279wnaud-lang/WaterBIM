"""Extract numeric columns with explicit outer table borders (including F20).
The printed page, rather than a formula or another class, owns every value.
"""
import re
import pdfplumber

def full_columns(page, expected):
    lines=[e for e in page.edges if e['orientation']=='h' and e['width']>300]
    bounds=[min(e['x0'] for e in lines),max(e['x1'] for e in lines)]
    tables=page.extract_tables({'explicit_vertical_lines':bounds})
    assert len(tables)==1
    cols=[c.splitlines() for c in tables[0][-1]]
    assert len(cols)==expected and len({len(c) for c in cols})==1, (page.page_number, [len(c) for c in cols])
    return list(zip(*cols))

def number(s):
    return float(s.replace(' ',''))

def pair(s):
    return tuple(int(x.replace(' ','')) for x in re.split('[×x]',s))

def extend(add, fields, field, source):
    for key,label,unit,symbol in [
        ('branchOutsideDiameter','지관 바깥지름','mm','d2'),
        ('reinforcementThickness','보강판 두께','mm','t1'),
        ('reinforcementWidth','보강판 폭','mm','B'),
        ('steelH','관 길이 H','mm','H'), ('steelI','관 길이 I','mm','I'),
        ('taperThickness','편락부 두께','mm','t2'),
        ('steelC','편락관 큰 지름측 길이','mm','C'), ('steelE','편락관 작은 지름측 길이','mm','E'),
        ('steelW','편락부 길이','mm','W'),
        ('flangeD5','플랜지 외경','mm','D5'), ('flangeD4','플랜지 볼트 중심원','mm','D4'),
        ('flangeD3','플랜지 치수 D3','mm','D3'), ('flangeK','플랜지 치수 K','mm','K'),
        ('flangeM','플랜지 치수 M','mm','M'), ('boltCount','볼트 수','개','수 / n / N'),
        ('boltNominalDiameter','볼트 호칭 지름','mm','M'), ('boltHoleDiameter','볼트 구멍 지름','mm',"d′ / d / H"),
        ('gasketG1','개스킷 치수 G1','mm','G1'), ('gasketE','개스킷 자리 치수 e','mm','e'),
        ('gasketS','개스킷 자리 치수 s','mm','s')]:
        fields[key]=field(label,unit,symbol)
    note='수록 표준 KS D 3578-1997. 원문 치수 기호와 도식을 참조하세요.'
    def emit(part,n,variant,dims,page,table,branch=None,angle=None,notes=(),issues=(),joint='용접'):
        add('steel',part,n,variant,dims,page,str(page-18),table,branch=branch,angle=angle,joint=joint,
            notes=[note,*notes],issues=list(issues),method='표 추출 및 렌더링 원문 열 대조')
    with pdfplumber.open(source) as doc:
        for page,angle in [(175,90),(176,45),(177,22.5),(178,11.25),(179,5.625)]:
            rows=full_columns(doc.pages[page-1],17 if page<177 else 15)
            for row in rows:
                n=int(row[0].replace(' ',''))
                for variant,tcol,icol,wcol in [('F12',2,3,-3),('F15',4,5,-2),('F20',6,7,-1)]:
                    if page<177 and variant!='F20':continue
                    mapping=[('outsideDiameter',1),('thickness',tcol),('innerDiameter',icol),('radius',8),('mass',wcol)]
                    mapping += [('l1',9),('l2',10),('l3',11),('length',12),('centerLength',13)] if page<177 else [('l3',9),('length',10),('centerLength',11)]
                    dims={k:number(row[c]) for k,c in mapping}
                    issues=[]
                    if abs(dims['outsideDiameter']-2*dims['thickness']-dims['innerDiameter'])>0.15:
                        issues.append('원문 안지름이 바깥지름−2×두께와 불일치합니다. 원문 값을 보존했으며 적용 전 확인이 필요합니다.')
                    emit('곡관',n,variant,dims,page,f'부도 {page-174} {angle}° 곡관',angle=angle,issues=issues)
        for page in range(180,188):
            variant='F12' if page<184 else 'F15'
            for row in full_columns(doc.pages[page-1],10):
                n,b=pair(row[0])
                dims={k:number(row[c]) for k,c in [('outsideDiameter',1),('branchOutsideDiameter',2),('thickness',3),('branchThickness',4),('reinforcementThickness',5),('reinforcementWidth',6),('steelH',7),('steelI',8),('mass',9)] if row[c].strip()!='-'}
                issues=[]
                row_variant=variant
                if page==183 and (n,b)==(2800,1800):
                    row_variant += f' / 원문 D2={dims["outsideDiameter"]:g}'
                    issues.append('원문 DN2800×1800이 D2=2844.8과 D2=2946.4의 두 행에 중복 인쇄되어 있습니다. 호칭경과 치수를 수정하지 않았습니다.')
                emit('T관',n,row_variant,dims,page,'부도 6 T자관',branch=b,issues=issues,notes=('원문 보강판의 -는 미수록 속성입니다. F20은 KS B 1541·KS B 1543에 따르거나 인수·인도 당사자 협의에 따른다는 주석만 있어 생성하지 않았습니다.',))
        for page in range(188,192):
            for row in full_columns(doc.pages[page-1],19):
                n,b=pair(row[0])
                for variant,start,wcol in [('F12',3,16),('F15',6,17),('F20',9,18)]:
                    dims={k:number(row[c]) for k,c in [('outsideDiameter',1),('branchOutsideDiameter',2),('thickness',start),('branchThickness',start+1),('taperThickness',start+2),('steelC',12),('steelE',13),('steelW',14),('length',15),('mass',wcol)]}
                    issues=[]
                    if page==188 and variant=='F12' and n<=150:
                        issues.append('원문 F12 T 열에 89.1/114.3/139.8 등 외경처럼 보이는 값이 인쇄되어 있습니다. 두께로 인쇄된 값을 그대로 보존했으며 적용 전 확인이 필요합니다.')
                    if page==188 and (n,b)==(150,100):issues.append('원문 큰 지름측 바깥지름 166.2는 같은 DN150의 다른 행 165.2와 다릅니다. 원문 보존.')
                    if page==188 and (n,b)==(300,125) and variant=='F15':issues.append('동일 치수 F12 무게 29.7과 달리 F15 무게는 29.2로 인쇄되어 있습니다. 원문 보존.')
                    if page==188 and (n,b)==(200,125) and variant=='F20':issues.append('원문 무게 16.2 kg은 DN200×100의 16.9 kg보다 작습니다. 원문 보존.')
                    emit('이경관',n,variant,dims,page,'부도 7 편락관',branch=b,issues=issues,notes=('branchNominalDiameter는 작은 지름입니다.',))
        for page,variant in [(210,'F12 (도식 표기; 표제 F20)'),(211,'F15'),(212,'F20')]:
            for row in full_columns(doc.pages[page-1],16):
                n=int(row[0].replace(' ',''))
                dims={k:number(row[c]) for k,c in [('outsideDiameter',1),('thickness',2),('flangeD5',3),('flangeD4',4),('flangeD3',5),('flangeK',6),('flangeM',7),('boltCount',8),('boltHoleDiameter',10),('gasketG1',11),('gasketE',12),('gasketS',13)]}
                dims['boltNominalDiameter']=number(row[9].replace('M',''))
                for joint,col in [('RF',14),('GF',15)]:
                    issues=['원문 페이지 표제는 F20, 도식 표기는 F12로 서로 다릅니다. 임의로 등급을 확정하지 않았습니다.'] if page==210 else []
                    emit('플랜지',n,variant,{**dims,'mass':number(row[col])},page,'부도 13 관 플랜지',joint=joint,issues=issues,
                        notes=('RF형 또는 GF형별 원문 무게입니다. 주문자 지정이 없으면 RF-RF 조합이라는 원문 주석을 참조하세요.',))
        for page in range(202,208):
            variant='F12' if page<204 else 'F15' if page<206 else 'F20'
            for row in full_columns(doc.pages[page-1],10):
                n,b=pair(row[0])
                dims={k:number(row[c]) for k,c in [('outsideDiameter',1),('branchOutsideDiameter',2),('thickness',3),('branchThickness',4),('steelH',5),('steelI',6),('reinforcementThickness',7),('reinforcementWidth',8),('mass',9)] if row[c].strip()!='-'}
                emit('플랜지 붙이 T관',n,variant,dims,page,'부도 12 플랜지 붙이 T자관',branch=b,
                    notes=('원문 무게는 참고값이며 플랜지 무게를 포함하지 않습니다. 지관 DN80~150은 소화전·공기밸브용, DN600은 맨홀용이라는 원문 주석을 참조하세요. 플랜지 자체 치수는 별도 규격에 따릅니다.',))
