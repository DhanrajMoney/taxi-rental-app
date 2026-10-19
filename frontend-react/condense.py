import re

with open('src/styles/drivers.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect rules
# Keep the top comment and :root and keyframes intact
# For each rule:
# If it has 1-2 short declarations and no nested curly braces, format compactly on 1 line
def replacer(match):
    sel = match.group(1).rstrip()
    body = match.group(2).strip()
    
    # Don't compact :root or keyframes or media queries
    if '@keyframes' in sel or ':root' in sel or '@media' in sel:
        return match.group(0)
        
    lines = [l.strip() for l in body.split(';') if l.strip()]
    if len(lines) <= 2 and all(len(l) <= 40 for l in lines) and '\n' not in sel:
        return f"{sel} {{ {'; '.join(lines)}; }}"
    return match.group(0)

# Replace simple blocks
# Let's test on non-nested selectors
new_content = re.sub(r'([^{}\n@]+)\s*\{\s*([^{}]+?)\s*\}', replacer, content)

# Remove double blank lines
new_content = re.sub(r'\n{3,}', '\n\n', new_content)

with open('src/styles/drivers.css', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Lines before: {len(content.splitlines())}, after: {len(new_content.splitlines())}")

