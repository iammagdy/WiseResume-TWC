import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Crypto Helpers ───

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Handle both standard base64 and base64url
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const raw = atob(normalized + padding);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt.length ? salt : new Uint8Array(32), ikm);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const result = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  for (let i = 1; offset < length; i++) {
    const input = new Uint8Array(t.length + info.length + 1);
    input.set(t);
    input.set(info, t.length);
    input[t.length + info.length] = i;
    t = await hmacSha256(prk, input);
    result.set(t.slice(0, Math.min(t.length, length - offset)), offset);
    offset += t.length;
  }
  return result.slice(0, length);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// ─── VAPID JWT ───

async function createVapidJwt(audience: string, vapidPrivateKey: Uint8Array, vapidPublicKey: Uint8Array): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:push@wiseresume.app",
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key as ECDSA P-256
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(vapidPublicKey.slice(1, 33)),
    y: base64UrlEncode(vapidPublicKey.slice(33, 65)),
    d: base64UrlEncode(vapidPrivateKey),
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsignedToken));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${unsignedToken}.${sigB64}`;
}

// ─── Web Push Encryption (RFC 8291 aes128gcm) ───

async function encryptPayload(
  payload: Uint8Array,
  subscriptionPublicKey: Uint8Array,
  subscriptionAuth: Uint8Array
): Promise<{ encrypted: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey("raw", subscriptionPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberKey }, localKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const enc = new TextEncoder();

  // IKM info = "WebPush: info\0" + ua_public (65 bytes) + as_public (65 bytes)
  const ikmInfo = concatUint8Arrays(enc.encode("WebPush: info\0"), subscriptionPublicKey, localPublicKeyRaw);

  // IKM = HKDF(auth, sharedSecret, ikmInfo, 32)
  const ikm = await hkdf(subscriptionAuth, sharedSecret, ikmInfo, 32);

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK info = "Content-Encoding: aes128gcm\0"
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce info = "Content-Encoding: nonce\0"
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload with delimiter
  const paddedPayload = concatUint8Arrays(payload, new Uint8Array([2])); // delimiter byte

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload));

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);

  const idlen = new Uint8Array([localPublicKeyRaw.length]);

  const encrypted = concatUint8Arrays(salt, rsBytes, idlen, localPublicKeyRaw, ciphertext);

  return { encrypted, localPublicKey: localPublicKeyRaw };
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url, icon, badge } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "user_id, title, and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKeyB64 = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const vapidPublicKey = base64ToUint8Array(vapidPublicKeyB64);
    const vapidPrivateKey = base64ToUint8Array(vapidPrivateKeyB64);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch subscriptions for user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/icon-96x96.png",
    });
    const payloadBytes = new TextEncoder().encode(payload);

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const subPublicKey = base64ToUint8Array(sub.p256dh);
        const subAuth = base64ToUint8Array(sub.auth);

        const { encrypted } = await encryptPayload(payloadBytes, subPublicKey, subAuth);

        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
        const vapidJwt = await createVapidJwt(audience, vapidPrivateKey, vapidPublicKey);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "Content-Length": encrypted.length.toString(),
            TTL: "86400",
            Urgency: "normal",
            Authorization: `vapid t=${vapidJwt}, k=${vapidPublicKeyB64}`,
          },
          body: encrypted.buffer,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          expiredEndpoints.push(sub.endpoint);
          failed++;
        } else {
          const text = await response.text();
          console.error(`Push failed for endpoint ${sub.endpoint}: ${response.status} ${text}`);
          failed++;
        }
      } catch (err) {
        console.error(`Error sending to ${sub.endpoint}:`, err);
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, cleaned: expiredEndpoints.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
