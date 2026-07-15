import re

# Read the file
with open('FolderContent.tsx', 'r') as f:
    content = f.read()

# Find the allSections array start and end
start_idx = content.find('const allSections')
if start_idx == -1:
    print("ERROR: allSections not found")
    exit(1)

# Find the opening bracket
bracket_start = content.find('[', start_idx)

# Find the closing bracket by counting
bracket_count = 0
pos = bracket_start
while pos < len(content):
    if content[pos] == '[':
        bracket_count += 1
    elif content[pos] == ']':
        bracket_count -= 1
        if bracket_count == 0:
            bracket_end = pos
            break
    pos += 1

# Extract the array content
array_content = content[bracket_start:bracket_end+1]

# Extract individual sections using regex
# Find each section starting with { and ending with },
sections = []
section_pattern = r'\{\s+label:\s+\'([^\']+)\'[^}]*?(?=\n\s+\},\s+\{|\n\s+\]\s*;)'

# Better approach: manually extract each section
section_starts = []
for match in re.finditer(r"{\s+label:\s+'([^']+)'", array_content):
    section_starts.append((match.group(1), match.start()))

print(f"Found {len(section_starts)} sections")
for name, pos in section_starts:
    print(f"  - {name}")

# Now we need to extract each section properly
# This is complex, so let's use a different approach
print("\nWill reorder by moving DESIGN AND ILLUSTRATION and CERAMICS AND FURNITURE to the end")
