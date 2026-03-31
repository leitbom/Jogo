import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

with open(r"C:\Users\chenr\Desktop\Jogo\public\index.html", "r", encoding="utf-8") as f:
    content = f.read()

patterns_to_find = [
    "DESLIGADO",
    "LIGADO",
    "VOLTAR",
    "VENCEDOR",
    "CAM VIEW",
    "KILL",
    "EMPATE",
    "VITORIA",
    "DESTRU",
    "EXPLOS",
    "NÃƒO",
    "NÃ",
    "vocÃª",
    "cÃ¢meras",
    "CenÃ¡rio",
    "REFLEX",
    "FLASH",
    "BACKSTAB",
    "Â§",
    "â•",
    "â€",
]

for p in patterns_to_find:
    idx = content.find(p)
    if idx >= 0:
        start = max(0, idx - 5)
        end = min(len(content), idx + len(p) + 5)
        chars = [f"U+{ord(c):04X}" for c in content[idx : idx + len(p)]]
        print(f"FOUND '{p}' at {idx}: {chars}")
    else:
        print(f"NOT FOUND '{p}'")

# Also find all lines with emoji-like mojibake patterns
print("\n=== Lines with potential emoji mojibake ===")
lines = content.split("\n")
for i, line in enumerate(lines):
    for j, c in enumerate(line):
        cp = ord(c)
        if cp in (0x00F0, 0x00E2, 0x00C3):  # common mojibake starters
            # check if this is likely mojibake (followed by another high byte)
            if j + 1 < len(line) and ord(line[j + 1]) > 0x7F:
                # Show a few chars around it
                start = max(0, j)
                end = min(len(line), j + 20)
                segment = line[start:end]
                seg_chars = [f"{c}(U+{ord(c):04X})" for c in segment]
                print(f"  Line {i + 1}: {''.join(seg_chars)}")
                break  # only show first occurrence per line
