# GitHub Configuration for Obsidian Vox

This directory contains GitHub-specific configuration files, templates, and documentation for the Obsidian Vox project.

## Contents

### 📚 Documentation

#### [copilot-instructions.md](copilot-instructions.md)
Guidelines for GitHub Copilot to provide context-aware assistance for this project. Includes:
- Project overview and architecture
- Coding conventions and patterns
- Common patterns and APIs
- Whisper.cpp integration details

#### [development-guide.md](development-guide.md)
Comprehensive development guide covering:
- Project structure
- Development workflow
- Code style guidelines
- Common tasks and examples
- API references
- Debugging tips

#### [CONTRIBUTING.md](CONTRIBUTING.md)
Guidelines for contributing to the project:
- How to report bugs
- How to suggest features
- Code contribution process
- Testing guidelines
- Code review process

### 📝 Templates

#### [pull_request_template.md](pull_request_template.md)
Template for pull requests including:
- Description and type of change
- Testing checklist
- Code quality checks
- Screenshots section

#### Issue Templates (`ISSUE_TEMPLATE/`)

- **[bug_report.md](ISSUE_TEMPLATE/bug_report.md)** - For reporting bugs
- **[feature_request.md](ISSUE_TEMPLATE/feature_request.md)** - For suggesting features

### 🔧 Workflows

#### [workflows/releases.yml](workflows/releases.yml)
GitHub Actions workflow for automated releases.

## Quick Links

### For Contributors

1. **Getting Started**: Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. **Development Setup**: See [development-guide.md](development-guide.md)
3. **Code Patterns**: Check [copilot-instructions.md](copilot-instructions.md)

### For Developers Using Copilot

GitHub Copilot will automatically use [copilot-instructions.md](copilot-instructions.md) to provide context-aware suggestions for this project.

### For Maintainers

- Use issue templates to ensure consistent bug reports and feature requests
- PR template helps ensure thorough testing and documentation
- Development guide provides reference for code reviews

## Project-Specific Guidelines

### Whisper.cpp Integration

We're currently migrating to whisper.cpp server. When working on related issues:

1. **Use Mock Server for Testing**
   ```bash
   node project/mock-whisper-server.js
   ```

2. **Reference Planning Docs**
   - `project/IMPLEMENTATION_PLAN.md` - Implementation roadmap
   - `project/TECHNICAL_SPEC.md` - API specification
   - `project/QUICK_REFERENCE.md` - Code examples

3. **Key Files to Modify**
   - `src/types.ts` - Type definitions
   - `src/TranscriptionProcessor/index.ts` - API integration
   - `src/settings/index.ts` - Settings

### Code Quality Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Manual testing with mock server
- **Documentation**: Update docs with code changes
- **Style**: Follow existing patterns

## Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Updating This Directory

When adding new configuration files:

1. Add them to the appropriate section
2. Update this README with a description
3. Ensure templates have clear instructions
4. Test templates by creating an issue/PR

## License

All documentation in this directory is part of the Obsidian Vox project and is licensed under AGPL-3.0-only.
