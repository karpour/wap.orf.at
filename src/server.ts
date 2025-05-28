import express, { NextFunction, query } from 'express';
import path from 'path';
import { TrafficInfo } from './TrafficInfo';
import { pipeline } from 'stream';
import OrfApi, { FEED_TITLES, FEED_TYPES, OrfFeedType } from './OrfApi';
import { getImageStream } from './getImageStream';
import { encodeEntities } from './encodeEntities';
import { getCurrentDateTime } from './getCurrentDateTime';
import { detectMode } from './detectMode';

const app = express();
const port = 3015;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "..", 'views'));

app.use("/img", express.static(path.join(__dirname, "..", "img")));

express.static.mime.define({ "image/vnd.wap.wbmp": ["wbmp"] });

app.use(detectMode);

// Home page
app.get('/', async (req, res) => {
    console.log("Rendering index")
    res.render('index');
});

app.get('/verkehr', async (req, res) => {
    const trafficInfo = await TrafficInfo.getTrafficInfo();
    res.render('verkehr', { trafficInfo });
});

app.get('/feed/:feedType', async (req, res) => {
    const feedType = req.params.feedType as OrfFeedType;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItems = await feed.getFeed();
    const dateFormatted = getCurrentDateTime();
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
    const feedType = req.params.feedType as OrfFeedType;
    const id = req.params.id;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItem = await feed.getNewsItem(id);
    const dateFormatted = getCurrentDateTime();
    const title = FEED_TITLES[feedType];

    const data = {
        feedType,
        newsItem,
        dateFormatted,
        title,
    };
    res.render('article', data);
});


app.get('/ua/', async (req, res) => {
    console.log("USER AGENT: " + req.get('user-agent'));
    console.log(req.headers);
    console.log(req.headers.accept);
    res.end(req.get('user-agent'));
});

app.get("/aimg/:feedType/:id", async (req, res) => {
    const feedType = req.params.feedType as OrfFeedType;
    const id = req.params.id;
    if (!FEED_TYPES.includes(feedType)) {
        console.error(`Unknown feedtype: ${feedType}`);
        res.render("404");
    }
    const feed = OrfApi.feeds[feedType];
    const newsItem = await feed.getNewsItem(id);

    // Set response headers for GIF output
    res.setHeader("Content-Type", res.locals.imageFormat);

    if (newsItem.img) {
        // Properly pipeline the streams
        const imageStream = await getImageStream(newsItem.img, 96, 96, res.locals.imageFormat);

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

