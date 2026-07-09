import * as FileSystem from "expo-file-system/legacy";

const SESSION_FILE = `${FileSystem.documentDirectory}pewpew_session.txt`;

export async function getStoredSession(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (!info.exists) return null;
    const session = await FileSystem.readAsStringAsync(SESSION_FILE);
    return session.trim() || null;
  } catch (e) {
    return null;
  }
}

export async function storeSession(session: string): Promise<void> {
  await FileSystem.writeAsStringAsync(SESSION_FILE, session);
}

export async function clearSession(): Promise<void> {
  try {
    await FileSystem.deleteAsync(SESSION_FILE);
  } catch (e) {
    // Ignore if file doesn't exist
  }
}

export async function login(email: string, password: string): Promise<string> {
  const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  const res = await fetch("https://pewpew.live/account", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://pewpew.live",
      Referer: "https://pewpew.live/account",
    },
    body,
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie") || res.headers.get("Set-Cookie");

  if (setCookie) {
    const sessionMatch = setCookie.match(/session=([^;]+)/);
    if (sessionMatch && sessionMatch[1]) {
      const session = sessionMatch[1];
      await storeSession(session);
      return session;
    }
  }

  // React Native fetch often hides the set-cookie header and automatically follows redirects
  // while persisting the cookie in the OS-level native cookie jar.
  // We can verify if the login was successful by making a subsequent GET request to /account.
  const verifyRes = await fetch("https://pewpew.live/account", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0",
    },
  });

  const verifyText = await verifyRes.text();
  if (verifyText.includes('class="info-title">SIGN IN</h1>')) {
    throw new Error("Invalid email or password.");
  }

  // Successfully logged in via native cookie jar
  const session = "OS_MANAGED_COOKIE";
  await storeSession(session);
  return session;
}

export async function checkSessionValid(session: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0",
    };

    if (session !== "OS_MANAGED_COOKIE") {
      headers["Cookie"] = `session=${session}`;
    }

    const res = await fetch("https://pewpew.live/account", { headers });
    const text = await res.text();

    // If the account page still shows the sign in form, the session is invalid
    if (text.includes('class="info-title">SIGN IN</h1>')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getValidSession(email?: string, password?: string): Promise<string> {
  const currentSession = await getStoredSession();

  if (currentSession) {
    const isValid = await checkSessionValid(currentSession);
    if (isValid) {
      return currentSession;
    } else {
      await clearSession();
    }
  }

  if (!email || !password) {
    throw new Error("No valid session exists and no credentials were provided to login.");
  }

  return await login(email, password);
}
