type TurnstileResponse = {
  success: boolean;
};

export async function verifyTurnstileToken(token: string, remoteIp?: string) {
  if (process.env.NODE_ENV !== "production" && !process.env.TURNSTILE_SECRET_KEY) {
    return true;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as TurnstileResponse;
  return payload.success;
}
