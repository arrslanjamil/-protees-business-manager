/** Biometric authentication using WebAuthn API.
 * Supports Face ID (mobile) and fingerprint/Touch ID (desktop). */

export interface BiometricCredential {
  id: string
  userId: string
  credentialId: string
  publicKey: string
  counter: number
  createdAt: string
  deviceType: 'mobile' | 'desktop'
}

/** Detect if device is mobile or desktop */
export function getDeviceType(): 'mobile' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase()
  return /mobile|android|iphone|ipad|touch/.test(ua) ? 'mobile' : 'desktop'
}

/** Check if WebAuthn is supported */
export function isBiometricAvailable(): boolean {
  try {
    const pkc = (globalThis as any).PublicKeyCredential
    if (!pkc) return false
    if (!navigator.credentials?.create) return false
    if (!navigator.credentials?.get) return false
    return true
  } catch {
    return false
  }
}

/** Get platform authenticator availability (Face ID, Touch ID, Windows Hello, etc.) */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricAvailable()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Register a biometric credential (enrollment) */
export async function registerBiometric(userId: string, username: string): Promise<BiometricCredential | null> {
  try {
    if (!isBiometricAvailable()) return null

    const deviceType = getDeviceType()
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Protees Business Manager',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
        } as any,
      },
    }) as PublicKeyCredential | null

    if (!credential) return null

    const attestationObject = new TextEncoder().encode(
      JSON.stringify({
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          attestationObject: Array.from(
            new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)
          ),
          clientDataJSON: Array.from(
            new Uint8Array((credential.response as AuthenticatorAttestationResponse).clientDataJSON)
          ),
        },
      })
    )

    return {
      id: credential.id,
      userId,
      credentialId: credential.id,
      publicKey: btoa(String.fromCharCode(...new Uint8Array(attestationObject))),
      counter: 0,
      createdAt: new Date().toISOString(),
      deviceType,
    }
  } catch (error) {
    console.error('Biometric registration failed:', error)
    return null
  }
}

/** Authenticate with biometric (login) */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    if (!isBiometricAvailable()) return false

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
      } as any,
    }) as PublicKeyCredential | null

    return !!assertion
  } catch (error) {
    console.error('Biometric authentication failed:', error)
    return false
  }
}

/** Get a user-friendly label for the biometric method */
export function getBiometricLabel(): string {
  const deviceType = getDeviceType()
  if (deviceType === 'mobile') {
    return 'Face Recognition'
  }
  return 'Fingerprint / Touch ID'
}
