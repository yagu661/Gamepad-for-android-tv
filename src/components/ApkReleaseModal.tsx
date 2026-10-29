import React, { useState } from 'react';
import { X, Download, Github, Check, Copy, Smartphone, Sparkles, Terminal, ArrowRight, ShieldCheck } from 'lucide-react';

interface ApkReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkReleaseModal: React.FC<ApkReleaseModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const gitPushCommand = `git add .
git commit -m "feat: Xbox style gamepad and APK build"
git branch -M main
git push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                Download Android APK from GitHub
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                  Automated
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                GitHub Actions is configured to build and publish <code className="text-emerald-400">.apk</code> to Releases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-zinc-300 max-h-[75vh] overflow-y-auto">
          {/* Highlight Banner */}
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300 text-sm block">
                GitHub Actions Release Pipeline Ready!
              </span>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                We added <strong className="text-white">`.github/workflows/build-apk.yml`</strong> and <strong className="text-white">`capacitor.config.json`</strong>. As soon as you push your code to your GitHub repo, GitHub will automatically compile the Android APK and upload it directly to your repository's <strong>Releases</strong> section.
              </p>
            </div>
          </div>

          {/* Step 1 */}
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-black flex items-center justify-center text-[10px]">1</span>
                Push Your Code to GitHub
              </span>
              <button
                onClick={() => handleCopy(gitPushCommand, 'git')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono font-medium"
              >
                {copiedCmd === 'git' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy commands
              </button>
            </div>
            <pre className="p-2.5 bg-black/80 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
              {gitPushCommand}
            </pre>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
            <span className="font-bold text-white flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-black flex items-center justify-center text-[10px]">2</span>
              Open the GitHub "Releases" Section
            </span>
            <p className="text-zinc-400">
              Once pushed, GitHub Actions compiles the Android project in 2-3 minutes.
            </p>
            <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-white" />
                <span className="font-mono text-zinc-300">github.com/&lt;user&gt;/&lt;repo&gt;/<strong>releases</strong></span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                Releases Tab
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
            <span className="font-bold text-white flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-black flex items-center justify-center text-[10px]">3</span>
              Download & Install APK on Android Phone
            </span>
            <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">XstreamPad-Xbox-Roblox.apk</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Android Application Package (Debug / Ready to install)</div>
                </div>
              </div>
              <span className="text-[11px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg">
                Ready in Releases
              </span>
            </div>
            <ul className="list-disc list-inside text-zinc-400 text-[11px] space-y-1">
              <li>Tap the downloaded file on your phone.</li>
              <li>Allow "Install from unknown sources" if prompted by your Android browser.</li>
              <li>Launch <strong>XstreamPad Xbox Controller</strong> and connect to your TV!</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pre-configured with Capacitor & Gradle</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-lg text-xs shadow-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
