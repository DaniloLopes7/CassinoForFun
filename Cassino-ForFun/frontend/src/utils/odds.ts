export function fmtOdds(odds: number): string {
  return odds.toFixed(2);
}
export function rankName(rank: number): string {
  return ['?', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][rank] || String(rank);
}
