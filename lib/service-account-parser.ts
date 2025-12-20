import type { JWTInput } from "google-auth-library";

/**
 * Sanitizes a JSON string by escaping control characters within string values.
 * This is useful when JSON is stored in environment variables where newlines
 * in the private_key field might not be properly escaped.
 */
function sanitizeJsonString(jsonString: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;
  let i = 0;

  while (i < jsonString.length) {
    const char = jsonString[i];
    const charCode = char.charCodeAt(0);

    if (escapeNext) {
      // We're escaping the next character
      result += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === "\\") {
      // Escape character - the next character should be preserved as-is
      result += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"') {
      // Toggle string state
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      // We're inside a string value
      if (charCode < 32 && char !== "\n" && char !== "\r" && char !== "\t") {
        // Invalid control character - remove it
        i++;
        continue;
      } else if (char === "\n") {
        // Replace unescaped newline with \n
        result += "\\n";
        i++;
        continue;
      } else if (char === "\r") {
        // Replace unescaped carriage return with \r
        result += "\\r";
        i++;
        continue;
      } else if (char === "\t") {
        // Replace unescaped tab with \t
        result += "\\t";
        i++;
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Parses a service account JSON string from an environment variable.
 * Attempts to automatically fix common issues like unescaped control characters.
 */
export function parseServiceAccountJson(jsonString: string | undefined): JWTInput {
  if (!jsonString) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON env. Keep the service account key in .env.local."
    );
  }

  // First, try parsing as-is
  try {
    return JSON.parse(jsonString) as JWTInput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a control character error
    if (errorMessage.includes("Bad control character") || errorMessage.includes("position")) {
      console.warn("⚠️  JSON parsing failed, attempting to sanitize control characters...");
      
      try {
        // Try sanitizing the JSON string
        const sanitized = sanitizeJsonString(jsonString);
        const parsed = JSON.parse(sanitized) as JWTInput;
        console.log("✅ Successfully parsed JSON after sanitization");
        return parsed;
      } catch (sanitizeError) {
        // Sanitization didn't help, provide detailed error
        const positionMatch = errorMessage.match(/position (\d+)/);
        const position = positionMatch ? parseInt(positionMatch[1], 10) : null;
        
        let diagnostic = `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${errorMessage}`;
        
        if (position !== null && position < jsonString.length) {
          const start = Math.max(0, position - 30);
          const end = Math.min(jsonString.length, position + 30);
          const snippet = jsonString.substring(start, end);
          const charAtPosition = jsonString[position];
          const charCode = charAtPosition ? charAtPosition.charCodeAt(0) : null;
          
          diagnostic += `\n\nError at position ${position} (character code: ${charCode})`;
          diagnostic += `\nContext: ${JSON.stringify(snippet)}`;
          
          if (charCode !== null && charCode < 32) {
            diagnostic += `\n\n⚠️  Found invalid control character (code ${charCode}).`;
            diagnostic += `\n\nTo fix this in your .env.local file:`;
            diagnostic += `\n1. Open .env.local`;
            diagnostic += `\n2. Find GOOGLE_SERVICE_ACCOUNT_JSON`;
            diagnostic += `\n3. Ensure all newlines in the private_key field are escaped as \\n`;
            diagnostic += `\n4. The entire JSON should be on one line, or properly formatted`;
            diagnostic += `\n\nExample format:`;
            diagnostic += `\nGOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----\\n",...}`;
          }
        }
        
        throw new Error(diagnostic);
      }
    }
    
    // For other types of errors, just rethrow with context
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${errorMessage}`);
  }
}

