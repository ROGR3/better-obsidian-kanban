export class FrontmatterParser {
  static parseFrontmatter(content: string): any {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.log('No frontmatter found in content');
      return null;
    }

    const frontmatterText = frontmatterMatch[1];
    console.log('Frontmatter text:', frontmatterText);
    
    const result: any = {};

    // Split by lines and process
    const lines = frontmatterText.split('\n');
    let currentKey = '';
    let currentValue = '';
    let inJson = false;
    let jsonLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) continue;

      // Check if this line starts a new key-value pair
      if (trimmed.includes(':') && !inJson) {
        // Save previous key-value pair if exists
        if (currentKey && currentValue) {
          this.parseKeyValue(result, currentKey, currentValue);
        }

        // Start new key-value pair
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        currentKey = key;
        currentValue = value;
        
        // Check if this starts JSON
        if (value.startsWith('[') || value.startsWith('{')) {
          inJson = true;
          jsonLines = [value];
          
          // Check if JSON is complete on this line
          if (this.isJsonComplete(value)) {
            this.parseKeyValue(result, currentKey, value);
            currentKey = '';
            currentValue = '';
            inJson = false;
            jsonLines = [];
          }
        } else if (value === '[]' || value === '{}') {
          // Handle empty JSON
          this.parseKeyValue(result, currentKey, value);
          currentKey = '';
          currentValue = '';
        } else {
          // Simple key-value pair
          this.parseKeyValue(result, currentKey, value);
          currentKey = '';
          currentValue = '';
        }
      } else if (inJson) {
        // Continue building JSON value
        jsonLines.push(trimmed);
        const fullJson = jsonLines.join(' ');
        
        // Check if JSON is complete
        if (this.isJsonComplete(fullJson)) {
          this.parseKeyValue(result, currentKey, fullJson);
          currentKey = '';
          currentValue = '';
          inJson = false;
          jsonLines = [];
        }
      }
    }

    // Handle last key-value pair
    if (currentKey && currentValue) {
      this.parseKeyValue(result, currentKey, currentValue);
    }

    console.log('Final parsed frontmatter:', result);
    return result;
  }

  private static isJsonComplete(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  private static parseKeyValue(result: any, key: string, value: string): void {
    console.log(`Parsing key: ${key}, value: ${value}`);
    
    if (key === 'items' && value.startsWith('[')) {
      try {
        result[key] = JSON.parse(value);
        console.log('Parsed items:', result[key]);
      } catch (error) {
        console.error('Error parsing items:', error);
        result[key] = [];
      }
    } else if (key === 'columns' && value.startsWith('[')) {
      try {
        result[key] = JSON.parse(value);
        console.log('Parsed columns:', result[key]);
      } catch (error) {
        console.error('Error parsing columns:', error);
        result[key] = [];
      }
    } else if (key === 'settings' && value.startsWith('{')) {
      try {
        result[key] = JSON.parse(value);
        console.log('Parsed settings:', result[key]);
      } catch (error) {
        console.error('Error parsing settings:', error);
        result[key] = {};
      }
    } else {
      // Simple key-value pair
      result[key] = value;
    }
  }
}
