#!/bin/bash
# Test what files Docker will include in build context

echo "Testing .dockerignore effectiveness..."
echo "======================================"

# Create a temporary tar (simulate what Docker does)
tar -czf /tmp/test-docker-context.tar.gz \
  --exclude-from=.dockerignore \
  --exclude=.git \
  . 2>/dev/null

SIZE=$(du -sh /tmp/test-docker-context.tar.gz | awk '{print $1}')
echo "Compressed size with .dockerignore: $SIZE"

# Clean up
rm /tmp/test-docker-context.tar.gz

# Show what would be excluded
echo ""
echo "Testing if node_modules is excluded:"
if tar -czf /tmp/test.tar.gz --exclude-from=.dockerignore . 2>&1 | grep -q "node_modules"; then
    echo "⚠️  node_modules might still be included"
else
    echo "✓ node_modules appears to be excluded"
fi
rm -f /tmp/test.tar.gz
