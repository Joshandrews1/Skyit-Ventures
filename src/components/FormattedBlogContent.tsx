import React from 'react';

interface FormattedBlogContentProps {
  content: string;
  className?: string;
}

// Helper function to convert inline markdown (e.g. **bold**, *italic*, `code`) into React Nodes
export const parseInlineFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by bold (**...**) or italic (*...* or _..._) or code (`...`)
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if ((part.startsWith('_') && part.endsWith('_') && part.length > 2) ||
        (part.startsWith('*') && part.endsWith('*') && part.length > 2)) {
      return (
        <em key={i} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="bg-slate-100 text-brand px-1.5 py-0.5 rounded text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Clean up any remaining rogue unclosed asterisks or markdown code fences
    const cleaned = part.replace(/\*\*/g, '').replace(/```/g, '');
    return <React.Fragment key={i}>{cleaned}</React.Fragment>;
  });
};

export const FormattedBlogContent: React.FC<FormattedBlogContentProps> = ({
  content,
  className = "text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4"
}) => {
  if (!content) return null;

  // Normalize line endings and split into paragraph blocks
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\n+/);

  return (
    <div className={className}>
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headings (e.g. ### Heading Title or ## Heading Title)
        if (/^#{1,6}\s+/.test(trimmed)) {
          const headingText = trimmed.replace(/^#{1,6}\s+/, '');
          return (
            <h3 key={blockIdx} className="text-sm sm:text-base font-display font-bold text-slate-900 mt-6 mb-2 border-b border-slate-100 pb-1.5">
              {parseInlineFormattedText(headingText)}
            </h3>
          );
        }

        // Blockquotes (e.g. > "Quote text" or > Quote text)
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed.split('\n').map(l => l.replace(/^>\s*/, '')).join(' ');
          const cleanedQuote = quoteLines.replace(/^["“]/, '').replace(/["”]$/, '');
          return (
            <blockquote key={blockIdx} className="border-l-4 border-brand bg-slate-50/90 p-4 sm:p-5 rounded-r-2xl italic text-slate-800 my-4 font-medium text-xs sm:text-sm shadow-2xs border border-slate-100/80">
              "{parseInlineFormattedText(cleanedQuote)}"
            </blockquote>
          );
        }

        // Lists (numbered e.g. 1. Item or bullet e.g. - Item or * Item)
        const lines = trimmed.split('\n');
        const isList = lines.some(l => /^\d+\.\s+|^\-\s+|^\*\s+/.test(l.trim()));

        if (isList) {
          const hasHeader = !/^\d+\.\s+|^\-\s+|^\*\s+/.test(lines[0].trim());
          const headerText = hasHeader ? lines[0] : null;
          const listItems = hasHeader ? lines.slice(1) : lines;

          return (
            <div key={blockIdx} className="my-3 space-y-2">
              {headerText && (
                <p className="font-bold text-slate-900 text-xs sm:text-sm mb-1.5">
                  {parseInlineFormattedText(headerText)}
                </p>
              )}
              <div className="space-y-2 pl-1">
                {listItems.map((item, itemIdx) => {
                  const cleanedItem = item.replace(/^\d+\.\s+|^\-\s+|^\*\s+/, '').trim();
                  if (!cleanedItem) return null;
                  return (
                    <div key={itemIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                      <div className="flex-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {parseInlineFormattedText(cleanedItem)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={blockIdx} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-2.5">
            {parseInlineFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
