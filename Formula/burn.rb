class Burn < Formula
  desc "Token-burning harness around Claude Code"
  homepage "https://github.com/dtnewman/burn_baby_burn"
  url "https://github.com/dtnewman/burn_baby_burn/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_TARBALL_SHA256"
  license "MIT"
  head "https://github.com/dtnewman/burn_baby_burn.git", branch: "main"

  depends_on "jq"

  def install
    bin.install "bin/burn"
  end

  test do
    assert_match "burn", shell_output("#{bin}/burn --help")
    assert_match(/at least \d+/, shell_output("#{bin}/burn 500 2>&1", 2))
  end
end
