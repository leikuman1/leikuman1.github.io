mixins.highlight = {
    data() {
        return { copying: false };
    },
    created() {
        if (window.hljs) hljs.configure({ ignoreUnescapedHTML: true });
        this.renderers.push(this.highlight);
    },
    methods: {
        sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },
        escapeHTML(code) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            };
            return code.replace(/[&<>"']/g, (char) => replacements[char]);
        },
        normalizeLanguage(language) {
            return (language || "plaintext")
                .replace(/^(language|lang)-/, "")
                .toLowerCase();
        },
        highlightShell(code) {
            return this.escapeHTML(code)
                .split("\n")
                .map((line) => {
                    const commentStart = line.indexOf("#");
                    const commandPart = commentStart === -1 ? line : line.slice(0, commentStart);
                    const commentPart = commentStart === -1 ? "" : line.slice(commentStart);
                    let commandSeen = false;
                    const highlightedCommand = commandPart.replace(
                        /(&lt;[^&]+&gt;|--?[\w-]+|[A-Za-z_][\w./-]*)/g,
                        (token) => {
                            if (token.startsWith("&lt;")) return `<span class="shell-argument">${token}</span>`;
                            if (token.startsWith("-")) return `<span class="shell-option">${token}</span>`;
                            if (!commandSeen) {
                                commandSeen = true;
                                return `<span class="shell-command">${token}</span>`;
                            }
                            return token;
                        },
                    );
                    return `${highlightedCommand}<span class="shell-comment">${commentPart}</span>`;
                })
                .join("\n");
        },
        highlightText(code) {
            return this.escapeHTML(code).replace(
                /(main|master|member\d+|fixBug|bugFix)|([A-Z](?:&#39;)?)|(---+|[\\/^|*])/g,
                (token, branch, commit, edge) => {
                    if (branch) return `<span class="git-graph-branch">${branch}</span>`;
                    if (commit) return `<span class="git-graph-commit">${commit}</span>`;
                    if (edge) return `<span class="git-graph-edge">${edge}</span>`;
                    return token;
                },
            );
        },
        highlightCode(code, language) {
            const normalized = this.normalizeLanguage(language);
            if (["bash", "sh", "shell", "zsh"].includes(normalized)) return this.highlightShell(code);
            if (["text", "txt", "git-graph"].includes(normalized)) return this.highlightText(code);
            if (!window.hljs) return this.escapeHTML(code);
            try {
                return hljs.highlight(code, { language: normalized }).value;
            } catch {
                return this.escapeHTML(code);
            }
        },
        highlight() {
            let codes = document.querySelectorAll("pre");
            for (let i of codes) {
                let code = i.textContent;
                let language = this.normalizeLanguage(
                    [...i.classList, ...(i.firstElementChild?.classList || [])][0],
                );
                let highlighted = this.highlightCode(code, language);
                i.innerHTML = `
                <div class="code-content hljs">${highlighted}</div>
                <div class="language">${language}</div>
                <div class="copycode">
                    <i class="fa-solid fa-copy fa-fw"></i>
                    <i class="fa-solid fa-check fa-fw"></i>
                </div>
                `;
                let content = i.querySelector(".code-content");
                if (window.hljs?.lineNumbersBlock) hljs.lineNumbersBlock(content, { singleLine: true });
                let copycode = i.querySelector(".copycode");
                copycode.addEventListener("click", async () => {
                    if (this.copying) return;
                    this.copying = true;
                    copycode.classList.add("copied");
                    await navigator.clipboard.writeText(code);
                    await this.sleep(1000);
                    copycode.classList.remove("copied");
                    this.copying = false;
                });
            }
        },
    },
};
