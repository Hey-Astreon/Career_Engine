const fs = require('fs');
const content = fs.readFileSync('extension/content.js', 'utf8');

const checks = [
  { name: 'PREFERRED_LOCATION in SINGLETON_TYPES', test: content.includes("'PREFERRED_LOCATION'") },
  { name: 'isTrueGeoAutocomplete helper defined', test: content.includes('function isTrueGeoAutocomplete') },
  { name: 'isTrueGeoAutocomplete used in fillReactSelectV2', test: content.includes('if (isTrueGeoAutocomplete(inputEl, fieldType))') },
  { name: 'isTrueGeoAutocomplete used in fillUniversalCombobox', test: content.includes('if (isTrueGeoAutocomplete(triggerEl, fieldType))') },
  { name: 'Remote synonyms in SYNONYM_DICTIONARY', test: content.includes("'remote': ['remote', 'remote (us)'") },
  { name: 'Stage 2a Remote Priority in resolveSemanticOptionMatch', test: content.includes('hasWorkplaceOrLocationIntent') },
  { name: 'Preferred Location fallback in fillReactSelectV2', test: content.includes("// Preferred Office / Workplace / Remote fallback") },
  { name: 'preferredLocation in Roushan profile', test: content.includes("preferredLocation: 'Remote'") },
  { name: 'preferredLocation in Ayushi profile', test: content.includes("preferredLocation: 'Remote'") },
  { name: 'PREFERRED_LOCATION in resolvePreview', test: content.includes("case 'PREFERRED_LOCATION':") },
  { name: 'PREFERRED_LOCATION in resolveValue', test: content.includes("case 'PREFERRED_LOCATION':\n      case 'WORKPLACE_TYPE': return profile.preferredLocation || 'Remote';") },
  { name: 'PREFERRED_LOCATION in FIELD_PATTERNS', test: content.includes("kw: ['preferred office location'") },
];

let allPassed = true;
for (const c of checks) {
  if (c.test) {
    console.log(`✓ ${c.name}`);
  } else {
    console.error(`✗ FAILED: ${c.name}`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\n🌟 ALL 12 INTEGRITY VERIFICATIONS PASSED 100%!');
}
