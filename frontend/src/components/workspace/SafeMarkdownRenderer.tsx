import React, { useState } from 'react';
import { marked, type Tokens } from 'marked';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Safely decodes HTML entities emitted by marked or present in source text.
 * Performs up to 2 passes to handle double-encoded entities (e.g., &amp;lt; -> &lt; -> <).
 * Does not execute arbitrary HTML; React renders string values as safe DOM text nodes.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('&')) return str;

  let result = str;
  for (let i = 0; i < 2; i++) {
    if (!result.includes('&')) break;
    const decoded = result
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&le;/g, '<=')
      .replace(/&ge;/g, '>=')
      .replace(/&ne;/g, '!=')
      .replace(/&times;/g, 'x')
      .replace(/&plusmn;/g, '+/-')
      .replace(/&minus;/g, '-')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => {
        const num = parseInt(code, 10);
        return num > 0 && num < 65536 ? String.fromCharCode(num) : _;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const num = parseInt(hex, 16);
        return num > 0 && num < 65536 ? String.fromCharCode(num) : _;
      });

    if (decoded === result) break;
    result = decoded;
  }
  return result;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decodedCode = decodeHtmlEntities(code);

  return (
    <div className="my-3 rounded-lg border border-[#1C2230] bg-[#0A0D14] overflow-hidden text-left">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F1420] border-b border-[#1C2230] text-xs font-mono">
        <span className="text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#00B8A3]" />
              <span className="text-[#00B8A3]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed font-medium">
        <code>{decodedCode}</code>
      </pre>
    </div>
  );
};

export const SafeMarkdownRenderer: React.FC<SafeMarkdownRendererProps> = ({ content, className }) => {
  if (!content || !content.trim()) {
    return null;
  }

  // Parse markdown content safely into AST tokens using marked.lexer
  let tokens: Tokens.Generic[] = [];
  try {
    tokens = marked.lexer(content, { gfm: true, breaks: true }) as Tokens.Generic[];
  } catch {
    // Fallback to basic text rendering if parsing fails
    return (
      <div className={cn("text-xs text-zinc-300 whitespace-pre-wrap font-sans break-words", className)}>
        {decodeHtmlEntities(content)}
      </div>
    );
  }

  const renderInlineTokens = (inlineTokens?: Tokens.Generic[]): React.ReactNode => {
    if (!inlineTokens || inlineTokens.length === 0) return null;

    return inlineTokens.map((token, idx) => {
      switch (token.type) {
        case 'text':
          return <React.Fragment key={idx}>{decodeHtmlEntities(token.text)}</React.Fragment>;

        case 'codespan':
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 rounded bg-[#111521] border border-[#1C2230] text-cyan-300 font-mono text-[12px] font-semibold select-text mx-0.5 break-words"
            >
              {decodeHtmlEntities(token.text)}
            </code>
          );

        case 'strong':
          return (
            <strong key={idx} className="font-semibold text-white">
              {renderInlineTokens(token.tokens)}
            </strong>
          );

        case 'em':
          return (
            <em key={idx} className="italic text-zinc-200">
              {renderInlineTokens(token.tokens)}
            </em>
          );

        case 'del':
          return (
            <del key={idx} className="line-through text-zinc-500">
              {renderInlineTokens(token.tokens)}
            </del>
          );

        case 'link': {
          const isSafe = /^https?:\/\//i.test(token.href) || token.href.startsWith('/') || token.href.startsWith('#');
          if (!isSafe) {
            return <span key={idx}>{decodeHtmlEntities(token.text)}</span>;
          }
          return (
            <a
              key={idx}
              href={token.href}
              target={token.href.startsWith('http') ? '_blank' : undefined}
              rel={token.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors break-words"
            >
              {renderInlineTokens(token.tokens) || decodeHtmlEntities(token.text)}
            </a>
          );
        }

        case 'br':
          return <br key={idx} />;

        case 'escape':
          return <React.Fragment key={idx}>{decodeHtmlEntities(token.text)}</React.Fragment>;

        default:
          return (
            <React.Fragment key={idx}>
              {token.tokens ? renderInlineTokens(token.tokens) : decodeHtmlEntities(token.text || token.raw)}
            </React.Fragment>
          );
      }
    });
  };

  const renderBlockTokens = (blockTokens: Tokens.Generic[]): React.ReactNode => {
    return blockTokens.map((token, idx) => {
      switch (token.type) {
        case 'heading': {
          const headingClass =
            token.depth === 1
              ? 'text-sm font-bold text-white mt-3 mb-1.5 tracking-tight'
              : token.depth === 2
              ? 'text-xs font-bold text-white mt-2.5 mb-1 tracking-tight'
              : token.depth === 3
              ? 'text-xs font-semibold text-zinc-200 mt-2 mb-1'
              : 'text-[11px] font-semibold text-zinc-300 mt-1.5 mb-0.5 uppercase tracking-wider';

          return (
            <div key={idx} className={headingClass}>
              {token.tokens ? renderInlineTokens(token.tokens) : decodeHtmlEntities(token.text)}
            </div>
          );
        }

        case 'paragraph':
          return (
            <p key={idx} className="text-[13px] sm:text-sm text-[#F3F4F6] leading-relaxed font-sans mb-2 text-left break-words">
              {token.tokens ? renderInlineTokens(token.tokens) : decodeHtmlEntities(token.text)}
            </p>
          );

        case 'code':
          return <CodeBlock key={idx} code={token.text} language={token.lang} />;

        case 'list': {
          const ListTag = token.ordered ? 'ol' : 'ul';
          const listClass = token.ordered
            ? 'list-decimal list-outside pl-4 space-y-1 mb-2 text-[13px] sm:text-sm text-[#F3F4F6] font-sans'
            : 'list-disc list-outside pl-4 space-y-1 mb-2 text-[13px] sm:text-sm text-[#F3F4F6] font-sans marker:text-cyan-400';

          return (
            <ListTag key={idx} className={listClass}>
              {token.items?.map((item: Tokens.ListItem, itemIdx: number) => (
                <li key={itemIdx} className="leading-relaxed pl-1 break-words">
                  {item.tokens ? renderBlockTokens(item.tokens as Tokens.Generic[]) : decodeHtmlEntities(item.text)}
                </li>
              ))}
            </ListTag>
          );
        }

        case 'blockquote':
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-cyan-500/60 bg-[#111521]/70 pl-3.5 py-2 pr-3 my-3 rounded-r text-xs text-zinc-300 italic font-sans break-words"
            >
              {token.tokens ? renderBlockTokens(token.tokens as Tokens.Generic[]) : decodeHtmlEntities(token.text)}
            </blockquote>
          );

        case 'table':
          return (
            <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-[#1C2230]">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-[#111521] text-zinc-200 border-b border-[#1C2230]">
                  <tr>
                    {token.header?.map((cell: Tokens.TableCell, cellIdx: number) => (
                      <th key={cellIdx} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {cell.tokens ? renderInlineTokens(cell.tokens) : decodeHtmlEntities(cell.text)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2230] bg-[#0A0D14]">
                  {token.rows?.map((row: Tokens.TableCell[], rowIdx: number) => (
                    <tr key={rowIdx} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell: Tokens.TableCell, cellIdx: number) => (
                        <td key={cellIdx} className="px-3 py-2 text-zinc-300">
                          {cell.tokens ? renderInlineTokens(cell.tokens) : decodeHtmlEntities(cell.text)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

        case 'hr':
          return <hr key={idx} className="my-4 border-[#1C2230]" />;

        case 'space':
          return null;

        default:
          return (
            <div key={idx} className="mb-2 break-words">
              {token.tokens ? renderBlockTokens(token.tokens as Tokens.Generic[]) : decodeHtmlEntities(token.text || token.raw)}
            </div>
          );
      }
    });
  };

  return (
    <div className={cn("space-y-1 text-left select-text", className)}>
      {renderBlockTokens(tokens)}
    </div>
  );
};
