interface StreamingXmlParserState {
  currentContent: string;
  insideTag: string | null;
  tagContent: string;
  openTags: Set<string>;
  partialTag: string;
}

interface ParsedChunk {
  type: 'thought' | 'honchoQuery' | 'pdfQuery';
  text: string;
  isComplete?: boolean;
}

export class StreamingXmlParser {
  private state: StreamingXmlParserState = {
    currentContent: '',
    insideTag: null,
    tagContent: '',
    openTags: new Set(),
    partialTag: '',
  };

  parse(chunk: string): ParsedChunk[] {
    const results: ParsedChunk[] = [];
    let i = 0;

    while (i < chunk.length) {
      const char = chunk[i];

      // Handle potential tag opening
      if (char === '<') {
        // If we were in the middle of regular thought content, emit it
        if (this.state.currentContent && !this.state.insideTag) {
          results.push({
            type: 'thought',
            text: this.state.currentContent,
          });
          this.state.currentContent = '';
        }

        // Start capturing potential tag
        this.state.partialTag = '<';
        i++;

        // Look ahead to capture the full opening tag
        while (i < chunk.length && chunk[i] !== '>') {
          this.state.partialTag += chunk[i];
          i++;
        }

        if (i < chunk.length && chunk[i] === '>') {
          this.state.partialTag += '>';

          // Check if this is an opening tag we care about
          const honchoMatch = this.state.partialTag.match(/^<honcho>$/);
          const pdfMatch = this.state.partialTag.match(/^<pdf-agent>$/);
          const honchoCloseMatch = this.state.partialTag.match(/^<\/honcho>$/);
          const pdfCloseMatch = this.state.partialTag.match(/^<\/pdf-agent>$/);

          if (honchoMatch) {
            this.state.insideTag = 'honcho';
            this.state.tagContent = '';
            this.state.openTags.add('honcho');
          } else if (pdfMatch) {
            this.state.insideTag = 'pdf-agent';
            this.state.tagContent = '';
            this.state.openTags.add('pdf-agent');
          } else if (honchoCloseMatch && this.state.insideTag === 'honcho') {
            // Emit the complete honcho query
            results.push({
              type: 'honchoQuery',
              text: this.state.tagContent,
              isComplete: true,
            });
            this.state.insideTag = null;
            this.state.tagContent = '';
            this.state.openTags.delete('honcho');
          } else if (pdfCloseMatch && this.state.insideTag === 'pdf-agent') {
            // Emit the complete pdf query
            results.push({
              type: 'pdfQuery',
              text: this.state.tagContent,
              isComplete: true,
            });
            this.state.insideTag = null;
            this.state.tagContent = '';
            this.state.openTags.delete('pdf-agent');
          } else if (!this.state.insideTag) {
            // Not a tag we care about, treat as thought content
            this.state.currentContent += this.state.partialTag;
          } else {
            // Inside a tag but this is some other tag, add to tag content
            this.state.tagContent += this.state.partialTag;
          }

          this.state.partialTag = '';
        } else {
          // Incomplete tag at end of chunk, will continue next time
          break;
        }
      } else {
        // Regular character
        if (this.state.insideTag) {
          this.state.tagContent += char;
          // Also emit streaming content for the query as it's being built
          if (this.state.insideTag === 'honcho') {
            results.push({
              type: 'honchoQuery',
              text: char,
            });
          } else if (this.state.insideTag === 'pdf-agent') {
            results.push({
              type: 'pdfQuery',
              text: char,
            });
          }
        } else {
          this.state.currentContent += char;
        }
      }

      i++;
    }

    // If we have pending thought content and no open tags, emit it
    if (this.state.currentContent && !this.state.insideTag) {
      results.push({
        type: 'thought',
        text: this.state.currentContent,
      });
      this.state.currentContent = '';
    }

    return results;
  }

  // Get the complete content for a specific tag type
  getTagContent(tagType: 'honcho' | 'pdf-agent'): string {
    if (this.state.insideTag === tagType) {
      return this.state.tagContent;
    }
    return '';
  }

  // Get the complete thought content accumulated so far
  getThoughtContent(): string {
    return this.state.currentContent;
  }

  // Reset the parser state
  reset(): void {
    this.state = {
      currentContent: '',
      insideTag: null,
      tagContent: '',
      openTags: new Set(),
      partialTag: '',
    };
  }
}
