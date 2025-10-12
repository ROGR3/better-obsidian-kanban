# Justfile for Better Obsidian Kanban Plugin

# Build and deploy the plugin to Obsidian
deploy:
    #!/usr/bin/env bash
    echo "Building Better Obsidian Kanban plugin..."
    npm run build
    echo "Copying files to Obsidian plugins directory..."
    mkdir -p ~/Brain/.obsidian/plugins/better-obsidian-kanban
    cp main.js ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    cp manifest.json ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    cp styles.css ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    echo "✅ Plugin deployed successfully!"
    echo "Restart Obsidian to load the updated plugin."

# Build only (without copying)
build:
    npm run build

# Copy files only (assumes build is already done)
copy:
    #!/usr/bin/env bash
    echo "Copying files to Obsidian plugins directory..."
    mkdir -p ~/Brain/.obsidian/plugins/better-obsidian-kanban
    cp main.js ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    cp manifest.json ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    cp styles.css ~/Brain/.obsidian/plugins/better-obsidian-kanban/
    echo "✅ Files copied successfully!"

# Clean build artifacts
clean:
    rm -f main.js styles.css
    rm -rf out/

# Show help
help:
    @echo "Available commands:"
    @echo "  just deploy  - Build and copy plugin to Obsidian"
    @echo "  just build   - Build the plugin only"
    @echo "  just copy    - Copy files only (assumes build is done)"
    @echo "  just clean   - Remove build artifacts"
    @echo "  just help    - Show this help message"
