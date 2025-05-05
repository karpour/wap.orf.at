import Parser from "rss-parser";
import { JSDOM } from "jsdom";
import { useAdapter } from "@type-cacheable/lru-cache-adapter";
import { LRUCache } from "lru-cache";
import { Cacheable } from "@type-cacheable/core";
import { encodeEntities } from "./encodeEntities";
const parser = new Parser<any, OrfFeedItem>();

const RSS_ORF_NEWS = "https://rss.orf.at/news.xml";

const FEEDS = {
    "oe3": "https://rss.orf.at/oe3.xml",
    "orf": "https://rss.orf.at/news.xml",
    "sport": "https://rss.orf.at/sport.xml"
} as const;


export type OrfFeedType = keyof typeof FEEDS;

export const FEED_TYPES: OrfFeedType[] = Object.keys(FEEDS) as OrfFeedType[];

const FEED_ITEM_URLS: { [key in OrfFeedType]: string } = {
    "oe3": "https://oe3.orf.at/stories",
    "orf": "https://orf.at/stories",
    "sport": "https://sport.orf.at/stories"
} as const;

export const FEED_TITLES: { [key in OrfFeedType]: string } = {
    "oe3": "&#214;3 News",
    "orf": "ORF News",
    "sport": "ORF Sport"
} as const;

export type OrfFeedItem = {
    date: string,
    title: string,
    link: string,
    'dc:date': string,
    content: string,
    contentSnippet: string,
    'rdf:about': string,
    isoDate: string,
    id: string;
};

export type OrfArticle = {
    title: string,
    img?: string,
    paragraphs: string[],
    formattedDate: string;
    id: string;
};


class OrfApi {
    private readonly feedCache: LRUCache<string, OrfFeedItem[]>;
    private readonly itemCache: LRUCache<string, OrfArticle>;

    public constructor(public readonly feedType: OrfFeedType) {
        this.feedCache = new LRUCache({ max: 10, ttl: 1000 * 600 }); // 5 minutes
        this.itemCache = new LRUCache({ max: 50, ttl: 1000 * 600 }); // 10 minutes
    }

    public static readonly feeds: { [key in OrfFeedType]: OrfApi } = {
        "oe3": new OrfApi("oe3"),
        "orf": new OrfApi("orf"),
        "sport": new OrfApi("sport")
    };

    static setCacheKey(args: any[], context: OrfApi) {
        console.log(args);
        console.log(context);
        const key = `${context.feedType}${args[0] ?? "feed"}`;
        console.log(`Generated key ${key}`);
        return key;
    }

    public async getFeed(): Promise<OrfFeedItem[]> {
        const cacheKey = 'feed';
        const cached = this.feedCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const url = FEEDS[this.feedType];
        console.log(`Fetching ${url}`);
        let feed = (await parser.parseURL(FEEDS[this.feedType])).items as OrfFeedItem[];

        for (const f of feed) {
            const r = /orf\.at\/stories\/(\d+)\//.exec(f.link);
            if (r?.[1]) {
                f.id = r[1];
            }
        }

        // Filter out non-id-items
        return feed.filter(f => f.id !== undefined);
    }

    public async getNewsItem(id: string): Promise<OrfArticle> {
        const cached = this.itemCache.get(id);
        if (cached) {
            return cached;
        }

        try {
            // Fetch the HTML from the website
            const url = `${FEED_ITEM_URLS[this.feedType]}/${id}/`;
            console.log(`Fetching ${url}`);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);


            const html = await response.text();

            //console.log(html);
            // Load the HTML into Cheerio
            const dom = new JSDOM(html);
            const document = dom.window.document;

            let title = "Unknown";
            let img: string | undefined;
            let paragraphs: string[] = [];
            let formattedDate = "MM.YY. HH:mm";


            if (this.feedType == "oe3") {
                // Extract the inner HTML of the <h1> element with class "story-lead-headline"
                // Use querySelector to get the element
                title = document.querySelector('#ss-storyText>h1')?.innerHTML ?? "";
                img = document.querySelector(".storyWrapper>img")?.getAttribute('src') ?? undefined;
                const text = document.querySelector(".teaser>strong")?.innerHTML.trim();

                if (text) {
                    paragraphs = [text];
                } else {
                    const p = Array.from(document.querySelectorAll("#ss-storyText>p")).map(p => p.innerHTML.trim()).filter(p => p !== "");
                    //console.log(`First paragraph length: ${p[0]?.length}`);
                    //console.log(`Total string length: ${totalStringLength(p)}`);
                    //console.log(p);
                    paragraphs = p;
                }
            } else {
                // Extract the inner HTML of the <h1> element with class "story-lead-headline"
                // Use querySelector to get the element
                title = document.querySelector('h1.story-lead-headline')?.innerHTML ?? document.querySelector('#ss-storyText>h1')?.innerHTML ?? "";
                img = document.querySelector(".story-content>div>figure.image>img")?.getAttribute('data-src') ?? undefined;
                const text = document.querySelector(".story-lead-text>strong")?.innerHTML.trim();

                if (text) {
                    paragraphs = [text];
                } else {
                    const p = Array.from(document.querySelectorAll(".story-story>p")).map(p => p.innerHTML);
                    //console.log(`First paragraph length: ${p[0]?.length}`);
                    //console.log(`Total string length: ${totalStringLength(p)}`);
                    //console.log(p);
                    paragraphs = p;
                }
            }

            paragraphs = paragraphs
                .filter(p => p !== "" && p != "<strong></strong>")
                .map(changeBreaks)
                .map(encodeEntitiesWithHtml);

            //console.log({
            //    title,
            //    img,
            //    paragraphs,
            //});



            return {
                title: encodeEntities(title),
                img,
                paragraphs,
                formattedDate,
                id
            };
        } catch (error) {
            //console.error('Error fetching the page:', error);
            throw error;
        }
    }
}

function changeBreaks(s: string): string {
    return s.replaceAll("<br>", "<br />");
}

function encodeEntitiesWithHtml(s: string): string {
    return s.replace(/(>|^)([^<]+)(<|$)/g, (match, openTag, text, closeTag) => {
        return openTag + encodeEntities(text) + closeTag;
    });
}

function totalStringLength(arr: string[]) {
    return arr.reduce((total, str) => total + str.length, 0);
}

//console.log(encodeEntities('ÖVP-Chef Christian & Stocker führt die Koalition als <strong>Bundes&kanzler</strong> an. Er ist am Dienstag zu Gast im Ö3-Wecker.<br><a href="https://oe3.orf.at/stories/3046659/">Stelle deine Frage an die neue Regierung!</a>'))

export default OrfApi;