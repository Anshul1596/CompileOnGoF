import { useState, useEffect, useRef } from "react";
import axios from "axios";
import CodeMirror from "@uiw/react-codemirror";
import { langs } from "@uiw/codemirror-extensions-langs";
import { EditorView } from "@codemirror/view";

// In local dev this stays empty and Vite's proxy (see vite.config.js) forwards
// /api/* to localhost:5000. In production on Vercel, set VITE_API_URL to your
// live backend's URL (e.g. https://your-app.herokuapp.com) in Vercel's env settings.
const API_BASE = import.meta.env.VITE_API_URL || "";

// Maps our language keys to CodeMirror's language-mode loaders for syntax
// highlighting + keyword/bracket autocomplete.
const LANG_EXTENSIONS = {
  python: langs.python,
  javascript: langs.javascript,
  typescript: langs.typescript,
  java: langs.java,
  c: langs.c,
  cpp: langs.cpp,
  go: langs.go,
  rust: langs.rust,
  ruby: langs.ruby,
  php: langs.php,
  bash: langs.shell,
  kotlin: langs.kotlin,
  swift: langs.swift,
  lua: langs.lua,
};

// Custom dark theme matching the amber/terminal aesthetic.
const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#d8e4ff",
      fontSize: "0.88rem",
      height: "100%",
    },
    ".cm-content": { fontFamily: "'JetBrains Mono', monospace", caretColor: "#ffb454" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ffb454" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(255, 180, 84, 0.22)",
    },
    ".cm-gutters": {
      backgroundColor: "#0a0d14",
      color: "#454c5c",
      border: "none",
      borderRight: "1px solid #1f2530",
    },
    ".cm-activeLineGutter, .cm-activeLine": {
      backgroundColor: "rgba(255, 180, 84, 0.05)",
    },
    ".cm-tooltip-autocomplete": {
      backgroundColor: "#10141c",
      border: "1px solid #2e3242",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "rgba(255, 180, 84, 0.18)",
      color: "#ffb454",
    },
  },
  { dark: true }
);

const DEFAULT_SNIPPETS = {
  python: 'print("Hello from Compile on the Go!")',
  javascript: 'console.log("Hello from Compile on the Go!");',
  typescript: 'const msg: string = "Hello!";\nconsole.log(msg);',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello!");\n  }\n}',
  c: '#include <stdio.h>\nint main() {\n  printf("Hello!\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\nint main() {\n  std::cout << "Hello!" << std::endl;\n  return 0;\n}',
  go: 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello!")\n}',
  rust: 'fn main() {\n  println!("Hello!");\n}',
  ruby: 'puts "Hello from Compile on the Go!"',
  php: '<?php\necho "Hello!";',
  bash: 'echo "Hello!"',
  kotlin: 'fun main() {\n  println("Hello!")\n}',
  swift: 'print("Hello!")',
  lua: 'print("Hello from Compile on the Go!")',
};

export default function App() {
  const [languages, setLanguages] = useState([]);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_SNIPPETS.python);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [broMode, setBroMode] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const outputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/languages`)
      .then((res) => setLanguages(res.data))
      .catch(() => setLanguages(Object.keys(DEFAULT_SNIPPETS)));
  }, []);

  const handleLangChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(DEFAULT_SNIPPETS[lang] || "");
    setOutput("");
    setError("");
    setAiResponse("");
  };

  const runCode = async () => {
    setRunning(true);
    setOutput("");
    setError("");
    setAiResponse("");
    try {
      const res = await axios.post(`${API_BASE}/api/run`, { language, code, stdin });
      setOutput(res.data.stdout || "");
      setError(res.data.stderr || "");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong running your code.");
    } finally {
      setRunning(false);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Ctrl/Cmd + Enter to run from anywhere on the page.
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, language, stdin]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const askAI = async (mode) => {
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await axios.post(`${API_BASE}/api/ai`, {
        language,
        code,
        stdout: output,
        stderr: error,
        mode,
      });
      if (mode === "fix") {
        setCode(res.data.result);
        setAiResponse("✅ Code updated with AI's fix. Hit Run to test it!");
      } else {
        setAiResponse(res.data.result);
      }
    } catch (err) {
      setAiResponse(err.response?.data?.error || "AI couldn't respond. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-dot logo-dot-r" />
          <span className="logo-dot logo-dot-y" />
          <span className="logo-dot logo-dot-g" />
          <span className="logo-text">
            compile<span className="logo-accent">-on-the-go</span>
            <span className="cursor-blink">_</span>
          </span>
        </div>
        <div className="bro-toggle">
          <span>bro mode</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={broMode}
              onChange={() => setBroMode(!broMode)}
            />
            <span className="slider" />
          </label>
          <span className="bro-emoji">{broMode ? "😎" : "🧑‍💻"}</span>
        </div>
      </header>

      <main className="main">
        <section className="editor-panel">
          <div className="toolbar">
            <select value={language} onChange={handleLangChange}>
              {(languages.length ? languages : Object.keys(DEFAULT_SNIPPETS)).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <button className="run-btn" onClick={runCode} disabled={running} title="Ctrl+Enter">
              {running ? (
                <>
                  <span className="spinner" /> running
                </>
              ) : (
                <>▶ run</>
              )}
            </button>
          </div>
          <div className="run-hint">ctrl/cmd + enter to run</div>

          <div className="editor-wrap">
            <CodeMirror
              value={code}
              height="100%"
              theme={editorTheme}
              extensions={[LANG_EXTENSIONS[language]?.() ?? []]}
              onChange={(value) => setCode(value)}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
                bracketMatching: true,
                closeBrackets: true,
                highlightActiveLine: true,
              }}
            />
          </div>

          <div className="stdin-box">
            <div className="stdin-label">
              <span className="prompt-chevron">&gt;_</span> program input (stdin)
            </div>
            <p className="stdin-hint">
              Does your code read input — like Python's <code>input()</code>, Java's{" "}
              <code>Scanner</code>, or C's <code>scanf</code>? Type each value your program
              needs on its own line below, in the order it'll ask for them.
            </p>
            <textarea
              className="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder={"e.g.\nAlice\n25"}
            />
          </div>
        </section>

        <section className="output-panel" ref={outputRef}>
          <div className="output-header">
            <span className="prompt-chevron">&gt;_</span> output
            {output && (
              <button className="copy-btn" onClick={copyOutput}>
                {copied ? "copied ✓" : "copy"}
              </button>
            )}
          </div>
          <pre className="stdout">{output || "// nothing yet — hit run"}</pre>

          {error && (
            <>
              <div className="output-header error-title">
                <span className="prompt-chevron">!</span> error
              </div>
              <pre className="stderr">{error}</pre>
              <div className="ai-buttons">
                <button
                  className="ai-btn"
                  disabled={aiLoading}
                  onClick={() => askAI(broMode ? "bro" : "normal")}
                >
                  {aiLoading ? "thinking..." : broMode ? "🤙 ask bro ai" : "debug with ai"}
                </button>
                <button className="ai-btn fix-btn" disabled={aiLoading} onClick={() => askAI("fix")}>
                  {aiLoading ? "fixing..." : "🛠️ auto-fix code"}
                </button>
              </div>
            </>
          )}

          {!error && output && (
            <div className="ai-buttons">
              <button
                className="ai-btn"
                disabled={aiLoading}
                onClick={() => askAI(broMode ? "bro" : "normal")}
              >
                {aiLoading ? "thinking..." : broMode ? "🤙 ask bro ai to review" : "ask ai to review"}
              </button>
            </div>
          )}

          {aiResponse && (
            <div className={`ai-response ${broMode ? "bro" : ""}`}>
              <div className="ai-label">{broMode ? "bro ai 🤙" : "ai assistant"}</div>
              <div className="ai-text">{aiResponse}</div>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        react + node · execution via piston · ai via groq
      </footer>
    </div>
  );
}
