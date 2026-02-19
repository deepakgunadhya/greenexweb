#!/bin/bash

# Greenex Git Helper Commands
# Usage: source git-helpers.sh (to load functions into your shell)
# Or run individual commands: ./git-helpers.sh [command]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Quick status check
quickcheck() {
    echo -e "${BLUE}🔍 Greenex Quick Status Check${NC}"
    echo "============================="
    
    # Git status
    echo -e "${BLUE}Git Status:${NC}"
    git status --porcelain | head -10
    
    # Untracked files count
    UNTRACKED_COUNT=$(git ls-files --others --exclude-standard | wc -l)
    if [ $UNTRACKED_COUNT -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $UNTRACKED_COUNT untracked files${NC}"
    else
        echo -e "${GREEN}✅ No untracked files${NC}"
    fi
    
    # Staged files count
    STAGED_COUNT=$(git diff --cached --name-only | wc -l)
    echo -e "📦 $STAGED_COUNT files staged for commit"
    
    # Modified files count  
    MODIFIED_COUNT=$(git diff --name-only | wc -l)
    echo -e "📝 $MODIFIED_COUNT files with unstaged changes"
    
    echo ""
}

# Safe add with review
safeadd() {
    echo -e "${BLUE}🔍 Reviewing files before adding...${NC}"
    
    # Show untracked files
    UNTRACKED=$(git ls-files --others --exclude-standard)
    if [ ! -z "$UNTRACKED" ]; then
        echo -e "${YELLOW}Untracked files to be added:${NC}"
        echo "$UNTRACKED" | while read file; do
            echo "  + $file"
        done
        echo ""
        read -p "Add all untracked files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            echo -e "${GREEN}✅ Files added${NC}"
        else
            echo -e "${YELLOW}⏭️  Skipped adding files${NC}"
            echo "Add specific files with: git add [file1] [file2]"
        fi
    else
        echo -e "${GREEN}✅ No untracked files to add${NC}"
    fi
    
    # Show modified files
    MODIFIED=$(git diff --name-only)
    if [ ! -z "$MODIFIED" ]; then
        echo -e "${YELLOW}Modified files to be staged:${NC}"
        echo "$MODIFIED" | while read file; do
            echo "  ~ $file"
        done
        echo ""
        read -p "Stage all modified files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add -u
            echo -e "${GREEN}✅ Modified files staged${NC}"
        else
            echo -e "${YELLOW}⏭️  Skipped staging files${NC}"
        fi
    fi
}

# Smart commit with verification
smartcommit() {
    local feature_name=$1
    
    echo -e "${BLUE}🚀 Greenex Smart Commit Process${NC}"
    echo "================================="
    
    # Step 1: Quick status
    quickcheck
    
    # Step 2: Run verification
    echo -e "${BLUE}Running pre-commit verification...${NC}"
    if [ -f "./verify-commit.sh" ]; then
        ./verify-commit.sh "$feature_name"
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Verification failed. Fix issues before committing.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  verify-commit.sh not found${NC}"
    fi
    
    # Step 3: Commit message
    echo ""
    echo -e "${BLUE}Enter commit message (or press Enter for template):${NC}"
    read -r commit_msg
    
    if [ -z "$commit_msg" ]; then
        # Use template
        echo "Using commit template..."
        git commit
    else
        git commit -m "$commit_msg"
    fi
    
    # Step 4: Push option
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Commit successful${NC}"
        echo ""
        read -p "Push to remote? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            git push origin $(git branch --show-current)
            echo -e "${GREEN}✅ Pushed to remote${NC}"
        fi
    fi
}

# Find missing imports
findmissing() {
    local search_pattern=${1:-""}
    
    echo -e "${BLUE}🔍 Finding Missing Import Files${NC}"
    echo "==============================="
    
    if [ ! -z "$search_pattern" ]; then
        echo "Searching for: $search_pattern"
    fi
    
    # Find TypeScript files with import statements
    find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | while read file; do
        if [ -f "$file" ]; then
            # Extract import paths and check existence
            grep -n "^import.*from ['\"]\..*['\"]" "$file" | while IFS=: read -r line_num import_line; do
                # Extract the import path
                import_path=$(echo "$import_line" | grep -o "from ['\"][^'\"]*['\"]" | sed "s/from ['\"]//g" | sed "s/['\"]//g")
                
                if [ ! -z "$import_path" ] && [[ "$import_path" =~ $search_pattern ]]; then
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
                        echo -e "${RED}❌ $file:$line_num - Missing: $import_path${NC}"
                    fi
                fi
            done
        fi
    done
}

# Show feature files
showfeature() {
    local feature_name=$1
    
    if [ -z "$feature_name" ]; then
        echo "Usage: showfeature <feature-name>"
        echo "Example: showfeature quotations"
        return 1
    fi
    
    echo -e "${BLUE}📁 Files for feature: $feature_name${NC}"
    echo "================================="
    
    echo -e "${YELLOW}Backend Files:${NC}"
    find . -path "*/modules/$feature_name/*" -type f | sort
    
    echo -e "${YELLOW}Frontend Files:${NC}"  
    find . -path "*/$feature_name*" -name "*.tsx" -o -path "*/$feature_name*" -name "*.ts" | grep -v node_modules | sort
    
    echo -e "${YELLOW}Store Files:${NC}"
    find . -name "*${feature_name}*Slice.ts" | sort
    
    echo -e "${YELLOW}API Client Files:${NC}"
    find . -path "*/api/${feature_name}.ts" | sort
}

# If script is run directly (not sourced), execute the command
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    case "$1" in
        quickcheck)
            quickcheck
            ;;
        safeadd) 
            safeadd
            ;;
        smartcommit)
            smartcommit "$2"
            ;;
        findmissing)
            findmissing "$2"
            ;;
        showfeature)
            showfeature "$2"
            ;;
        *)
            echo "Greenex Git Helpers"
            echo "==================="
            echo "Available commands:"
            echo "  quickcheck    - Quick git status overview"
            echo "  safeadd      - Review files before adding"  
            echo "  smartcommit  - Full commit process with verification"
            echo "  findmissing  - Find missing import files"
            echo "  showfeature  - Show all files for a feature"
            echo ""
            echo "Usage: ./git-helpers.sh [command]"
            echo "Or source this file to use functions directly:"
            echo "  source git-helpers.sh"
            echo "  quickcheck"
            ;;
    esac
fi