#!/bin/bash
# FAQ System Verification Checklist

echo "🔍 Verifying FAQ System Setup..."
echo ""

# Check file existence
echo "📁 Checking required files..."
files=(
  "c:\tosouapp.com\attendance\backend\src\static\js\admin\faq\faq.page.js"
  "c:\tosouapp.com\attendance\backend\src\static\js\admin\faq-admin-component.js"
  "c:\tosouapp.com\attendance\backend\src\modules\faq\faq.repository.js"
  "c:\tosouapp.com\attendance\backend\src\modules\faq\faq.controller.js"
  "c:\tosouapp.com\attendance\backend\src\modules\faq\faq.routes.js"
  "c:\tosouapp.com\attendance\backend\src\static\html\faq.html"
  "c:\tosouapp.com\attendance\backend\src\static\html\admin.html"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
  fi
done

echo ""
echo "📝 Checking code patterns..."

# Check admin.page.js has FAQ route
if grep -q "if (p2 === '/admin/faq')" "c:\tosouapp.com\attendance\backend\src\static\js\admin\admin.page.js"; then
  echo "✅ admin.page.js has /admin/faq route handler"
else
  echo "❌ admin.page.js missing /admin/faq route handler"
fi

# Check faq.page.js exists and has mount function
if [ -f "c:\tosouapp.com\attendance\backend\src\static\js\admin\faq\faq.page.js" ]; then
  if grep -q "export async function mount()" "c:\tosouapp.com\attendance\backend\src\static\js\admin\faq\faq.page.js"; then
    echo "✅ faq.page.js exports mount() function"
  else
    echo "❌ faq.page.js missing mount() export"
  fi
fi

# Check routes mounted
if grep -q "app.use('/api/faq', faqRoutes)" "c:\tosouapp.com\attendance\backend\src\routes\index.js"; then
  echo "✅ FAQ API routes mounted at /api/faq"
else
  echo "❌ FAQ API routes not mounted"
fi

# Check admin menu has FAQ link
if grep -q '<a href="/admin/faq"' "c:\tosouapp.com\attendance\backend\src\static\html\admin.html"; then
  echo "✅ admin.html has FAQ menu link"
else
  echo "❌ admin.html missing FAQ menu link"
fi

echo ""
echo "✨ Verification complete!"
