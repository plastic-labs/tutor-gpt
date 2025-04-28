import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

export async function parsePDF(
  buffer: ArrayBuffer,
  fileName: string
): Promise<string[]> {
  try {
    // Convert ArrayBuffer to Buffer for file upload
    const fileBuffer = Buffer.from(buffer);

    // Upload the file to Mistral
    const uploadedFile = await client.files.upload({
      file: {
        fileName: fileName,
        content: fileBuffer,
      },
      // @ts-expect-error - library is not updated
      purpose: 'ocr',
    });

    // Get signed URL for the uploaded file
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    // Process the document with OCR
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: signedUrl.url,
      },
    });

    // Extract text from OCR response
    // Note: The exact structure of ocrResponse will depend on Mistral's API response format
    // You may need to adjust this based on the actual response structure
    const extractedText = ocrResponse.pages.map((page) => page.markdown);

    // Clean up: Delete the uploaded file
    await client.files.delete({
      fileId: uploadedFile.id,
    });

    return extractedText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}
