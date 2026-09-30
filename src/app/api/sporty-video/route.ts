import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const playId = req.nextUrl.searchParams.get("playId");
  if (!playId) return NextResponse.json({ error: "playId required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://baseballsavant.mlb.com/sporty-videos?playId=${encodeURIComponent(playId)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Referer": "https://baseballsavant.mlb.com/",
        },
      }
    );

    const html = await res.text();
    const match = html.match(/src="(https:\/\/sporty-clips\.mlb\.com\/[^"]+\.mp4)"/);
    if (!match) {
      return NextResponse.json({ error: "video not found" }, { status: 404 });
    }

    // Savant HTML-escapes URL attributes (e.g. base64 '==' becomes '&#x3D;&#x3D;')
    const videoUrl = match[1]
      .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&amp;/g, "&");

    return NextResponse.json({ videoUrl });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
