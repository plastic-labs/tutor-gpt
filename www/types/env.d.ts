declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      MODEL: string;
      HONCHO_URL: string;
      HONCHO_APP_NAME: string;
      // Add other environment variables as needed
    }
  }
}

export {}; 