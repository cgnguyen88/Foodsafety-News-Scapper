"""
Modal scraper — runs every 24 hours in the cloud and pushes fresh
processed_articles.json to GitHub, triggering a Vercel redeploy.

One-time setup (run these in your terminal):
  1. python3 -m modal setup          # authenticate (opens browser)
  2. modal secret create github-token GITHUB_TOKEN=ghp_your_token_here
  3. python3 modal_scraper.py        # test run
  4. modal deploy modal_scraper.py   # deploy the 24-hour schedule

GitHub token needs: Contents (read + write) on the scraperrrrr repo.
Create one at: https://github.com/settings/tokens/new
"""

import modal
import subprocess
import os
import json
import base64

# ---------------------------------------------------------------------------
# Image: Debian Slim + Node.js + Chromium (for Puppeteer)
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "nodejs",
        "npm",
        # Chromium and its dependencies (used by Puppeteer)
        "chromium",
        "ca-certificates",
        "libgbm1",
        "libgtk-3-0",
        "libxss1",
        "libasound2",
        "libatk-bridge2.0-0",
        "libatk1.0-0",
        "libcups2",
        "libdbus-1-3",
        "libdrm2",
        "libnss3",
        "libxcomposite1",
        "libxdamage1",
        "libxfixes3",
        "libxrandr2",
        "libxshmfence1",
        "fonts-liberation",
    )
    .pip_install("requests")
    .env(
        {
            # Tell Puppeteer to skip downloading its own Chromium
            # and use the system one we just installed above.
            "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "1",
            "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/chromium",
        }
    )
    .add_local_dir(
        ".",
        remote_path="/app",
        ignore=["node_modules", ".tmp", ".git", "logs", "__pycache__"],
    )
)


app = modal.App("ai-news-scraper", image=image)

# ---------------------------------------------------------------------------
# Shared runner
# ---------------------------------------------------------------------------
def _run_scrapers_impl():
    import requests

    os.chdir("/app")

    print("📦 Installing npm packages...")
    install = subprocess.run(
        ["npm", "install"],
        capture_output=True,
        text=True,
        env={**os.environ, "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "1"},
    )
    if install.returncode != 0:
        print(install.stderr[-2000:])
        raise RuntimeError("npm install failed")

    print("🕷️  Running scrapers...")
    result = subprocess.run(
        ["npx", "ts-node", "tools/run_all_scrapers.ts"],
        capture_output=True,
        text=True,
        env={
            **os.environ,
            "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "1",
            "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/chromium",
        },
    )

    # Always print output so Modal logs are useful
    if result.stdout:
        print(result.stdout[-4000:])
    if result.returncode != 0:
        print("STDERR:", result.stderr[-2000:])
        raise RuntimeError(f"Scraper exited with code {result.returncode}")

    # Read the aggregated output
    output_path = "/app/dashboard/processed_articles.json"
    with open(output_path) as f:
        articles_data = f.read()

    article_count = len(json.loads(articles_data).get("articles", []))
    print(f"✅ Scraped {article_count} articles")

    # Push processed_articles.json to GitHub so Vercel picks it up
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        print("⚠️ GITHUB_TOKEN is missing in Modal secret; skipping GitHub push.")
        return
    
    print(f"🔑 GITHUB_TOKEN found (starts with: {github_token[:4]}..., length: {len(github_token)})")
    
    repo = "cgnguyen88/Foodsafety-News-Scapper"
    file_path = "dashboard/processed_articles.json"
    api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}"
    
    print(f"📡 Target API: {api_url}")

    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Verify token identity and scopes
    print("🔍 Checking GitHub token identity...")
    user_resp = requests.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code == 200:
        user_data = user_resp.json()
        print(f"👤 Authenticated as: {user_data.get('login')} ({user_data.get('name')})")
        scopes = user_resp.headers.get("X-OAuth-Scopes", "none")
        print(f"🔐 Token scopes: {scopes}")
    else:
        print(f"⚠️ Could not verify identity (Status {user_resp.status_code}): {user_resp.text[:200]}")

    # Fetch current file SHA (required by GitHub API to update an existing file)
    print("🔍 Fetching current file SHA...")
    repo = "cgnguyen88/Foodsafety-News-Scapper"
    file_path = "dashboard/processed_articles.json"
    api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}"
    
    resp = requests.get(api_url, headers=headers)
    
    if resp.status_code == 200:
        current_sha = resp.json().get("sha", "")
        print(f"✅ Found SHA: {current_sha}")
    else:
        current_sha = ""
        print(f"⚠️ Could not fetch SHA (Status {resp.status_code}): {resp.text[:200]}")

    payload = {
        "message": "chore: auto-update articles [Modal scraper]",
        "content": base64.b64encode(articles_data.encode()).decode(),
        "sha": current_sha,
        "branch": "main"  # Explicitly specify branch
    }

    print("📤 Sending PUT request to GitHub...")
    update = requests.put(api_url, headers=headers, json=payload)

    if update.status_code in (200, 201):
        print(
            f"🚀 Pushed to GitHub! "
            f"Vercel will redeploy with {article_count} fresh articles."
        )
    else:
        print(
            f"❌ GitHub push failed (Status {update.status_code}); "
            f"Response: {update.text[:500]}"
        )


# ---------------------------------------------------------------------------
# Scheduled function — every 24 hours
# ---------------------------------------------------------------------------
@app.function(
    secrets=[modal.Secret.from_name("github-token")],
    schedule=modal.Period(hours=24),
    timeout=600,
)
def scheduled_24h():
    _run_scrapers_impl()


# ---------------------------------------------------------------------------
# Manual function — immediate run on demand
# ---------------------------------------------------------------------------
@app.function(
    secrets=[modal.Secret.from_name("github-token")],
    timeout=600,
)
def run_now():
    _run_scrapers_impl()


# ---------------------------------------------------------------------------
# Local entrypoint — run manually with: python3 modal_scraper.py
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main():
    run_now.remote()
