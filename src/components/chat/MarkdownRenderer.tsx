'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// 复制按钮组件
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors z-10"
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="overflow-hidden max-w-full">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
                        // 代码块
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          
          // 判断是否是代码块（有语言标识或多行）
          const isCodeBlock = match || codeString.includes('\n');

          if (isCodeBlock) {
            return (
              <div className="relative my-4 overflow-hidden">
                {/* 语言标签 */}
                {match && (
                  <div className="absolute top-0 left-0 px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded-tl rounded-br z-10">
                    {match[1]}
                  </div>
                )}
                {/* 复制按钮 - 一直显示 */}
                <CopyButton text={codeString} />
                {/* 代码高亮 */}
                <div className="overflow-x-auto">
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match?.[1] || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      paddingTop: match ? '2rem' : '1rem',
                      fontSize: '0.85rem',
                    }}
                    wrapLongLines={false}
                    showLineNumbers={false}
                    codeTagProps={{
                      style: {
                        background: 'transparent',
                        lineHeight: '1.5'
                      }
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          }

          // 行内代码
          return (
            <code
              className="px-1.5 py-0.5 bg-gray-700 rounded text-sm font-mono text-pink-400"
              {...props}
            >
              {children}
            </code>
          );
        },

                                // 段落
        p({ children }) {
          return <p className="mt-2 mb-3 last:mb-0 leading-7">{children}</p>;
        },

        // 标题
        h1({ children }) {
          return <h1 className="text-2xl font-bold font-orbitron tracking-wider mb-3 mt-6 pb-2 border-b border-primary/30 text-primary">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold font-orbitron tracking-wider mb-2.5 mt-5 text-primary">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold mb-2 mt-4 text-primary/90">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="text-base font-semibold mb-1.5 mt-3 text-primary/80">{children}</h4>;
        },

        // 列表
        ul({ children }) {
          return <ul className="list-disc list-inside my-3 space-y-1.5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside my-3 space-y-1.5">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-6 my-1">{children}</li>;
        },

                // 引用
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-2 my-4 text-gray-400 italic bg-primary/5">
              {children}
            </blockquote>
          );
        },

                // 表格
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-primary/20 rounded-sm">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-primary/10 border-b-2 border-primary/40">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody>{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-primary/5 transition-colors">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-3 py-2 text-left text-sm font-bold text-primary font-mono">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="px-3 py-2 text-sm border-t border-primary/20">{children}</td>;
        },

                // 链接
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline decoration-secondary/30 hover:text-secondary/80 hover:decoration-secondary/60 transition-colors"
            >
              {children}
            </a>
          );
        },

        // 分割线
        hr() {
          return <hr className="my-6 border-primary/30" />;
        },

        // 加粗
        strong({ children }) {
          return <strong className="font-bold text-primary">{children}</strong>;
        },

        // 斜体
        em({ children }) {
          return <em className="italic text-primary/80">{children}</em>;
        },

        // 删除线
        del({ children }) {
          return <del className="line-through text-gray-500">{children}</del>;
        },

        // 图片
        img({ src, alt }) {
          return <img src={src} alt={alt} className="rounded-sm border border-primary/20 my-4 max-w-full" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
