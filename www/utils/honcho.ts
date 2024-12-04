import { Honcho } from 'honcho-ai';
import { unstable_cache } from 'next/cache';

export const honcho = new Honcho({
  baseURL: process.env.HONCHO_URL!,
});

export const getHonchoApp = unstable_cache(
  async () => {
    console.log('Cache Miss App');
    return await honcho.apps.getOrCreate(process.env.HONCHO_APP_NAME!);
  },
  [],
  {
    revalidate: 300, // 5 minutes
  }
);

export const getHonchoUser = unstable_cache(
  async (userId: string) => {
    console.log('Cache Miss User');
    const app = await getHonchoApp();
    return await honcho.apps.users.getOrCreate(app.id, userId);
  },
  [],
  {
    revalidate: 300,
  }
);