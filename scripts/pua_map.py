PUA_MAP = {
    # Numbers
    '\uE034': '1', '\uE035': '2', '\uE036': '3', '\uE037': '4', '\uE038': '5', 
    '\uE039': '6', '\uE03A': '7', '\uE03B': '8', '\uE03C': '9', '\uE03D': '0',
    # Punctuation & Math
    '\uE047': '=', '\uE052': ',', '\uE048': '+', '\uE044': '(', '\uE045': ')',
    # Greek
    '\uE09D': 'α', '\uE09F': 'γ', '\uE0B1': 'φ',
    # Decoration (delete)
    '\uF000': ''
}

def replace_pua(text):
    if not text:
        return text
    res = []
    for char in text:
        if '\uE000' <= char <= '\uF8FF':
            if char in PUA_MAP:
                res.append(PUA_MAP[char])
            else:
                res.append(char)
        else:
            res.append(char)
    return ''.join(res)
