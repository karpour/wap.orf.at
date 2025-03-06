# wap.orf.at

A recreation of the ORF WAP portal. ORF is the Austrian Public Broadcasting service.

The markup is based on [the archived pages of wap.orf.at](https://web.archive.org/web/*/http://wap.orf.at:80/*), however changes were made:

- Images had to be recreated as these have not been archived and could not be found
- Futurezone is not part of ORF anymore and was removes
- Kultur is not a separate category in the ORF news feed

## Sections

### News

For news sources the following RSS feeds are used:

- [oe3 news](https://rss.orf.at/oe3.xml)
- [orf news](https://rss.orf.at/news.xml)
- [orf sport](https://rss.orf.at/sport.xml)

The RSS feeds are used to retrieve headlines and links to stories. The stories themselves are scraped and parsed using JSDom.
For every story, the paragraphs are extracted, as well as the first image, which is scaled down using imagemagick and served on the article page.

### Traffic information

For traffic info the API endpoint of Ö3 is used:

[oe3 Verkehrsinfo](https://oe3meta.orf.at/oe3api/ApiV2.php/TrafficInfo.json)