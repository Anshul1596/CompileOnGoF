import { useState, useEffect, useRef } from "react";
import axios from "axios";

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
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  useEffect(() => {
    axios
      .get("/api/languages")
      .then((res) => setLanguages(res.data))
      .catch(() => setLanguages(Object.keys(DEFAULT_SNIPPETS)));
  }, []);

  const syncGutterScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = Math.max(code.split("\n").length, 1);

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
      const res = await axios.post("/api/run", { language, code, stdin });
      setOutput(res.data.stdout || "");
      setError(res.data.stderr || "");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong running your code.");
    } finally {
      setRunning(false);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const askAI = async (mode) => {
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await axios.post("/api/ai", {
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
            <button className="run-btn" onClick={runCode} disabled={running}>
              {running ? (
                <>
                  <span className="spinner" /> running
                </>
              ) : (
                <>▶ run</>
              )}
            </button>
          </div>

          <div className="editor-wrap">
            <div className="gutter" ref={gutterRef}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div className="gutter-line" key={i}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={syncGutterScroll}
              spellCheck={false}
              wrap="off"
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
