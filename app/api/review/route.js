// app/api/review/route.js
export async function GET() {
  // Temporary placeholder – returns empty list so UI doesn't 404
  return new Response(JSON.stringify([]), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
