#!/usr/bin/env node

/**
 * Security Check Script
 * Validates that no sensitive credentials are committed to the repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECURITY_PATTERNS = [
  {
    pattern: /https:\/\/[a-z0-9]+\.supabase\.co/g,
    description: 'Hardcoded Supabase URL detected',
    severity: 'HIGH',
    allowedFiles: ['.env.example', 'SECURITY-SETUP.md']
  },
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    description: 'JWT token detected',
    severity: 'CRITICAL',
    allowedFiles: []
  },
  {
    pattern: /[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com/g,
    description: 'Google OAuth Client ID detected',
    severity: 'MEDIUM',
    allowedFiles: ['.env.example', 'SECURITY-SETUP.md']
  },
  {
    pattern: /Bearer [A-Za-z0-9_-]+/g,
    description: 'Bearer token detected',
    severity: 'CRITICAL',
    allowedFiles: []
  },
  {
    pattern: /0x4[A-Za-z0-9_-]+/g,
    description: 'Production Turnstile key detected',
    severity: 'HIGH',
    allowedFiles: ['.env.example']
  }
];

const FILES_TO_SCAN = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
  'supabase/functions/**/*.ts',
  'supabase/migrations/**/*.sql',
  'supabase/config.toml',
  '.env.example'
];

function scanFile(filePath, content) {
  const violations = [];
  const fileName = path.basename(filePath);
  
  for (const { pattern, description, severity, allowedFiles } of SECURITY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // Check if this file is allowed to contain this pattern
      const isAllowed = allowedFiles.includes(fileName) || 
                       allowedFiles.some(allowed => filePath.includes(allowed));
      
      if (!isAllowed) {
        violations.push({
          file: filePath,
          pattern: pattern.source,
          description,
          severity,
          matches: matches.slice(0, 3) // Limit to first 3 matches
        });
      }
    }
  }
  
  return violations;
}

function scanDirectory(dir, violations = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        scanDirectory(filePath, violations);
      }
    } else if (stat.isFile()) {
      // Scan relevant file types
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.sql', '.toml', '.md'].includes(ext) || file === '.env.example') {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const fileViolations = scanFile(filePath, content);
          violations.push(...fileViolations);
        } catch (error) {
          console.warn(`Warning: Could not read file ${filePath}:`, error.message);
        }
      }
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 Running security scan for credential exposure...\n');
  
  const projectRoot = path.resolve(__dirname, '..');
  const violations = scanDirectory(projectRoot);
  
  if (violations.length === 0) {
    console.log('✅ Security scan passed! No exposed credentials found.\n');
    process.exit(0);
  }
  
  console.log(`❌ Security scan failed! Found ${violations.length} violations:\n`);
  
  const groupedViolations = violations.reduce((acc, violation) => {
    if (!acc[violation.severity]) {
      acc[violation.severity] = [];
    }
    acc[violation.severity].push(violation);
    return acc;
  }, {});
  
  for (const [severity, severityViolations] of Object.entries(groupedViolations)) {
    console.log(`📢 ${severity} SEVERITY (${severityViolations.length} issues):`);
    
    for (const violation of severityViolations) {
      console.log(`   File: ${violation.file}`);
      console.log(`   Issue: ${violation.description}`);
      console.log(`   Matches: ${violation.matches.join(', ')}`);
      console.log('');
    }
  }
  
  console.log('🛠️  To fix these issues:');
  console.log('   1. Move all credentials to environment variables');
  console.log('   2. Update .env.example with placeholder values only');
  console.log('   3. Ensure .env is in .gitignore');
  console.log('   4. Use import.meta.env.VITE_* in your code');
  console.log('');
  console.log('📖 See SECURITY-SETUP.md for detailed instructions');
  
  process.exit(1);
}

main();