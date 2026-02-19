#!/bin/bash

# Greenex Pre-Commit Verification Script
# Usage: ./verify-commit.sh [feature-name]

echo "🔍 Greenex Pre-Commit Verification"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FEATURE_NAME=${1:-""}
ISSUES_FOUND=0

echo -e "${BLUE}📋 Step 1: Checking Git Status${NC}"
echo "================================="

# Check for untracked files
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ ! -z "$UNTRACKED" ]; then
    echo -e "${YELLOW}⚠️  Untracked files found:${NC}"
    echo "$UNTRACKED" | while read file; do
        echo "  - $file"
    done
    ((ISSUES_FOUND++))
    echo ""
fi

# Check for unstaged changes  
UNSTAGED=$(git diff --name-only)
if [ ! -z "$UNSTAGED" ]; then
    echo -e "${YELLOW}⚠️  Unstaged changes found:${NC}"
    echo "$UNSTAGED" | while read file; do
        echo "  - $file"
    done
    ((ISSUES_FOUND++))
    echo ""
fi

# Check for staged changes
STAGED=$(git diff --cached --name-only)
if [ ! -z "$STAGED" ]; then
    echo -e "${GREEN}✅ Staged files:${NC}"
    echo "$STAGED" | while read file; do
        echo "  + $file"
    done
    echo ""
else
    echo -e "${RED}❌ No files staged for commit${NC}"
    ((ISSUES_FOUND++))
    echo ""
fi

echo -e "${BLUE}📋 Step 2: Feature Completeness Check${NC}"
echo "====================================="

# Check for common missing file patterns
if [ ! -z "$FEATURE_NAME" ]; then
    echo "🔍 Checking for complete $FEATURE_NAME implementation..."
    
    # Check for Redux slice if store index is modified
    if echo "$STAGED $UNSTAGED" | grep -q "store/index.ts"; then
        echo "  📦 Store modified - checking for Redux slice..."
        if ! echo "$STAGED $UNTRACKED" | grep -q "${FEATURE_NAME}Slice.ts"; then
            echo -e "  ${RED}❌ Missing ${FEATURE_NAME}Slice.ts${NC}"
            ((ISSUES_FOUND++))
        else
            echo -e "  ${GREEN}✅ Found ${FEATURE_NAME}Slice.ts${NC}"
        fi
    fi
    
    # Check for API client if routes are modified
    if echo "$STAGED $UNSTAGED" | grep -q "routes.*\.ts"; then
        echo "  🌐 Routes modified - checking for API client..."
        if ! echo "$STAGED $UNTRACKED" | grep -q "${FEATURE_NAME}.*\.ts"; then
            echo -e "  ${YELLOW}⚠️  Consider adding API client for ${FEATURE_NAME}${NC}"
        else
            echo -e "  ${GREEN}✅ Found ${FEATURE_NAME} API files${NC}"
        fi
    fi
    
    # Check for component if pages are modified
    if echo "$STAGED $UNSTAGED" | grep -q "pages.*\.tsx"; then
        echo "  📱 Pages modified - checking for components..."
        if ! echo "$STAGED $UNTRACKED" | grep -q "components.*${FEATURE_NAME}"; then
            echo -e "  ${GREEN}✅ No missing components detected${NC}"
        fi
    fi
fi

echo -e "${BLUE}📋 Step 3: Import Dependency Check${NC}"  
echo "================================="

# Check for broken imports in staged TypeScript files
for file in $(echo "$STAGED" | grep -E '\.(ts|tsx)$'); do
    if [ -f "$file" ]; then
        echo "🔍 Checking imports in $file..."
        
        # Extract import statements and check if files exist
        grep -n "^import.*from ['\"]\..*['\"]" "$file" | while IFS=: read -r line_num import_line; do
            # Extract the import path
            import_path=$(echo "$import_line" | grep -o "from ['\"][^'\"]*['\"]" | sed "s/from ['\"]//g" | sed "s/['\"]//g")
            
            if [ ! -z "$import_path" ]; then
                # Convert relative import to file path
                dir=$(dirname "$file")
                if [[ "$import_path" == ./* ]]; then
                    full_path="$dir/${import_path:2}"
                elif [[ "$import_path" == ../* ]]; then
                    full_path="$dir/$import_path"
                else
                    continue
                fi
                
                # Check various extensions
                if [ ! -f "$full_path.ts" ] && [ ! -f "$full_path.tsx" ] && [ ! -f "$full_path.js" ] && [ ! -f "$full_path/index.ts" ] && [ ! -f "$full_path/index.tsx" ]; then
                    echo -e "  ${RED}❌ Line $line_num: Missing import '$import_path'${NC}"
                    ((ISSUES_FOUND++))
                fi
            fi
        done
    fi
done

echo -e "${BLUE}📋 Step 4: Build Verification${NC}"
echo "============================="

# Check if TypeScript compiles (in API directory)
if [ -f "apps/api/tsconfig.json" ]; then
    echo "🔧 Checking TypeScript compilation (API)..."
    cd apps/api
    if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API TypeScript compilation successful${NC}"
    else
        echo -e "${RED}❌ API TypeScript compilation failed${NC}"
        echo "Run: cd apps/api && npx tsc --noEmit --skipLibCheck"
        ((ISSUES_FOUND++))
    fi
    cd - > /dev/null
fi

# Summary
echo ""
echo -e "${BLUE}📋 Summary${NC}"
echo "=========="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready to commit.${NC}"
    echo ""
    echo "📝 Recommended next steps:"
    echo "  1. git add . (if needed)"
    echo "  2. git commit -m \"your message\""
    echo "  3. git push origin $(git branch --show-current)"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND issue(s) that need attention.${NC}"
    echo ""
    echo "🔧 Recommended fixes:"
    [ ! -z "$UNTRACKED" ] && echo "  • Add untracked files: git add ."
    [ ! -z "$UNSTAGED" ] && echo "  • Stage changes: git add ."
    echo "  • Review missing files listed above"
    echo "  • Fix any import issues"
    echo "  • Ensure TypeScript compilation passes"
    echo ""
    echo "Run this script again after fixes: ./verify-commit.sh $FEATURE_NAME"
    exit 1
fi