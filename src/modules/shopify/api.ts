/** Bu fonksiyonlar backend (sunucu) uçlarına istek atar.
 *  Access Token asla frontendte tutulmaz. */
export async function shopifyCreateProduct(payload: any) {
  const r = await fetch("/api/shopify/create-product", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Shopify create error");
  return await r.json();
}
