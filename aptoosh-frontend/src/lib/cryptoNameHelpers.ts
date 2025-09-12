const ansCache = new Map<string, Promise<string | null>>();

export async function resolveName(address: string): Promise<string | null> {
  return address; //TODO implement
}

export async function resolveAns(address: string): Promise<string | null> {
  // Check in-memory first
  if (ansCache.has(address)) return ansCache.get(address)!;

  // Check localStorage
  const cached = localStorage.getItem(`ans_${address}`);
  if (cached !== null) {
    const result = cached || null;
    ansCache.set(address, Promise.resolve(result));
    return result;
  }

//TODO: need to abstract this
  // Fire the query immediately and cache the promise
  const fetchPromise = (async () => {
    try {
      const res = await fetch("https://indexer.mainnet.aptoslabs.com/v1/graphql", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          query: `
            query ReverseLookup($address: String!) {
              current_aptos_names(where: { owner_address: { _eq: $address } }) {
                name
              }
            }
          `,
          variables: {address},
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const name: string | null =
        data?.data?.current_aptos_names?.[0]?.name ?? null;

      localStorage.setItem(`ans_${address}`, name ?? "");
      return name;
    } catch {
      return null;
    }
  })();

  ansCache.set(address, fetchPromise);
  return fetchPromise;
}
