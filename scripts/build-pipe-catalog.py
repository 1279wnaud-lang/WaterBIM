"""Build a source-traceable first release. Requires pdfplumber and pypdfium2.
No interpolation; blank source values remain absent. Historical handbook data.
"""
import json, hashlib
from pathlib import Path
import pdfplumber
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('G:/내 드라이브/경화 기술지원부/01.참고/00.지침/03.강관 핸드북')
FILES = {'ductile': '0 닥타일주철관_핸드북(Ductile_Iron_Pipeline,2012).pdf', 'steel': '강관핸드북_본문_부록_15판(최종)1204.pdf'}
OUT = ROOT / 'data' / 'pipe-sources'
OUT.mkdir(parents=True, exist_ok=True)
records, sources = [], {}
for key, name in FILES.items():
    sources[key] = dict(title=name, edition='2012' if key == 'ductile' else '15판', path=str(SOURCE/name), sha256=hashlib.sha256((SOURCE/name).read_bytes()).hexdigest(), currentStandardVerified=False)

def field(label, unit, symbol):
    return dict(label=label, unit=unit, sourceSymbol=symbol)

fields = {
 'outsideDiameter':field('바깥지름','mm','DE / D2'), 'thickness':field('관 두께','mm','e / e1 / T'),
 'massPerLength':field('직관부 단위중량','kg/m','M무게 / W'), 'length':field('길이','mm','L'),
 'mass':field('무게','kg','무게'), 'socketDiameter':field('이음관 치수 d','mm','d'),
 'radius':field('곡률반경','mm','R'), 'innerDiameter':field('안지름','mm','안지름'),
 'l1':field('분할 치수 l1','mm','l1'), 'l2':field('분할 치수 l2','mm','l2'), 'l3':field('끝단 치수 l3','mm','l3'),
 'centerLength':field('관심 길이','mm','관심 길이'), 't':field('곡관 치수 t','mm','t'), 's':field('각부 치수 s','mm','s / S')
}

def add(source, kind, dn, variant, dims, pdf, printed, table, *, angle=None, joint='', notes=None, issues=None, method='원문 이미지 대조', branch=None):
    keys = dict(nominalDiameter=dn, nominalDiameterUnit='mm', variant=variant, joint=joint)
    if angle is not None: keys.update(angle=angle, angleUnit='deg')
    if branch is not None: keys.update(branchNominalDiameter=branch, branchNominalDiameterUnit='mm')
    record = dict(id=f'{source}-{kind}-{dn}-{variant}-{joint}-{angle}', material='닥타일주철관' if source=='ductile' else '강관', part=kind, keys=keys, dimensions=dims,
      source=dict(documentId=source, pdfPage=pdf, printedPage=printed, table=table, image=f'{source}-{pdf}.webp'),
      validation=dict(status='needs-review' if issues else 'source-checked', method=method, issues=issues or [], currentStandardVerified=False), notes=notes or [])
    if branch is not None:
        record['id'] += f'-branch-{branch}'
        keys['variant'] += f' / 지관 DN{branch}'
    records.append(record)

dn=[80,100,125,150,200,250,300,350,400,450,500,600,700,800,900,1000,1100,1200,1400,1600,1800,2000,2200,2400,2600]
od=[98,118,144,170,222,274,326,378,429,480,532,635,738,842,945,1048,1144,1255,1462,1668,1875,2082,2288,2495,2702]
production='2012년 원문 주석: 당시 생산 가능 규격 80~1200 mm. 현재 공급 가능 여부는 확인하지 않았습니다.'
for variant,thickness,mass,printed in [
 ('상수 2종',[6.7,6.8,6.9,7,7.1,7.5,8,8.5,9,9.5,10,11,12,13,14,15,16,17,19,21,23,25,27,29,31],[13.5,16.4,21,25.3,33.8,44.3,56.3,69.6,83.7,98.5,115.6,152,193,238.7,288.7,343.2,399.5,465.9,607.2,766,943.4,1139,1352.1,1583.9,1833.9],'82'),
 ('상수 3종',[6,6.1,6.2,6.3,6.4,6.8,7.2,7.7,8.1,8.6,9,9.9,10.8,11.7,12.6,13.5,14.4,15.3,17.1,18.9,20.7,22.5,24.3,26.1,27.9],[12.2,15.1,18.9,22.8,30.6,40.2,50.8,63.2,75.5,89.8,104.3,137.1,173.9,215.2,260.2,309.3,360.1,420.1,547.2,690.3,850.1,1026.3,1218.3,1427.2,1652.4],'83')]:
 for n,o,t,w in zip(dn,od,thickness,mass):
  add('ductile','직관',n,variant,dict(outsideDiameter=o,thickness=t,massPerLength=w),42,printed,variant+' 직관부',notes=[production,'직관부만 수록. 소켓·라이닝 중량과 4/5/6 m 관 총중량은 포함하지 않습니다.'])

e=[7,7.2,7.5,7.8,8.4,9,9.6,10.2,10.8,11.4,12,13.2,14.4,15.6,16.8,18,19.2,20.4,22.8,25.2,27.6,30,32.4,34.8,37.2]
spigotL=[350,360,370,380,400,420,440,460,480,500,520,560,600,600,600,600,600,600,710,780,850,920,990,1060,1130]
spigotW=[7.9,9.6,12.4,15.6,22.5,31.5,41.5,52,64,77.5,94,133,179,226,272,328,396,456,664,922,1196,1534,1948,2409,2918]
socketL=[130,130,135,135,140,145,150,155,160,165,170,180,190,200,210,220,230,240,310,330,350,370,390,410,480]
socketWeights={
 'KP메커니컬':[8.8,10.4,13,16.1,22.5,30.5,39.5,48.5,58.5,69.5,83.5,118,158,197,238,294,354,423,614,830,1051,1315,1655,2049,2636],
 '메커니컬':[8.1,11.8,14,17,24,32.5,42,50,60,72.5,85,118,158,207,256,334,382,458,657,880,1111,1380,1735,2146,2733],
 '타이튼':[8.5,10.3,13.2,16.5,23.5,32.5,42.5,52,61.5,76,89,119,154,198,244,310,378,452,680,920,1186,1520,None,None,None]}
collarD=[107,127,153,180,232,285,337,390,441,492,545,649,753,858,962,1066,1163,1275,1477,1683,1889,2095,2301,2507,2713]
collarL=[160,160,165,165,170,175,180,185,190,195,200,210,220,230,240,250,260,270,340,360,380,400,420,440,460]
collarWeights={'KP메커니컬':[9.3,11.3,14.1,17.4,23.5,32,40,51,62,75,90,126,171,202,244,298,345,416,651,864,1124,1421,1796,2268,2899], '메커니컬':[12.3,12.5,17.5,20.5,27.5,30,45,55,63.5,78.5,89,125,174,220,280,354,402,484,736,965,1244,1552,1957,2463,3094]}
for i,n in enumerate(dn):
 add('ductile','플랜지관',n,'표준',dict(thickness=e[i],length=spigotL[i],mass=spigotW[i]),50,'99','2. 플랜지관',joint='플랜지 / 삽입구',notes=[production])
 for joint,weights in socketWeights.items():
  dims=dict(thickness=e[i],length=socketL[i])
  if weights[i] is not None:dims['mass']=weights[i]
  add('ductile','플랜지 소켓관',n,'표준',dims,50,'98','1. 플랜지 소켓관',joint=joint,notes=[production]+(['원문 무게 공란. 0으로 환산하지 않습니다.'] if weights[i] is None else []))
 for joint,weights in collarWeights.items():
  add('ductile','이음관',n,'표준',dict(thickness=e[i],socketDiameter=collarD[i],length=collarL[i],mass=weights[i]),51,'100','3. 이음관',joint=joint,notes=[production,'원문 주석: 내벽 흑페인트 도장과 에폭시 수지 분체 도장을 제공.'])

# Steel source tables: complete numeric columns, explicit nominal-diameter order.
steelDN=[80,100,125,150,200,250,300,350,400,450,500,600,700,800,900,1000,1100,1200,1350,1500,1600,1650,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000]
with pdfplumber.open(SOURCE/FILES['steel']) as doc:
 table=doc.pages[166].extract_tables()[0][-1]
 cols=[c.splitlines() for c in table]
 assert all(len(c)==35 for c in cols)
 for label,tcol,wcol in [('STWW 290',1,2),('STWW 370',3,4),('STWW 400 / A',5,6)]:
  for i,n in enumerate(steelDN):
   if cols[tcol][i]=='-':continue
   add('steel','직관',n,label,dict(outsideDiameter=float(cols[0][i]),thickness=float(cols[tcol][i]),massPerLength=float(cols[wcol][i])),167,'149','부표 1 바깥지름, 두께 및 무게',notes=['수록 표준 KS D 3565-2002. 도복장·접합부 중량은 별도 확인.'],method='표 추출 및 원문 열 대조')
 for page,angle in [(175,90),(176,45)]:
  table=doc.pages[page-1].extract_tables()[0][-1]
  cols=[c.splitlines() for c in table]
  assert len(cols)==15 and all(len(c)==35 for c in cols)
  for variant,tcol,icol,wcol in [('F12',1,2,13),('F15',3,4,14)]:
   for i,n in enumerate(steelDN):
    dims={key:float(cols[col][i]) for key,col in [('outsideDiameter',0),('thickness',tcol),('innerDiameter',icol),('radius',7),('l1',8),('l2',9),('l3',10),('length',11),('centerLength',12),('mass',wcol)]}
    issues=[]
    if abs(dims['outsideDiameter']-2*dims['thickness']-dims['innerDiameter'])>0.15:issues.append('원문 안지름이 바깥지름−2×두께와 불일치합니다. 원문 값을 보존했으며 적용 전 확인이 필요합니다.')
    add('steel','곡관',n,variant,dims,page,str(page-18),f'부도 {page-174} {angle}° 곡관',angle=angle,joint='용접',notes=['수록 표준 KS D 3578-1997. 치수 기호는 원문 도식을 참조하세요.'],issues=issues,method='표 추출 및 원문 열 대조')

# Ductile socket bends (닥타일 곡관), 원문 p.101-104 (pdf 51-53), V. 닥타일 주철 이형관 항목 4-7.
# 원문 t 칼럼은 "표준값(KP값)" 형태이며, KP메커니컬·KP-L 접합은 괄호 안 KP값을 사용합니다(원문 각주 "( )는 KP치수임").
bendJoints = ['KP메커니컬', '메커니컬', '타이튼', 'KP-L']
def add_bend(angle, pdf, printed, dnCount, R, t, tKP, weights, anomalies=None):
    anomalies = anomalies or {}
    for i in range(dnCount):
        n = dn[i]
        for joint in bendJoints:
            useKP = joint in ('KP메커니컬', 'KP-L')
            for body in ('A', 'B'):
                w = weights[joint][body][i]
                dims = dict(thickness=e[i], radius=R[i], t=(tKP[i] if useKP else t[i]), s=(200 if i < 18 else 250))
                notes = ['KP형 접합 치수(t)를 원문 괄호 안 값으로 사용했습니다.'] if useKP else []
                if w is None:
                    notes.append('원문 무게 공란. 0으로 환산하지 않습니다.')
                else:
                    dims['mass'] = w
                issues = anomalies.get((n, joint, body))
                add('ductile', '곡관', n, body + '형', dims, pdf, printed, f'{angle}° 소켓곡관', angle=angle, joint=joint,
                    notes=notes or None, issues=[issues] if issues else None)

R90=[75,95,120,145,195,240,290,340,390,435,485,580,680,775,870,970,1070,1165]
t90=[100,120,145,170,220,270,320,370,420,470,520,620,720,820,920,1020,1120,1220]
tKP90=[150,170,195,220,270,320,370,420,470,520,570,670,770,870,970,1070,1170,1270]
w90={
 'KP메커니컬':{'A':[11.8,14.9,19.5,25.5,38.0,55.0,75.0,101,130,165,206,307,435,573,744,953,1178,1475],'B':[10.6,13.6,18.1,23.5,36.0,52.5,71.5,96.0,123,156,195,289,408,544,712,912,1135,1418]},
 '메커니컬':{'A':[14.4,17.8,23.0,27.5,41.5,60.5,81.5,107.3,136.1,173.2,215.9,320.3,454.8,617.9,815.4,1072.4,1192,1486],'B':[11.3,14.3,19.0,23.5,36.0,52.5,71.5,95.6,132.4,155.9,199.2,288.3,405.9,555.9,732.2,962,1118,1395]},
 '타이튼':{'A':[9.8,12.9,17.6,23.5,36.0,53.5,74.5,100,126,166,202,292,405,545,722,942,1178,1477],'B':[8.9,11.7,16.0,21.0,33.0,49.0,68.0,91.0,116,151,186,272,381,516,683,887,1111,1391]},
 'KP-L':{'A':[13.2,16.7,22.0,29.0,42.5,62.0,83.5,112,143,180,223,329,458,596,768,976,1201,1496],'B':[11.3,14.5,20.0,25.5,38.5,55.5,76.0,102,130,164,204,300,419,556,724,824,1146,1428]},
}
add_bend(90,51,'101',18,R90,t90,tKP90,w90)

R45=[88,100,120,145,200,245,300,350,400,450,495,595,695,795,895,995,1095,1195,1243,1364,1473,1593,1714,1823,1943]
t45=[55,65,75,85,110,130,150,175,195,220,240,285,330,370,415,460,500,550,515,565,610,660,710,755,805]
tKP45=[80,90,100,110,135,155,175,200,220,245,265,310,355,395,440,485,525,575,540,590,635,685,735,780,830]
none7=[None]*7
w45={
 'KP메커니컬':{'A':[10.2,12.7,16.2,21.0,30.0,42.5,56.0,75.0,94.5,119,147,217,304,387,494,626,758,950]+none7,'B':[9.0,11.4,14.8,19.0,28.0,40.0,53.0,70.0,88.5,111,136,199,277,358,461,585,715,893]+none7},
 '메커니컬':{'A':[12.9,15.7,19.4,23.0,34.0,47.0,63.0,79.8,98.5,127,153,221,310,413,539,717,491,990,1277,1725,2265,2898,3696,4653,5836],'B':[9.8,12.2,15.4,18.8,28.0,39.5,53.0,68.0,85.0,110,131,190,264,351,458,601,719,899,1175,1583,2068,2643,3342,4158,5142]},
 '타이튼':{'A':[8.9,11.6,15.5,20.0,30.5,43.5,59.0,78.0,95.5,127,151,211,285,373,489,636,782,980,1324,1804,2415,3179,None,None,None],'B':[8.0,10.4,13.9,18.0,27.5,39.0,52.5,69.5,86.5,112,135,191,262,344,450,580,715,894,1198,1622,2143,2784,None,None,None]},
 'KP-L':{'A':[11.6,14.5,18.6,24.0,35.0,49.5,65.0,86.5,108,134,164,238,327,410,517,649,781,970,1228,1670,2201,2836,3616,4554,5751],'B':[9.7,12.3,16.1,21.0,30.5,43.0,57.0,76.0,95.0,119,145,210,288,370,473,597,726,903,1169,1578,2064,2646,3343,4156,5155]},
}
add_bend(45,52,'102',25,R45,t45,tKP45,w45,anomalies={(1100,'메커니컬','A'):'원문 무게가 인접 규격 대비 비정상적으로 낮습니다(DN1000 717 -> DN1100 491 -> DN1200 990, 동일 행 B형은 719로 A형보다 큼). 원문 값을 보존했으며 적용 전 확인이 필요합니다.'})

R225=[85,105,130,155,195,240,300,345,390,435,495,590,695,800,890,995,1050,1150,1307,1408,1533,1659,1785,1910,2011]
t225=[40,40,50,55,65,75,85,95,110,120,130,150,175,195,220,240,270,285,260,280,305,330,355,380,400]
tKP225=[65,65,75,80,90,100,110,120,135,145,155,175,200,220,245,265,295,310,285,305,330,355,380,405,425]
w225={
 'KP메커니컬':{'A':[9.8,11.9,15.2,19.3,27.0,37.5,48.0,63.0,79.0,97.5,119,172,239,295,371,461,558,679]+none7,'B':[8.6,10.6,13.8,17.5,25.0,34.5,45.0,58.0,73.0,89.5,108,154,211,267,338,420,515,623]+none7},
 '메커니컬':{'A':[12.5,14.9,18.4,21.5,31.0,42.0,54.5,68.0,83.5,105,125,176,245,322,416,552,591,720,940,1249,1638,2080,2651,3361,4218],'B':[9.4,11.4,14.4,17.3,25.0,34.5,44.5,56.0,70.0,87.5,103,145,199,260,335,436,519,629,838,1107,1442,1825,2297,2866,3525]},
 '타이튼':{'A':[8.5,10.8,14.5,18.7,27.0,38.0,51.0,66.0,80.0,105,123,166,220,282,366,471,582,709,987,1329,1789,2361,None,None,None],'B':[7.6,9.6,12.9,16.5,24.0,33.5,44.5,57.5,71.0,90.0,107,146,196,253,327,415,515,624,862,1147,1517,1966,None,None,None]},
 'KP-L':{'A':[11.2,13.7,17.6,22.0,31.5,44.0,56.5,74.5,92.5,113,137,193,261,319,394,484,581,700,891,1194,1575,2018,2572,3262,4133],'B':[9.3,11.5,15.0,19.2,27.5,38.0,49.0,63.5,79.5,97.0,117,165,223,279,350,432,526,633,832,1103,1438,1828,2298,2864,3537]},
}
add_bend(22.5,52,'103',25,R225,t225,tKP225,w225)

R1125=[75,115,125,150,185,230,310,345,380,415,495,570,685,760,875,995,1075,1195,1320,1421,1574,1675,1929,2081,2183]
t1125=[30,30,35,35,40,50,55,60,65,70,75,85,95,110,120,130,140,150,130,140,155,165,190,205,215]
tKP1125=[55,55,60,60,65,75,80,85,90,95,100,110,120,135,145,155,165,175,155,165,180,190,215,230,240]
w1125={
 'KP메커니컬':{'A':[9.6,11.6,14.5,18.2,25.0,34.5,44.0,57.5,70.5,86.0,104,149,202,248,303,372,436,532]+none7,'B':[8.4,10.3,13.1,16.4,23.0,32.0,41.0,52.5,64.0,78.0,93.5,131,175,219,271,332,393,475]+none7},
 '메커니컬':{'A':[12.3,14.5,17.7,20.5,29.0,39.0,50.5,62.0,74.5,93.0,110.0,153,209,274,348,463,467,571,756,998,1307,1641,2130,2714,3426],'B':[9.2,11.0,13.7,16.2,23.0,31.5,40.5,50.0,61.0,75.5,88.5,122,163,212,267,347,396,480,654,856,1111,1385,1776,2218,2732]},
 '타이튼':{'A':[8.3,10.5,13.8,17.6,25.0,35.5,47.0,60.5,71.5,93.5,108,143,184,234,298,382,460,562,802,1078,1458,1921,None,None,None],'B':[7.4,9.3,12.2,15.4,22.0,31.0,40.5,52.0,62.0,78.5,92.0,123,160,205,259,326,393,476,677,896,1186,1526,None,None,None]},
 'KP-L':{'A':[11.0,13.3,16.9,21.5,30.0,41.5,52.5,68.5,83.5,101,122,170,225,271,327,395,459,552,707,943,1244,1578,2050,2614,3340],'B':[9.1,11.2,14.4,18.1,25.5,35.5,45.0,58.0,71.0,85.5,102,141,186,231,282,343,404,485,647,852,1107,1388,1778,2216,2745]},
}
add_bend(11.25,53,'104',25,R1125,t1125,tKP1125,w1125)

from pipe_catalog_ductile import extend as extend_ductile
extend_ductile(add, fields, field)
from pipe_catalog_steel import extend as extend_steel
extend_steel(add, fields, field, SOURCE/FILES['steel'])

# Source snapshots are shipped locally, independent of the original G: drive.
for key,page in sorted({(r['source']['documentId'],r['source']['pdfPage']) for r in records}):
 doc=pdfium.PdfDocument(str(SOURCE/FILES[key]))
 doc[page-1].render(scale=2, rotation=90 if key=='ductile' and page==42 else 0).to_pil().save(OUT/f'{key}-{page}.webp',quality=88)

catalog=dict(schemaVersion=1, title='관·이형관 규격 사전', sources=sources, fields=fields, records=records,
 coverage=dict(stage='2차 정리',included=['직관 소켓·스피곳 끝관 길이별 총중량','상수관 이형수 2·3종 직관부','부록IV 이형관 1~16판 소켓곡관·T관·연락관·마개플랜지·플랜지곡관 등','부록VI 하수이형관 1~13판 나팔관·리듀서·U관·단관·Y관·밸브 부관·캡·합플랜지·TM 이음관·KP 지수이륜','강관 STWW 290·370·400 A 직관','강관 F12·F15·F20 90·45·22½·11¼·5⅝곡관','강관 F12·F15 일반 T관 및 F12·F15·F20 플랜지 붙이 T관','강관 F12·F15·F20 연락관 및 RF·GF 플랜지 (PDF 210 표기 오자 불일치 명시)'],pending=['강관 STWW400 B 및 부록 번호 부록8~11·13A/B·14 세부제원','소재 관·단조품 공급 범위 확인'],unavailable=[dict(item='강관 F20 일반 T관',reason='부록6은 F12/F15 수치들만 수록. F20은 KS B 1541·KS B 1543 또는 매수·매도 당사자 협의에 따른다는 원문 주석이 있어 수치 인코딩이 생성되지 않음.',documentId='steel',pdfPage=180,printedPage='162',table='부록6 T관')]),
 disclaimer='핸드북 수록값을 정리한 참고 자료입니다. 최신 표준 적합성이나 현재 공급 가능 여부를 판정하지 않습니다.')
from collections import Counter
assert len({r['id'] for r in records})==len(records), [k for k,v in Counter(r['id'] for r in records).items() if v>1]
for r in records:
 assert all(k in fields and isinstance(v,(float,int)) and v>0 for k,v in r['dimensions'].items())
(ROOT/'data'/'pipe-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
print(f'{len(records)} records; {sum(bool(r["validation"]["issues"]) for r in records)} review flags')
