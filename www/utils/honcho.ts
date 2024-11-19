import { Honcho } from 'honcho-ai';

const honcho = new Honcho({
  baseURL: process.env.HONCHO_URL!,
});

const getHonchoApp = async () => {
  return await honcho.apps.getOrCreate(process.env.HONCHO_APP_NAME!);
};

export { honcho, getHonchoApp };
