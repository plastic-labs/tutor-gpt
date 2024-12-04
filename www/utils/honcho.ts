import { Honcho } from 'honcho-ai';
import { cache } from 'react';

export const honcho = new Honcho({
  baseURL: process.env.HONCHO_URL!,
});

export const getHonchoApp = cache(async () => {
  return await honcho.apps.getOrCreate(process.env.HONCHO_APP_NAME!);
});

export const getHonchoUser = cache(async (userId: string) => {
  const app = await getHonchoApp();
  return await honcho.apps.users.getOrCreate(app.id, userId);
});
