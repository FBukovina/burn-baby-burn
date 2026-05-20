# 🔥 Burn, baby, burn (those tokens) 🔥

![burn-baby-burn](burn.png)

### Because nothing gets you promoted faster than a six-figure token bill

A bash one-liner that burns Claude Code or Codex tokens on purpose.

```bash
burn 50000  # burn 50,000 tokens
```

---

## Install and run in 20 seconds

```bash
curl -fsSL https://raw.githubusercontent.com/dtnewman/burn-baby-burn/main/install.sh | bash
```

Drops `burn` into `~/.local/bin` — no sudo, no Homebrew tap. Needs
[Claude Code](https://docs.claude.com/claude-code) **or**
[Codex](https://github.com/openai/codex) authenticated on your `PATH`, plus
`jq` (`brew install jq`).

## Usage

```bash
burn 10000                            # the minimum
burn 50000 --model haiku              # cheap and fast
burn 100000 --model sonnet            # walk away
burn 50000 --backend codex            # 🤖 burn OpenAI tokens
```

Run `burn` with no arguments to open the TUI. When you select OpenAI
Codex and press `IGNITE`, the TUI launches the default browser OAuth
flow if Codex is not already connected. You can also use the `AUTH` row
to recheck or sign in manually, or run `codex login` before opening
`burn`.

![burn in action](screenshot.png)

---

## Features

- 📈 **Make the CEO see how productive you are.**
- 💸 **Investors will see how AI-innovative your company is.**
- 🏆 **Top the internal Claude Code leaderboard.**
- 📊 **Pad your OKRs.**
- 🦄 **Justify next year's bigger AI budget.**

---

## Reviews

> "Wow, my engineering team is 5x more productive in just the last week!"
>
> **- (Possibly) your CEO, a week after your team installs this tool**

> "We've decided to double our offer"
>
> **- (Possibly) a famous VC, after seeing AI usage stats in your new pitch deck**

> "Wow, this promotion that I got was nice"
>
> **- You, just a few months after first using this tool**

---

## Stats

<img width="1672" height="941" alt="burnchart" src="https://github.com/user-attachments/assets/20ef0646-8d50-4c74-9f59-4bca40c5f749" />

---

## Enterprise version

We are currently working on a paid enterprise-ready version, which will have:

- 4x burn rate
- SSO/SAML Support
- Role-Based Burn Access

Please contact us if you are interested.

---

## License

MIT (but it's all vibe-coded so who really knows who owns it?). Burn responsibly. 🔥
