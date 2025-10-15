# Contributing to Obsidian Vox

Thank you for your interest in contributing to Obsidian Vox! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information (OS, Obsidian version, error messages)

When creating a bug report, include:
- **Clear title** describing the issue
- **Steps to reproduce** the bug
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Obsidian version, plugin version)
- **Error messages** from console (Cmd/Ctrl+Shift+I)

### Suggesting Features

When suggesting a feature:
1. Check if it's already been suggested
2. Explain the use case and why it's valuable
3. Provide examples of how it would work
4. Consider implementation complexity

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/obsidian-vox.git
   cd obsidian-vox
   ```
3. **Install dependencies**
   ```bash
   pnpm install
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Making Changes

1. **Follow the style guide** (see `.github/development-guide.md`)
2. **Write TypeScript** with proper types
3. **Test thoroughly** with the mock server
4. **Keep changes focused** - one feature/fix per PR
5. **Update documentation** if needed

#### Testing Your Changes

```bash
# Start mock server for testing
node project/mock-whisper-server.js

# Build the plugin
pnpm run build

# Copy to Obsidian vault for testing
# .obsidian/plugins/vox/
```

Test in Obsidian:
1. Enable the plugin in Obsidian settings
2. Configure to use mock server: `http://127.0.0.1:8081`
3. Test with real audio files
4. Check console for errors
5. Verify markdown output is correct

#### Committing Changes

Use clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "Add temperature setting for whisper.cpp"
git commit -m "Fix segment parsing for object format"
git commit -m "Update TranscriptionResponse type for new fields"

# Avoid vague messages
git commit -m "Fix bug"
git commit -m "Update stuff"
```

Follow conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

#### Submitting a Pull Request

1. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. **Respond to feedback** promptly

5. **Keep PR updated** with main branch

### Documentation Contributions

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples or tutorials
- Improve API documentation
- Update setup instructions

### Development Setup

#### Required Tools

- Node.js 16+ and pnpm
- TypeScript knowledge
- Obsidian desktop app for testing
- Git

#### Recommended Tools

- VS Code with TypeScript support
- ESLint extension
- Prettier extension

#### Project Structure

See `.github/development-guide.md` for detailed structure.

## Code Style

### TypeScript

- Use strict TypeScript
- Explicit types for public APIs
- Type inference for obvious cases
- No `any` types (use `unknown` if needed)

### Formatting

- Use Prettier for formatting
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings

Check formatting:
```bash
pnpm run format
```

### Naming Conventions

- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces/Types**: `PascalCase`
- **Private members**: prefix with `private`

## Testing Guidelines

Since this project doesn't have automated tests yet, manual testing is crucial:

### Testing Checklist

- [ ] Plugin loads without errors
- [ ] Settings UI works correctly
- [ ] Audio files are processed successfully
- [ ] Markdown files are created with correct content
- [ ] Frontmatter is accurate
- [ ] Error handling works properly
- [ ] Queue management works (pause/resume/stop)
- [ ] Works with mock server
- [ ] Works with real whisper.cpp (if applicable)

### Testing on Multiple Platforms

If possible, test on:
- Windows
- macOS
- Linux

## Whisper.cpp Integration

Currently, we're migrating to whisper.cpp. When contributing:

1. **Use the mock server** for development
   ```bash
   node project/mock-whisper-server.js
   ```

2. **Follow the implementation plan** in `project/IMPLEMENTATION_PLAN.md`

3. **Update types** in `src/types.ts` for new response formats

4. **Test with both mock and real servers** if possible

## Documentation Standards

### Code Comments

```typescript
/**
 * Process an audio file and generate transcription.
 * 
 * @param audioFile - File details including path and metadata
 * @returns Transcription response or null if failed
 */
async function processFile(audioFile: FileDetail): Promise<TranscriptionResponse | null> {
  // Implementation
}
```

### Markdown Documentation

- Use clear headings
- Include code examples
- Add screenshots for UI features
- Keep it concise and scannable

## Review Process

1. **Automated checks** (if any) must pass
2. **Maintainer review** - may request changes
3. **Testing** - verify functionality works
4. **Approval** - at least one maintainer approval needed
5. **Merge** - maintainer will merge when ready

## Getting Help

- **Questions**: Open a discussion or issue
- **Bugs**: Open an issue with details
- **Ideas**: Open an issue or discussion
- **Chat**: Check if there's a Discord/chat community

## Recognition

Contributors will be:
- Listed in release notes
- Credited in commit messages
- Acknowledged in documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (AGPL-3.0-only).

## Quick Reference

### Common Commands

```bash
# Install dependencies
pnpm install

# Development build (watch mode)
pnpm run dev

# Production build
pnpm run build

# Format code
pnpm run format

# Start mock server
node project/mock-whisper-server.js
```

### Useful Files

- `.github/copilot-instructions.md` - GitHub Copilot guidelines
- `.github/development-guide.md` - Detailed development guide
- `project/TECHNICAL_SPEC.md` - Technical specification
- `project/IMPLEMENTATION_PLAN.md` - Implementation roadmap
- `project/QUICK_REFERENCE.md` - Code snippets and examples

## Thank You!

Your contributions make Obsidian Vox better for everyone. We appreciate your time and effort! 🎉
