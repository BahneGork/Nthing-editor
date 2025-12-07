# Instructions for Creating GitHub Issues

You have two options to create the GitHub issues from the roadmap:

## Option 1: Automated (Recommended)

**Requirements:** GitHub CLI (`gh`)

### Install GitHub CLI:
```bash
# Windows (using winget)
winget install --id GitHub.cli

# Or download from: https://cli.github.com/
```

### Run the script:
```bash
# First time: authenticate with GitHub
gh auth login

# Then run the script
cd "markdowneditor1"
./create-github-issues.sh
```

This will create all 12 issues automatically with proper labels and formatting.

---

## Option 2: Manual Creation

If you prefer to create issues manually, copy each issue from `GITHUB_ISSUES.md` and paste into GitHub:

### Steps:
1. Go to https://github.com/BahneGork/Nthing-editor/issues
2. Click "New Issue"
3. Copy the title from GITHUB_ISSUES.md (e.g., "Export to PDF/HTML")
4. Copy the description (everything under that issue)
5. Add labels as specified (e.g., `enhancement`, `short-term`)
6. Click "Submit new issue"
7. Repeat for each issue

### Issues to Create:

**Short-term (4 issues):**
- Issue 1: Export to PDF/HTML
- Issue 3: Interactive Task Lists
- Issue 10: Smart Formatting Wrapping
- Issue 11: Move Lines with Keyboard

**Medium-term (5 issues):**
- Issue 4: Dark Theme
- Issue 6: Strikethrough Support
- Issue 12: File Tree Enhancements
- Issue 13: Left Sidebar Organization
- Issue 14: Right Sidebar Organization

**Long-term (3 issues):**
- Issue 7: Math Equations (LaTeX/KaTeX)
- Issue 8: Diagram Support (Mermaid)
- Issue 9: Export to Word (.docx)

**Already Completed (don't create):**
- Issue 2: Outline/TOC Sidebar ✅
- Issue 5: File Tree Sidebar ✅

---

## After Creating Issues

Once issues are created, you can:
1. Add them to your GitHub Project board
2. Organize by milestone
3. Assign priorities
4. Link related issues

View all issues at: https://github.com/BahneGork/Nthing-editor/issues
