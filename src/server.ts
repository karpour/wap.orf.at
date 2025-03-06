import express, { query } from 'express';
import path from 'path';
import { TrafficInfo } from './TrafficInfo';
import { pipeline } from 'stream';
import { read } from 'fs';
import OrfApi, { FEED_TITLES, FEED_TYPES, OrfFeedType } from './OrfApi';
import { getImageStream } from './getImageStream';
import { encodeEntities } from './encodeEntities';



const app = express();
const port = 3015;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "..", 'views'));

app.use("/img", express.static(path.join(__dirname, "..", "img")));

express.static.mime.define({ "image/vnd.wap.wbmp": ["wbmp"] });

// Middleware to set a default MIME type for all responses
app.use((req, res, next) => {
    res.setHeader("Content-Type", "text/vnd.wap.wml"); // Set default MIME type
    next();
});

// Home page
app.get('/', async (req, res) => {
    res.render('index');
});

app.get('/verkehr', async (req, res) => {
    const trafficInfo = await TrafficInfo.getTrafficInfo();
    const data = {
        trafficInfo
    };
    res.render('verkehr', data);
    res.end();
});

app.get('/feed/:feedType', async (req, res) => {
    res.setHeader("Content-Type", "text/vnd.wap.wml");
    const feedType = req.params.feedType as OrfFeedType;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItems = await feed.getFeed();
    const dateFormatted = "2020"; // TODO
    const title = FEED_TITLES[feedType];

    const data = {
        feedType,
        newsItems,
        dateFormatted,
        title,
        encodeEntities
    };
    res.render('feed', data);
});

app.get('/feed/:feedType/:id', async (req, res) => {
    res.setHeader("Content-Type", "text/vnd.wap.wml");
    const feedType = req.params.feedType as OrfFeedType;
    const id = req.params.id;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItem = await feed.getNewsItem(id);
    const dateFormatted = ""; // TODO
    const title = FEED_TITLES[feedType];

    const data = {
        feedType,
        newsItem,
        dateFormatted,
        title
    };
    res.render('article', data);
});


app.get('/ua/', async (req, res) => {
    console.log("USER AGENT");
    console.log(req.get('user-agent'));
    console.log(req.headers);
    res.render('index');
});

app.get('/show/', async (req, res) => {
    res.setHeader("Content-Type", "text/vnd.wap.wml");
    res.render('img');
});

app.get("/aimg/:feedType/:id", async (req, res) => {
    const mimeType = "image/gif";

    const feedType = req.params.feedType as OrfFeedType;
    const id = req.params.id;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItem = await feed.getNewsItem(id);

    // Set response headers for GIF output
    res.setHeader("Content-Type", mimeType);

    if (newsItem.img) {
        // Properly pipeline the streams
        const imageStream = await getImageStream(newsItem.img, 96, 96, mimeType);

        pipeline(
            imageStream,
            res,
            (err) => {
                if (err) {
                    console.error("Pipeline error:", err);
                    res.status(500).send("Error streaming image");
                }
            }
        );
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
