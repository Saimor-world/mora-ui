
import os

filepath = 'c:/saimor/mora-ui/components/home/UniverseControls.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix title
target1 = 'title={companies.length > 1 ? "Click to switch context (HQ vs Local)" : "Current Context"}'
replacement1 = 'title={companies.length > 1 ? "Click to switch context" : "Current Context"}'
content = content.replace(target1, replacement1)

# Fix badge
target2 = """                    <span className="text-[10px] uppercase tracking-wider font-mono select-none">
                        {activeCompany.name}
                    </span>"""

replacement2 = """                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-mono select-none">
                            {activeCompany.name}
                        </span>
                        {viewMode === 'demo' && (
                            <span className="text-[8px] text-blue-400 font-bold tracking-[0.2em] leading-tight text-left">DEMO</span>
                        )}
                    </div>"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Badge updated successfully")
else:
    # Try different indentation
    print("Badge target not found, trying fuzzy match...")
    if '{activeCompany.name}' in content:
         print("Found activeCompany.name, performing surgical replacement")
         import re
         content = re.sub(r'<span className="text-\[10px\] uppercase tracking-wider font-mono select-none">(\s+)\{activeCompany\.name\}(\s+)</span>', 
                        r'<div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider font-mono select-none">\1{activeCompany.name}\2</span>{viewMode === "demo" && (<span className="text-[8px] text-blue-400 font-bold tracking-[0.2em] leading-tight text-left">DEMO</span>)}</div>', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished updates.")
