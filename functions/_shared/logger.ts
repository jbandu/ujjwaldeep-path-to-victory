export function logJSON(o: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), ...o }))
  } catch {
    console.log(o)
  }
}
