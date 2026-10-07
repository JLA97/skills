---
name: github-repo-analyzer
disable-model-invocation: true
description: This skill should be used when the user provides a GitHub repository URL and asks to analyze, understand, or summarize the repository's main features, technology stack, architecture, or highlights. It enables comprehensive analysis of GitHub repos by using a combination of curl and chrome-devtools tools to fetch repository metadata, README.md files, and official documentation, then generating structured technical reports.
---

# GitHub Repo Analyzer

## Language Requirement

**CRITICAL: When using this skill, ALL responses and reports MUST be in Chinese (中文).** This includes all interactions with the user, all analysis reports, and any explanations or summaries provided.

## Overview

This skill analyzes GitHub repositories to help users quickly understand a project's main features, unique characteristics, and technology stack. It is particularly useful when evaluating new open-source projects, researching technical solutions, or looking for architectural patterns to learn from.

The skill uses a **hybrid fetching strategy** combining:
- **curl (via Bash)** - For GitHub API calls and raw content fetching (fast, efficient)
- **chrome-devtools** - For scenarios requiring page interaction, JavaScript rendering, or handling complex web pages

The skill fetches and analyzes:
- Repository metadata via GitHub API (curl)
- Repository README.md (curl raw URL or chrome-devtools)
- Official documentation links (chrome-devtools for rendered pages)
- GitHub page content when JavaScript rendering is needed

## Tool Selection Decision Tree

```
User provides GitHub URL
         │
         ▼
Is it a valid GitHub repo URL?
         │
    ┌────┴────┐
    │         │
   YES       NO → Ask for valid URL
    │
    ▼
Use curl to fetch GitHub API metadata
(https://api.github.com/repos/{owner}/{repo})
    │
    ▼
Fetch README.md
    │
    ├─── Try curl with raw GitHub URL:
    │    https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/README.md
    │
    ├─── Use chrome-devtools if:
    │    • curl fails (network issues, authentication required)
    │    • README contains interactive elements
    │    • Need to navigate page structure
    │
    ▼
Fetch documentation (if available)
    │
    ├─── Use curl for:
    │    • Raw documentation files (.md files)
    │    • Static HTML pages without JavaScript complexity
    │
    └─── Use chrome-devtools for:
         • Pages requiring JavaScript rendering
         • Sites with dynamic content loading
         • Authentication-protected docs
         • Complex navigation or interactive elements
    │
    └──────────────────────────────────┘
                    │
                    ▼
            Generate structured report
```

## Analysis Workflow

### Step 1: Parse and Validate Input

Extract the repository owner and name from the GitHub URL.

Valid URL patterns:
- `https://github.com/{owner}/{repo}`
- `https://github.com/{owner}/{repo}/`
- `https://github.com/{owner}/{repo}.git`

If the input is not a valid GitHub URL, ask the user to provide a valid repository link.

### Step 2: Fetch Repository Metadata via GitHub API

**Method 1: curl (Primary, Fastest)**

Use the `Bash` tool with curl to fetch repository metadata:

```bash
curl -s "https://api.github.com/repos/{owner}/{repo}"
```

This returns JSON containing:
- `name` - Repository name
- `description` - Repository description
- `stargazers_count` - Star count
- `forks_count` - Fork count
- `default_branch` - Default branch (usually "main" or "master")
- `language` - Primary programming language
- `updated_at` - Last update timestamp
- `license` - License information
- `open_issues_count` - Open issues count

**Rate Limiting Note:** GitHub API has rate limits (60/hour for unauthenticated, 5000/hour with authentication). If receiving rate limit errors, proceed to Step 3 and use chrome-devtools for information gathering.

### Step 3: Fetch README.md

**Method 1: curl with Raw GitHub URL (Primary)**

Use the `Bash` tool with curl to fetch the README.md directly:

```bash
curl -s "https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/README.md"
```

Try common branch names if default branch fetch fails:
- `main`
- `master`
- `develop`
- `dev`

**Method 2: chrome-devtools (Fallback)**

If curl fails or the content requires JavaScript rendering:

1. Use `mcp__chrome-devtools__new_page` or `mcp__chrome-devtools__navigate_page`:
   ```
   https://github.com/{owner}/{repo}/blob/{default_branch}/README.md
   ```

2. Take a snapshot with `mcp__chrome-devtools__take_snapshot` to read the content

3. Use `mcp__chrome-devtools__evaluate_script` if needed to extract specific content:
   ```javascript
   () => {
     const readmeElement = document.querySelector('.markdown-body');
     return readmeElement ? readmeElement.innerText : null;
   }
   ```

**Method 3: Raw Blob URL via curl (Alternative)**

```bash
curl -s "https://github.com/{owner}/{repo}/raw/{default_branch}/README.md"
```

### Step 4: Extract Documentation Links

Analyze the README for official documentation links. Look for:
- Links in header/badges
- "Documentation" sections
- "Docs" or "Read the docs" references
- Project website URLs

Common patterns:
- `https://docs.{project}.com`
- `https://{project}.io`
- ReadTheDocs links (`*.readthedocs.io`)
- GitBook links
- Notion documentation pages
- Single Page Applications (SPA) with dynamic content

### Step 5: Fetch Official Documentation (if available)

**Documentation Type Classification**

Before fetching, classify the documentation URL to determine the appropriate tool:

| Documentation Type | Recommended Tool | Reason |
|--------------------|------------------|---------|
| Raw Markdown files (.md) | curl | Fast, direct text access |
| Static HTML pages | curl | Simple, no JS rendering needed |
| ReadTheDocs (PythonDocs) | curl or chrome-devtools | Often renders well with curl, may need chrome for navigation |
| GitBook | chrome-devtools | Heavily uses JavaScript |
| Notion pages | chrome-devtools | Requires JS rendering |
| SPAs with dynamic content | chrome-devtools | Content loaded via JavaScript |
| Pages with authentication | chrome-devtools | Can handle interactive login |
| Documentation sites with search/filter | chrome-devtools | Interactive elements |

**Method 1: curl for Simple Documentation**

Use `Bash` tool with curl for raw Markdown or simple HTML:

```bash
curl -s "{documentation_url}"
```

For static documentation with multiple pages, fetch key pages:
```bash
curl -s "{base_url}/getting-started.md"
curl -s "{base_url}/overview.md"
```

**Method 2: chrome-devtools for Complex Documentation**

For dynamic or JavaScript-heavy documentation:

1. **Navigate to the page:**
   ```bash
   # Create new page or navigate existing page
   mcp__chrome-devtools__new_page --url "{documentation_url}"
   # or
   mcp__chrome-devtools__navigate_page --type url --url "{documentation_url}"
   ```

2. **Wait for content to load:**
   ```bash
   # Wait for specific text or use timeout
   mcp__chrome-devtools__wait_for --text "Documentation" --timeout 10000
   ```

3. **Take snapshot to read content:**
   ```bash
   mcp__chrome-devtools__take_snapshot
   ```

4. **For dynamic content, use evaluate_script:**
   ```javascript
   () => {
     // Extract main content area
     const mainContent = document.querySelector('main, #content, .documentation, article');
     return mainContent ? mainContent.innerText : document.body.innerText;
   }
   ```

5. **Handle navigation for multi-page docs:**
   - Click navigation links using `mcp__chrome-devtools__click`
   - Take snapshots of key pages
   - Close pages when done with `mcp__chrome-devtools__close_page`

**Fetching Priorities**

Regardless of tool, prioritize pages in this order:
1. Getting Started / Quick Start pages
2. Architecture / Overview pages
3. API documentation pages
4. User guides
5. Installation documentation

**Note:** Limit documentation fetching to 2-3 key pages to avoid overwhelming context. Be strategic about which sections provide the most value for understanding the project.

### Step 6: Analyze Content

Parse the fetched content (metadata + README + documentation) to extract:

#### 6.1 Project Overview
- What the project does (purpose and problem domain)
- Target users and use cases
- Project maturity indicators (stars, forks, version, last update)

#### 6.2 Core Features
List the main features and capabilities. Look for:
- Feature lists in README
- Feature sections in docs
- "What can X do?" sections
- Capabilities highlights

#### 6.3 Technology Stack
Extract technical details:
- **Languages:** Primary programming languages used
- **Frameworks:** Web frameworks, UI frameworks, etc.
- **Databases/Data stores:** SQL, NoSQL, cache layers
- **Infrastructure:** Cloud platforms, containers, orchestration
- **Libraries:** Key dependencies and integrations
- **Protocols/Formats:** APIs, message formats, standards

Check for configuration files that reveal the stack:
- `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`
- `docker-compose.yml`, `Dockerfile`
- `requirements.txt`, `go.mod`
- `.github/workflows/` for CI/CD insights

Use curl to fetch specific configuration files if needed:
```bash
curl -s "https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/package.json"
curl -s "https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/pom.xml"
```

#### 6.4 Architecture & Design Patterns
Identify architectural characteristics:
- System architecture type (monolith, microservices, serverless, etc.)
- Design patterns used (MVC, CQRS, Event Sourcing, etc.)
- Key architectural decisions and trade-offs
- Scalability approaches
- Integration patterns

#### 6.5 Unique Highlights & Innovations
What makes this project special:
- Novel approaches to common problems
- Unique features or capabilities
- Performance optimizations
- Developer experience improvements
- Community contributions or extensions

#### 6.6 Learnings & Takeaways
Identify aspects valuable for other projects:
- Best practices demonstrated
- Reusable patterns
- Tools and techniques worth adopting
- Anti-patterns to avoid
- Architectural insights

### Step 7: Generate Structured Report

**Language Requirement: The entire report MUST be written in Chinese (中文).**

Format the analysis as a comprehensive technical report using the structure defined in `references/report_template.md`. The report should be:

- **Detailed and thorough:** Include code snippets, diagram descriptions, and specific examples
- **Well-organized:** Use clear headings, bullet points, and sections
- **Actionable:** Highlight practical insights and takeaways
- **Professional:** Use appropriate technical language and formatting

## Resources

### references/report_template.md

Template for the analysis report output. Contains the standard structure and formatting guidelines for generating consistent, comprehensive repository analysis reports.

---

## Example Usage

**User Request:**
```
Can you analyze https://github.com/anthropics/claude-code? I want to understand its architecture and what makes it unique.
```

**Expected Analysis Flow:**

1. **Parse the URL:**
   - owner=`anthropics`
   - repo=`claude-code`

2. **Fetch repository metadata via curl:**
   ```bash
   curl -s "https://api.github.com/repos/anthropics/claude-code"
   ```
   Extract: stars, forks, default branch, language, last updated

3. **Fetch README.md via curl (primary):**
   ```bash
   curl -s "https://raw.githubusercontent.com/anthropics/claude-code/main/README.md"
   ```
   - If curl fails, fall back to chrome-devtools

4. **Identify docs links in README:**
   - Look for GitHub Pages, GitBook, ReadTheDocs, or other documentation sites

5. **Fetch documentation (type-dependent):**

   For simple docs (raw Markdown):
   ```bash
   curl -s "https://docs.example.com/getting-started.md"
   ```

   For complex docs (GPIT, GitBook, etc.):
   ```bash
   # Navigate to docs site
   navigate_page --type url --url "https://docs.example.com"
   # Wait for content
   wait_for --text "Getting Started"
   # Take snapshot
   take_snapshot
   ```

6. **Extract and categorize all information:**
   - Parse metadata, README, and documentation
   - Extract features, technology stack, architecture patterns

7. **Generate comprehensive technical report:**
   - Use the template from `references/report_template.md`
   - Include all gathered insights with proper source citations

## Tool Requirements

This skill requires the following MCP tools:

### curl (via Bash)
- For GitHub API calls to fetch repository metadata
- For raw content fetching from GitHub (README.md, configuration files)
- For simple documentation pages (raw Markdown, static HTML)

### chrome-devtools
- `mcp__chrome-devtools__new_page` - Create a new browser page
- `mcp__chrome-devtools__navigate_page` - Navigate to a URL
- `mcp__chrome-devtools__take_snapshot` - Read page content via accessibility tree
- `mcp__chrome-devtools__evaluate_script` - Execute JavaScript to extract content
- `mcp__chrome-devtools__click` - Click interactive elements for navigation
- `mcp__chrome-devtools__wait_for` - Wait for content to load
- `mcp__chrome-devtools__close_page` - Close browser pages when done
- `mcp__chrome-devtools__list_pages` - Manage open browser pages

## Best Practices

### Tool Selection Strategy

1. **Always start with curl for data fetching:**
   - Use curl for GitHub API calls (fastest, no overhead)
   - Use curl for raw content from GitHub (`.md` files, config files)
   - Use curl for simple static HTML documentation

2. **Use chrome-devtools when:**
   - Content requires JavaScript rendering (SPAs, GitBook, Notion)
   - Page has dynamic content loading
   - Need to interact with page elements (click, navigate)
   - Documentation requires authentication
   - curl fails with authentication or network issues

3. **Handle rate limiting gracefully:**
   - GitHub API has 60 requests/hour limit for unauthenticated requests
   - If receiving 403 rate limit errors, switch to chrome-devtools approach
   - GitHub web pages have higher limits than the API

### Documentation Fetching

4. **Be selective with documentation:**
   - Don't fetch every docs page. Focus on overview, architecture, and getting started pages.
   - Use chrome-devtools navigation to efficiently explore multi-page documentation
   - Take snapshots of key sections rather than full pages when possible

5. **Close browser pages when done:**
   - Use `mcp__chrome-devtools__close_page` to free up resources
   - Keep track of open pages with `mcp__chrome-devtools__list_pages`

### Content Analysis

6. **Preserve technical accuracy:**
   - Quote technical terms, commands, and code snippets exactly as they appear in the source
   - Use raw content (curl) when possible to get exact code formatting

7. **Cite sources:**
   - When referencing specific information, mention whether it came from GitHub API, README, or documentation
   - Note the source (curl vs chrome-devtools) if relevant to the context

8. **Handle missing info gracefully:**
   - If certain information is not available in README or docs, note that rather than speculating
   - If API rate limiting prevents data collection, note this limitation

9. **Consider project maturity:**
   - Newer projects may have less documentation - adjust analysis depth accordingly
   - Watch for badges at the top of README - they often contain links to docs, demos, and important resources

### Error Handling

10. **Implement fallback mechanisms:**
    - Always try curl first (faster, simpler)
    - Fall back to chrome-devtools if curl fails
    - Log the reason for falling back (rate limit, authentication, JS rendering)
