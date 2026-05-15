# burn-baby-burn

> *"Burn, baby, burn — disco inferno."*
> &nbsp;&nbsp;&nbsp;&nbsp;— The Trammps, 1976, on the subject of API quotas

A tiny bash CLI that wraps [Claude Code](https://docs.claude.com/claude-code)
and sets your token budget on fire, intentionally, in controlled increments.

```bash
burn 50000
```

That's it. It spins up Claude Code in non-interactive mode, feeds it a
garbage prompt sized to ~1000 input tokens, and keeps doing that until your
target is met or exceeded. Real token counts come back from the API, so the
total you see is the total that hit your bill.

No Python. No virtualenvs. One bash file. The way nature intended.

---

## Why would anyone want this?

Glad you asked. A non-exhaustive list of legitimate reasons to burn tokens
on purpose:

- **Rate-limit and budget testing.** Verify your alerting fires before
  production traffic does.
- **Spend-pacing experiments.** Watch your dashboards in real time while a
  known quantity of tokens lands on your account.
- **Reproducible load.** Generate a deterministic amount of Claude Code
  usage for CI smoke tests, dashboards, or demos.
- **Stress-testing wrappers.** If you've built tooling around Claude Code,
  `burn` is a cheap way to drive sustained-but-bounded traffic through it.
- **Curiosity.** You wanted to know what happens. Now you'll know.

This tool exists because every other "load test" script eventually does
something accidentally useful. `burn` does nothing useful. It is pure,
honest waste — measured to the token.

---

## Install

### Homebrew (recommended)

```bash
brew tap dtnewman/burn https://github.com/dtnewman/burn_baby_burn
brew install burn
```

This installs the `burn` script to `$(brew --prefix)/bin/burn` and pulls in
`jq` as a dependency. The formula lives in this repo at `Formula/burn.rb`.

### One-liner (no brew)

```bash
curl -fsSL https://raw.githubusercontent.com/dtnewman/burn_baby_burn/main/bin/burn \
  -o /usr/local/bin/burn && chmod +x /usr/local/bin/burn
```

You'll also need `jq`:

```bash
brew install jq        # macOS
sudo apt install jq    # Debian/Ubuntu
```

### From a clone

```bash
git clone https://github.com/dtnewman/burn_baby_burn
cd burn_baby_burn
ln -s "$PWD/bin/burn" /usr/local/bin/burn
```

### Prerequisites

- [Claude Code](https://docs.claude.com/claude-code) installed and
  authenticated on your `PATH`. If `claude --version` works, you're good.
- [`jq`](https://jqlang.github.io/jq/) for parsing Claude Code's JSON
  output. `brew install jq` if you don't have it.
- `bash` 3.2+ (i.e. anything from this millennium).

---

## Usage

```
burn TOKENS [--model MODEL]
```

| Arg / flag       | Meaning                                                              |
|------------------|----------------------------------------------------------------------|
| `TOKENS`         | Target number of tokens to burn. **Minimum: 10000.**                 |
| `--model MODEL`  | Optional. Pass through to `claude --model` (e.g. `haiku`, `sonnet`). |
| `-h`, `--help`   | Show help.                                                           |

### Examples

Burn ten thousand tokens, the absolute minimum:

```bash
burn 10000
```

Burn fifty thousand tokens on Haiku (cheap and fast — perfect for soak tests):

```bash
burn 50000 --model haiku
```

Burn a hundred thousand and walk away:

```bash
burn 100000 --model sonnet
```

### What you'll see

```
$ burn 10000
burn baby burn — going to try to burn approximately 10000 tokens.
each iteration spins up `claude -p` and burns ~10000 tokens.

[1] burning… +11142 tokens  $0.034230  (total 11142 / 10000, $0.034230)

done. burned 11142 tokens across 1 call(s) (target was 10000), spent $0.034230.
```

A single `claude -p` call carries non-trivial system-prompt overhead, so
the first iteration almost always overshoots. Subsequent iterations are
cheaper (prompt caching kicks in). `burn` always reports the **actual**
token counts and dollar cost returned by the API, summed across input,
cache reads, cache writes, and output.

---

## How it works

1. Parse the target (must be ≥ 10000 — a single `claude -p` call already
   burns about that much, so anything smaller is just a typo).
2. Build a prompt of roughly 1000 input tokens: a "reply with the word
   'burned'" instruction followed by lorem-ipsum-grade disco-inferno filler.
3. Shell out to `claude -p --output-format json --no-session-persistence`
   with that prompt.
4. `jq` extracts the `usage` block from Claude Code's JSON response.
5. Tokens burned this call =
   `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens`.
6. Repeat until the running total meets or exceeds your target.
7. Print the receipts.

`Ctrl-C` at any time stops the burn and tells you how far you got.

The whole thing is ~140 lines of bash. You can read it before you run it.
You probably should.

---

## What it does NOT do

- It does **not** mint tokens, generate value, or accomplish anything.
- It does **not** modify files, run tools, edit your code, or commit
  anything. The prompt asks Claude for a one-word reply.
- It does **not** bypass safety, billing, or rate limits. `burn` is just a
  shell wrapper; Claude Code does what Claude Code does.
- It does **not** know about your wallet. **You are responsible for the
  bill.** Run `burn 100000000` and you'll find out exactly how responsible.

---

## FAQ

**Q: Why is the minimum 10000?**
A: A single `claude -p` call already burns roughly that much (system-prompt
overhead plus the ~1000-token filler payload). Asking for less is asking
for one call, which the harness can't honestly deliver.

**Q: Why did `burn 10000` burn 11,142 tokens?**
A: Claude Code attaches a system prompt to every `-p` invocation. That
overhead lands on the first call. `burn` reports honest totals; it does not
fudge them down.

**Q: Can I make it burn slower?**
A: Pick a smaller, cheaper model (`--model haiku`) and a bigger target.

**Q: Why bash instead of Python / Go / Rust?**
A: Because it's 140 lines that shell out to another CLI. Anything heavier
would be bringing a flamethrower to a candle.

**Q: Will Anthropic stop me?**
A: They will charge you. That is how they will stop you.

---

## License

MIT. Burn responsibly.
