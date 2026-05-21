const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'components', 'Header.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the unique closing signature of the Header component:
const targetSignature = `      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}`;

// Normalize line endings to find the first occurrence reliably
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedSignature = targetSignature.replace(/\r\n/g, '\n');

const signatureIndex = normalizedContent.indexOf(normalizedSignature);

if (signatureIndex !== -1) {
  // Extract up to the end of the first signature and write it back
  const endPosition = signatureIndex + normalizedSignature.length;
  // Account for any difference in characters due to normalized carriage returns
  // by keeping original string slice
  const lines = content.split(/\r?\n/);
  // Find which line the signature ends on
  let charCount = 0;
  let targetLineIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1; // +1 for the newline char
    if (charCount >= endPosition) {
      targetLineIndex = i;
      break;
    }
  }
  
  const cleanContent = lines.slice(0, targetLineIndex + 1).join('\n');
  fs.writeFileSync(filePath, cleanContent, 'utf8');
  console.log('SUCCESS: Successfully cleaned Header.tsx by removing duplicated fragments!');
} else {
  console.error('ERROR: Could not find target signature in Header.tsx!');
  process.exit(1);
}
