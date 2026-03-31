import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

with open(r"C:\Users\chenr\Desktop\Jogo\public\index.html", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")

# Line 4195 - full char dump
line = lines[4194]
print(f"Line 4195 ({len(line)} chars):")
for i, c in enumerate(line):
    print(f"  [{i}] U+{ord(c):04X} = {repr(c)}")

# Check for specific patterns
print("\n=== Specific pattern checks ===")
# ðŸ (U+00F0 U+0178) - trophy mojibake
for i, c in enumerate(content):
    if ord(c) == 0x00F0 and i + 1 < len(content) and ord(content[i + 1]) == 0x0178:
        snippet = content[max(0, i) : min(len(content), i + 10)]
        line_num = content[:i].count("\n") + 1
        chars = [f"U+{ord(x):04X}" for x in snippet]
        print(f"  Trophy mojibake at line {line_num}: {chars}")

# â— (U+00E2 U+2014) - bullet circle mojibake
for i, c in enumerate(content):
    if ord(c) == 0x00E2 and i + 1 < len(content) and ord(content[i + 1]) == 0x2014:
        snippet = content[max(0, i) : min(len(content), i + 10)]
        line_num = content[:i].count("\n") + 1
        chars = [f"U+{ord(x):04X}" for x in snippet]
        print(f"  Circle mojibake at line {line_num}: {chars}")

# âœ (U+00E2 U+0153) - checkmark mojibake
for i, c in enumerate(content):
    if ord(c) == 0x00E2 and i + 1 < len(content) and ord(content[i + 1]) == 0x0153:
        snippet = content[max(0, i) : min(len(content), i + 10)]
        line_num = content[:i].count("\n") + 1
        chars = [f"U+{ord(x):04X}" for x in snippet]
        print(f"  Checkmark mojibake at line {line_num}: {chars}")

# â† (U+00E2 U+2020) - arrow mojibake
for i, c in enumerate(content):
    if ord(c) == 0x00E2 and i + 1 < len(content) and ord(content[i + 1]) == 0x2020:
        snippet = content[max(0, i) : min(len(content), i + 10)]
        line_num = content[:i].count("\n") + 1
        chars = [f"U+{ord(x):04X}" for x in snippet]
        print(f"  Arrow mojibake at line {line_num}: {chars}")

# EXPLOS&Atilde;O
idx = content.find("EXPLOS&Atilde;O")
if idx >= 0:
    print(f"  EXPLOS&Atilde;O at index {idx}")

# âš¡ (flash emoji mojibake)
for i, c in enumerate(content):
    if ord(c) == 0x00E2 and i + 1 < len(content) and ord(content[i + 1]) == 0x0161:
        snippet = content[max(0, i) : min(len(content), i + 10)]
        line_num = content[:i].count("\n") + 1
        chars = [f"U+{ord(x):04X}" for x in snippet]
        print(f"  Flash mojibake at line {line_num}: {chars}")
