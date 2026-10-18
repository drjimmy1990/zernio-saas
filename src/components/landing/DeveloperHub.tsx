'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  Code2,
  Terminal,
  Bot,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

type SdkLang = 'node' | 'python' | 'go' | 'php' | 'ruby' | 'java' | 'dotnet' | 'rust';

interface SdkInfo {
  name: string;
  langKey: SdkLang;
  installCmd: string;
  filename: string;
  code: string;
}

const SDK_DATA: Record<SdkLang, SdkInfo> = {
  node: {
    name: 'Node / TS',
    langKey: 'node',
    installCmd: 'npm install @asra3/node',
    filename: 'index.ts',
    code: `import Asra3 from '@asra3/node';

const asra3 = new Asra3(process.env.ASRA3_API_KEY);

// 1 call to 18 channels + WhatsApp template broadcast
const post = await asra3.posts.create({
  content: 'Omnichannel launch live worldwide! 🚀',
  mediaUrls: ['https://cdn.asra3.com/launch.mp4'],
  platforms: ['instagram', 'tiktok', 'linkedin', 'whatsapp'],
  metadata: {
    whatsapp: { templateName: 'winter_sale_50' }
  }
});

console.log('Post ID:', post.id, 'Status:', post.status);`,
  },
  python: {
    name: 'Python',
    langKey: 'python',
    installCmd: 'pip install asra3',
    filename: 'main.py',
    code: `from asra3 import Asra3
import os

client = Asra3(api_key=os.environ.get("ASRA3_API_KEY"))

# Publish across social channels and telephony
response = client.posts.create(
    content="Omnichannel launch live worldwide! 🚀",
    media_urls=["https://cdn.asra3.com/launch.mp4"],
    platforms=["instagram", "tiktok", "linkedin", "whatsapp"],
    schedule="immediate"
)

print(f"Status: {response.status}")`,
  },
  go: {
    name: 'Go',
    langKey: 'go',
    installCmd: 'go get github.com/asra3/asra3-go',
    filename: 'main.go',
    code: `package main

import (
    "context"
    "fmt"
    "os"
    "github.com/asra3/asra3-go"
)

func main() {
    client := asra3.NewClient(os.Getenv("ASRA3_API_KEY"))
    post, err := client.Posts.Create(context.Background(), &asra3.PostParams{
        Content:   "Omnichannel launch live worldwide! 🚀",
        Platforms: []string{"instagram", "tiktok", "linkedin"},
    })
    if err != nil {
        panic(err)
    }
    fmt.Printf("Published ID: %s\\n", post.ID)
}`,
  },
  php: {
    name: 'PHP',
    langKey: 'php',
    installCmd: 'composer require asra3/asra3-php',
    filename: 'publish.php',
    code: `<?php
require_once __DIR__ . '/vendor/autoload.php';

$asra3 = new \\Asra3\\Client(getenv('ASRA3_API_KEY'));

$post = $asra3->posts->create([
    'content'   => 'Omnichannel launch live worldwide! 🚀',
    'platforms' => ['instagram', 'tiktok', 'linkedin', 'whatsapp'],
    'mediaUrls' => ['https://cdn.asra3.com/launch.mp4'],
]);

echo "Status: " . $post->status;`,
  },
  ruby: {
    name: 'Ruby',
    langKey: 'ruby',
    installCmd: 'gem install asra3',
    filename: 'app.rb',
    code: `require 'asra3'

client = Asra3::Client.new(api_key: ENV['ASRA3_API_KEY'])

post = client.posts.create(
  content: 'Omnichannel launch live worldwide! 🚀',
  platforms: ['instagram', 'tiktok', 'linkedin'],
  media_urls: ['https://cdn.asra3.com/launch.mp4']
)

puts "Published: #{post.id}"`,
  },
  java: {
    name: 'Java',
    langKey: 'java',
    installCmd: "implementation 'com.asra3:asra3-java:1.2.0'",
    filename: 'App.java',
    code: `import com.asra3.Asra3Client;
import com.asra3.models.PostRequest;
import java.util.List;

public class App {
    public static void main(String[] args) {
        Asra3Client client = new Asra3Client(System.getenv("ASRA3_API_KEY"));
        var post = client.posts().create(
            PostRequest.builder()
                .content("Omnichannel launch live worldwide! 🚀")
                .platforms(List.of("instagram", "tiktok", "linkedin"))
                .build()
        );
        System.out.println("Published: " + post.getId());
    }
}`,
  },
  dotnet: {
    name: '.NET / C#',
    langKey: 'dotnet',
    installCmd: 'dotnet add package Asra3',
    filename: 'Program.cs',
    code: `using Asra3;

var client = new Asra3Client(Environment.GetEnvironmentVariable("ASRA3_API_KEY"));

var post = await client.Posts.CreateAsync(new PostCreateOptions {
    Content = "Omnichannel launch live worldwide! 🚀",
    Platforms = new[] { "instagram", "tiktok", "linkedin", "whatsapp" },
    MediaUrls = new[] { "https://cdn.asra3.com/launch.mp4" }
});

Console.WriteLine($"Status: {post.Status}");`,
  },
  rust: {
    name: 'Rust',
    langKey: 'rust',
    installCmd: 'cargo add asra3',
    filename: 'main.rs',
    code: `use asra3::Asra3Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Asra3Client::from_env()?;
    
    let post = client.posts().create(
        "Omnichannel launch live worldwide! 🚀",
        vec!["instagram", "tiktok", "linkedin"],
    ).await?;

    println!("Published: {}", post.id);
    Ok(())
}`,
  },
};

export default function DeveloperHub() {
  const { t, locale } = useThemeAndLocale();
  const copy = getLandingCopy(locale).devHub;

  const [activeTab, setActiveTab] = useState<'sdks' | 'mcp' | 'cli'>('sdks');
  const [selectedSdk, setSelectedSdk] = useState<SdkLang>('node');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, identifier: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(identifier);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const currentSdk = SDK_DATA[selectedSdk];

  const mcpConfigJson = `{
  "mcpServers": {
    "asra3": {
      "command": "npx",
      "args": ["-y", "@asra3/mcp-server"],
      "env": {
        "ASRA3_API_KEY": "tk_live_..."
      }
    }
  }
}`;

  return (
    <section id="developers" className="scroll-mt-24 space-y-10 py-8">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
          <Code2 className="h-3.5 w-3.5" />
          <span>{t.showcase.devHubEyebrow}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t.showcase.devHubTitle}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {t.showcase.devHubSubtitle}
        </p>
      </div>

      {/* Main Dark-Ink Container (#131211) */}
      <div className="mx-auto max-w-5xl rounded-3xl border border-[#2c2926] bg-[#131211] text-slate-100 p-6 sm:p-10 shadow-2xl space-y-6">
        {/* Top 3 Hub Tabs Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#2c2926] pb-5">
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#1c1a18] border border-[#2c2926]">
            <button
              type="button"
              onClick={() => setActiveTab('sdks')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'sdks'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>{copy.tab1}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mcp')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'mcp'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>{copy.tab2}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cli')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'cli'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>{copy.tab3}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-coral)] hover:underline"
            >
              <span>{copy.fullDocsLink}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab 1: API 8 SDKs */}
        {activeTab === 'sdks' && (
          <div className="space-y-6 text-start">
            <div dir="ltr" className="flex flex-wrap items-center gap-2">
              {(Object.keys(SDK_DATA) as SdkLang[]).map((lang) => {
                const isSelected = selectedSdk === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedSdk(lang)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)]/20 text-[var(--brand-coral)]'
                        : 'border-[#2c2926] bg-[#1c1a18] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {SDK_DATA[lang].name}
                  </button>
                );
              })}
            </div>

            {/* Install Bar */}
            <div
              dir="ltr"
              className="flex items-center justify-between rounded-xl border border-[#2c2926] bg-[#0c0b0a] px-4 py-3 font-mono text-xs"
            >
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-[var(--brand-coral)] font-bold">$</span>
                <span>{currentSdk.installCmd}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(currentSdk.installCmd, 'install')}
                className="flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 text-[11px] font-sans font-bold text-white/80 hover:bg-white/20 transition cursor-pointer"
              >
                {copiedText === 'install' ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedText === 'install' ? copy.copiedBtn : copy.copyBtn}</span>
              </button>
            </div>

            {/* Code Editor Window */}
            <div
              dir="ltr"
              className="rounded-2xl border border-[#2c2926] bg-[#0c0b0a] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#2c2926] bg-[#161413] px-4 py-2.5 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ms-2 text-slate-300">{currentSdk.filename}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentSdk.code, 'code')}
                  className="flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 text-[11px] font-sans font-bold text-white/80 hover:bg-white/20 transition cursor-pointer"
                >
                  {copiedText === 'code' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>
                    {copiedText === 'code' ? copy.copiedBtn : copy.copyCodeBtn}
                  </span>
                </button>
              </div>

              <pre className="p-5 font-mono text-xs leading-relaxed text-slate-200 overflow-x-auto">
                <code>{currentSdk.code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: MCP Server */}
        {activeTab === 'mcp' && (
          <div className="space-y-6 text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[var(--brand-coral)] shrink-0" />
                  <span>{copy.mcpTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{copy.mcpDesc}</p>
              </div>
              <span
                dir="ltr"
                className="rounded-lg bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-mono font-bold shrink-0"
              >
                npx @asra3/mcp-server
              </span>
            </div>

            <div
              dir="ltr"
              className="rounded-2xl border border-[#2c2926] bg-[#0c0b0a] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#2c2926] bg-[#161413] px-4 py-2.5 text-xs text-slate-400 font-mono">
                <span className="text-slate-300">
                  claude_desktop_config.json / .cursor/mcp.json
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(mcpConfigJson, 'mcp')}
                  className="flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 text-[11px] font-sans font-bold text-white/80 hover:bg-white/20 transition cursor-pointer"
                >
                  {copiedText === 'mcp' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>
                    {copiedText === 'mcp' ? copy.copiedBtn : copy.copyConfigBtn}
                  </span>
                </button>
              </div>

              <pre className="p-5 font-mono text-xs leading-relaxed text-slate-200 overflow-x-auto">
                <code>{mcpConfigJson}</code>
              </pre>
            </div>

            <div className="rounded-2xl border border-[#2c2926] bg-[#161413] p-4 space-y-3">
              <div className="text-xs font-bold text-slate-300">
                {copy.mcpToolsHeader}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl bg-[#0c0b0a] p-3 border border-[#2c2926]">
                  <strong dir="ltr" className="font-mono text-[var(--brand-coral)]">
                    asra3_publish_post
                  </strong>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {copy.tool1Desc}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0c0b0a] p-3 border border-[#2c2926]">
                  <strong dir="ltr" className="font-mono text-[var(--brand-coral)]">
                    asra3_buy_number
                  </strong>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {copy.tool2Desc}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0c0b0a] p-3 border border-[#2c2926]">
                  <strong dir="ltr" className="font-mono text-[var(--brand-coral)]">
                    asra3_send_whatsapp
                  </strong>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {copy.tool3Desc}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0c0b0a] p-3 border border-[#2c2926]">
                  <strong dir="ltr" className="font-mono text-[var(--brand-coral)]">
                    asra3_dial_voice_call
                  </strong>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {copy.tool4Desc}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: CLI Terminal */}
        {activeTab === 'cli' && (
          <div className="space-y-6 text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-[var(--brand-coral)] shrink-0" />
                  <span>{copy.cliTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{copy.cliDesc}</p>
              </div>
              <span
                dir="ltr"
                className="rounded-lg bg-white/10 px-3 py-1 text-xs font-mono text-slate-300 shrink-0"
              >
                npm i -g @asra3/cli
              </span>
            </div>

            <div
              dir="ltr"
              className="rounded-2xl border border-[#2c2926] bg-[#0c0b0a] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#2c2926] bg-[#161413] px-4 py-2.5 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ms-2 text-slate-300">bash — asra3-cli</span>
                </div>
              </div>

              <div className="p-5 font-mono text-xs leading-relaxed text-slate-200 space-y-4 overflow-x-auto">
                <div>
                  <span className="text-emerald-400 font-bold">$ </span>
                  <span className="text-white">
                    asra3 numbers:search --country SA --type mobile
                  </span>
                  <div className="text-slate-400 mt-1">
                    [+] Found 42 numbers in Saudi Arabia (WhatsApp + Voice + SMS enabled):{'\n'}
                    &nbsp;&nbsp;1. +966 54 819 2041 (Mobile, $4.50/mo){'\n'}
                    &nbsp;&nbsp;2. +966 50 721 9402 (Mobile, $4.50/mo)
                  </div>
                </div>

                <div>
                  <span className="text-emerald-400 font-bold">$ </span>
                  <span className="text-white">
                    asra3 numbers:buy +966548192041 --link-whatsapp
                  </span>
                  <div className="text-emerald-400 mt-1">
                    ✓ Number acquired and bound to organization #org_asra3.{'\n'}
                    ✓ WhatsApp Business Cloud API activated. Template sync complete.
                  </div>
                </div>

                <div>
                  <span className="text-emerald-400 font-bold">$ </span>
                  <span className="text-white">
                    asra3 publish --platforms instagram,tiktok,linkedin --content &quot;Live Launch!&quot;
                  </span>
                  <div className="text-slate-400 mt-1">
                    [i] Dispatching to 3 endpoints...{'\n'}
                    &nbsp;&nbsp;✓ Instagram Reel published (id: ig_94821){'\n'}
                    &nbsp;&nbsp;✓ TikTok 9:16 Video published (id: tt_12048){'\n'}
                    &nbsp;&nbsp;✓ LinkedIn Page published (id: li_74812){'\n'}
                    <span className="text-emerald-400 font-bold">
                      [SUCCESS] All 3 channels synchronized in 118ms.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
