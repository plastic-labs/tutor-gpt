export async function verifyTurnstile(token: string, ip: string) {
  const formData = new FormData();
  formData.append('secret', process.env.TURNSTILE_SECRET_KEY as string);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const result = await fetch(url, {
    body: formData,
    method: 'POST',
  });

  const json = await result.json();

  return json.success;
}
