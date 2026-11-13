# Contributing to AETHER Browser

Thank you for your interest in contributing to AETHER Browser!

## Development Setup

1. **Prerequisites**:
   - Node.js (version 18 or newer)
   - npm (version 9 or newer)

2. **Clone and Install**:
   ```bash
   git clone https://github.com/A2004-a/amiyo-browser.git
   cd amiyo-browser
   npm install
   ```

3. **Running the Application**:
   ```bash
   npm start
   ```

4. **Running Tests**:
   ```bash
   npm test
   ```

## Architecture Guidelines

- **Main Process (`electron/`)**: Handles window lifecycle, native menus, WebContentsView instances, downloads, and IPC handlers. Keep all remote web views sandboxed.
- **Preload Bridge (`preload.js`)**: Only expose safe, explicit channels via `contextBridge`. Do not pass raw EventEmitter or unrestricted Node modules.
- **Renderer (`src/`)**: Pure HTML, CSS, and Vanilla JavaScript. Follow modular single-responsibility organization.
- **State (`src/js/state.js`)**: Maintain unidirectional state flow for tabs, navigation, and settings.

## Pull Request Guidelines

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Verify that all unit tests pass:
   ```bash
   npm test
   ```
3. Commit your changes with clear, structured commit messages:
   - `feat:` for new capabilities
   - `fix:` for bug fixes
   - `style:` for CSS/UI design improvements
   - `test:` for test additions or updates
4. Submit a Pull Request following the PR template checklist.

