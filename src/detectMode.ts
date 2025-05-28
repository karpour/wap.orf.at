import { NextFunction, Response, Request } from "express";

export type ImageFormat = "gif" | "wbmp";
export const RENDER_MODES = ["wap", "wap2"] as const;
export type RenderMode = typeof RENDER_MODES[number];


const imageMimeTypeMapping: { [key in ImageFormat]: string } = {
    "gif": "image/gif",
    "wbmp": "image/vnd.wap.wbmp"
};

function getImageFormat(acceptHeaders?: string): ImageFormat {
    return acceptHeaders && acceptHeaders.includes("image/gif") ? "gif" : "wbmp";
}

declare module 'express-serve-static-core' {
    interface Locals {
        mode: RenderMode;
        imageFormat: ImageFormat;
    }
}

/** Mode detection middleware */
export function detectMode(req: Request, res: Response, next: NextFunction) {
    // Attach mode to response locals
    res.locals.mode = getMode(req.headers);
    res.locals.imageFormat = getImageFormat(req.headers.accept);
    if (req.query.mode && RENDER_MODES.includes(req.query.mode as RenderMode)) {
        res.locals.mode = req.query.mode as RenderMode;
    }

    if (res.locals.mode === "wap2") {
        //res.header("Content-Type", "application/xhtml+xml");
        res.locals.imageFormat = "gif";
    } else if (res.locals.mode === "wap") {
        res.setHeader("Content-Type", "text/vnd.wap.wml"); // Set default MIME type
    }

    console.log(`Detected mode: ${res.locals.mode}/${res.locals.imageFormat}`);
    // Monkey patch res.render
    const originalRender = res.render.bind(res);
    res.render = (view: string, options?: object, callback?: (err: Error, html: string) => void) => {
        const modePrefixedView = `${res.locals.mode}/${view}`;
        return originalRender(modePrefixedView, { ...options, mode: res.locals.mode }, callback);
    };

    next();
}


export function getMode(headers: any): RenderMode {
    if (headers["accept"]?.includes("application/vnd.wap.xhtml+xml") &&
        headers["accept"]?.includes("text/vnd.wap.wml") &&
        headers["x-wap-profile"]) {
        return "wap2";
    } else if (headers["accept"]?.includes("text/vnd.wap.wml")) {
        return "wap";
    } else {
        return "wap2";
    }
}
