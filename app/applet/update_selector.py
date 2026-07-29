with open('src/components/PackageUsageModeSelector.tsx', 'r') as f:
    content = f.read()

old_block = """      {/* Header Title */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 border-b pb-2.5 border-white/10 light:border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">tune</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-snug">
            Appliance Load & Duration Modes
          </span>
        </div>
        <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${
          isDark ? 'bg-white/10 text-[#b3c5ff]' : 'bg-slate-200 text-slate-700'
        }`}>
          Select Usage Profile
        </span>
      </div>"""

new_block = """      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b pb-3 border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">tune</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-snug">
            Appliance Load & Duration Modes
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-xs">
          Select Usage Profile
        </span>
      </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/components/PackageUsageModeSelector.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("OLD BLOCK NOT FOUND")
