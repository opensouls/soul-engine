import TurndownService from "turndown"
import { Browser } from "puppeteer";

export interface WebBrowserArgs {
  browser: Browser;
  url: string;
  waitFor?: string;
}

const metadataFunction = `

const _unescapeHtmlEntities = function(str) {
  if (!str) {
    return str;
  }

  var htmlEscapeMap = this.HTML_ESCAPE_MAP;
  return str.replace(/&(quot|amp|apos|lt|gt);/g, function(_, tag) {
    return htmlEscapeMap[tag];
  }).replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi, function(_, hex, numStr) {
    var num = parseInt(hex || numStr, hex ? 16 : 10);
    return String.fromCharCode(num);
  });
}

const _getArticleMetadata = function() {
  var metadata = {};
  var values = {};
  const metaElements = document.querySelectorAll("meta");

  // property is a space-separated list of values
  var propertyPattern = /\\s*(dc|dcterm|og|twitter)\\s*:\\s*(author|creator|description|title|site_name)\\s*/gi;

  // name is a single value
  var namePattern = /^\\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\\s*[\\.:]\\s*)?(author|creator|description|title|site_name)\\s*$/i;

  // Find description tags.
  metaElements.forEach(function(element) {
    var elementName = element.getAttribute("name");
    var elementProperty = element.getAttribute("property");
    var content = element.getAttribute("content");
    if (!content) {
      return;
    }
    var matches = null;
    var name = null;

    if (elementProperty) {
      matches = elementProperty.match(propertyPattern);
      if (matches) {
        // Convert to lowercase, and remove any whitespace
        // so we can match below.
        name = matches[0].toLowerCase().replace(/\s/g, "");
        // multiple authors
        values[name] = content.trim();
      }
    }
    if (!matches && elementName && namePattern.test(elementName)) {
      name = elementName;
      if (content) {
        // Convert to lowercase, remove any whitespace, and convert dots
        // to colons so we can match below.
        name = name.toLowerCase().replace(/\\s/g, "").replace(/\\./g, ":");
        values[name] = content.trim();
      }
    }
  });

  // get title
  metadata.title = values["dc:title"] ||
                   values["dcterm:title"] ||
                   values["og:title"] ||
                   values["weibo:article:title"] ||
                   values["weibo:webpage:title"] ||
                   values["title"] ||
                   values["twitter:title"];

  // if (!metadata.title) {
  //   metadata.title = this._getArticleTitle();
  // }

  // get author
  metadata.byline = values["dc:creator"] ||
                    values["dcterm:creator"] ||
                    values["author"];

  // get description
  metadata.excerpt = values["dc:description"] ||
                     values["dcterm:description"] ||
                     values["og:description"] ||
                     values["weibo:article:description"] ||
                     values["weibo:webpage:description"] ||
                     values["description"] ||
                     values["twitter:description"];

  // get site name
  metadata.siteName = values["og:site_name"];

  // in many sites the meta value is escaped with HTML entities,
  // so here we need to unescape it
  metadata.title = _unescapeHtmlEntities(metadata.title);
  metadata.byline = _unescapeHtmlEntities(metadata.byline);
  metadata.excerpt = _unescapeHtmlEntities(metadata.excerpt);
  metadata.siteName = _unescapeHtmlEntities(metadata.siteName);

  return metadata;
}
`.trim();

interface Document {
  metadata: Record<string, any>;
  pageContent: string;
}

export class WebLoader {
  browser: Browser;
  waitFor?: string;
  url: string;

  constructor({
    waitFor,
    browser,
    url,
  }: WebBrowserArgs) {
    this.browser = browser;
    this.waitFor = waitFor;
    this.url = url;
  }

  private async _scrape(): Promise<[Record<string, any>, string, { src: string, alt: string, width: number, height: number }[]]> {
    const browser = this.browser;

    const page = await browser.newPage();
    try {
      // don't use a headless user agent since many sites will block that.
      await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36")
      await page.goto(this.url, { waitUntil: "domcontentloaded" });

      await new Promise((resolve) => setTimeout(resolve, 150));

      if (this.waitFor) {
        await page.waitForSelector(this.waitFor);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const meta = await page.evaluate(`
      ${metadataFunction}
      _getArticleMetadata()
    `.trim()) as any as Record<string, any>;

      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("img")).filter((img) => {
          return (img.height && img.height > 250) || (img.width && img.width > 250)
        }).map((img) => {
          return {
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height,
          };
        }).sort((a, b) =>
          b.width * b.height - a.width * a.height
        ); // sort by area
      });

      const html = await page.evaluate(() => {
        document.querySelectorAll("img").forEach((el) => el.replaceWith(document.createTextNode(el.alt || "")))

        document.querySelectorAll("noscript,script,iframe,embed,object,canvas,form,svg,img").forEach((el) => el.remove())
        return document.body.innerHTML;
      });
      const turndownService = new TurndownService()
      turndownService.remove("script")
      turndownService.remove("style")
      turndownService.remove("object")
      turndownService.remove("embed")

      const md = turndownService.turndown(html)

      return [{
        ...meta,
        source: this.url,
      }, md, images];
    } catch (err) {
      console.error("error scraping: ", this.url, err);
      throw err
    } finally {
      await page.close();
    }
  }

  async load(): Promise<Document> {
    const [meta, html, images] = await this._scrape();
    return { metadata: { ...meta, images }, pageContent: html }
  }
}
