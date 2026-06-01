import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

const FALLBACK_WEBSITES = [
  { name: "Wyzant", url: "https://www.wyzant.com/search" },
  { name: "Varsity Tutors", url: "https://www.varsitytutors.com/tutors" },
  { name: "Preply", url: "https://preply.com/en/online" },
  { name: "Kaplan", url: "https://www.kaptest.com/tutoring" },
  { name: "Princeton Review", url: "https://www.princetonreview.com/tutoring" },
  { name: "Tutor.com", url: "https://www.tutor.com" },
  { name: "Chegg Tutors", url: "https://www.chegg.com/tutors" },
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ websites: FALLBACK_WEBSITES });
  }

  try {
    const { exam, location } = await req.json();

    const query = `${exam} tutors ${location} tutoring services exam prep`;

    const client = new TinyFish({ apiKey });
    const data = await client.search.query({ query });

    const websites = (data.results || []).map(
      (r: { title: string; url: string }) => ({
        name: r.title,
        url: r.url,
      })
    );

    if (!websites.length) {
      return NextResponse.json({ websites: FALLBACK_WEBSITES });
    }

    return NextResponse.json({ websites });
  } catch (error) {
    console.error("Error in /api/discover:", error);
    return NextResponse.json({ websites: FALLBACK_WEBSITES });
  }
}