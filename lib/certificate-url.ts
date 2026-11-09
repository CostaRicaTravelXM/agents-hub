/** Public verify page for a certificate code. Kept absolute (with https://) because it is printed as a QR code. */
export function certificateVerifyUrl(appUrl: string, code: string) {
  return `${appUrl.replace(/\/+$/, "")}/verify/${encodeURIComponent(code)}`;
}
