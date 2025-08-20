#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all files that need updating
const filesToUpdate = [
  'src/components/BookingManager.tsx',
  'src/components/AIEmailAssistant.tsx',
  'src/components/AIInsights.tsx', 
  'src/components/AILeadScoring.tsx',
  'src/components/AdvancedReporting.tsx',
  'src/components/EnhancedAnalytics.tsx',
  'src/components/EnhancedAuthSecurity.tsx',
  'src/components/EnhancedBookingManager.tsx',
  'src/components/EnhancedClientManager.tsx',
  'src/components/EnhancedDashboard.tsx',
  'src/components/EnhancedSecurityDashboard.tsx',
  'src/components/GDPRCompliance.tsx',
  'src/components/ManualGmailFix.tsx',
  'src/components/NotificationCenter.tsx',
  'src/components/RequestCreationForm.tsx',
  'src/components/SabreOptionManager.tsx',
  'src/components/SecureDataView.tsx',
  'src/components/SecurityDashboard.tsx',
  'src/components/SecurityMonitoringDashboard.tsx',
  'src/components/ThreatDetectionSystem.tsx',
  'src/components/ZeroTrustDashboard.tsx',
  'src/components/analytics/useAnalyticsData.tsx',
  'src/components/ClientAssignmentManager.tsx',
  'src/components/ComplianceGovernance.tsx'
];

// Update function
function updateAuthImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the import
    let updatedContent = content.replace(
      /import { useAuth } from ['"]@\/hooks\/useAuthOptimized['"];/g,
      "import { useSimpleAuth as useAuth } from '@/hooks/useSimpleAuth';"
    );
    
    // Also handle cases where there might be other imports on the same line
    updatedContent = updatedContent.replace(
      /useAuth } from ['"]@\/hooks\/useAuthOptimized['"];/g,
      "useAuth } from '@/hooks/useSimpleAuth';"
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

// Update all files
console.log('🔄 Updating auth imports...\n');

let updatedCount = 0;
for (const file of filesToUpdate) {
  if (updateAuthImports(file)) {
    updatedCount++;
  }
}

console.log(`\n✅ Successfully updated ${updatedCount} files`);
console.log('🎉 Auth import update complete!');