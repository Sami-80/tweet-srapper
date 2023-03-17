const cheerio = require("cheerio");
const con = require("./db").db;
var CronJob = require("cron").CronJob;
// const cron = new CronJob("* * * * *", function () {
//   main();
// });

let page;
let page2;
var output = [];
var linkDone = [];
let browser;

async function main() {
  const puppeteer = require("puppeteer");
  linkDone = [];
  browser = await puppeteer.launch({ headless: false });
  var links = [
    "https://twitter.com/gfx_evelyn/with_replies",
    "https://twitter.com/elonmusk/with_replies",
    "https://twitter.com/Annigfx1/with_replies",
    'https://twitter.com/BreitBrianna/with_replies',
    'https://twitter.com/AnneCreative/with_replies',
    'https://twitter.com/Jessicadesign3/with_replies',
    'https://twitter.com/KaylenJoseph/with_replies',
    'https://twitter.com/weiss1_erica/with_replies'
  ];

  page = await browser.newPage();

  for (let i = 0; i < links.length; i++) {
    let data = await scrap(links[i]);
    con.query(
      "SELECT * FROM `tweets_replies` where time='" +
        data.time +
        "' and link='" +
        links[i].split("/")[3] +
        "'",
      async (error, results, fields) => {
        if (error) console.log(error);
        else {
          if (results.length == 0) {
            let inserted = await con.query(
              "insert into `tweets_replies` (time, link, data) values ('" +
                data.time +
                "', '" +
                links[i].split("/")[3] +
                "','" +
                JSON.stringify(data) +
                "')"
            );
            let updated = await con.query(
              "update `tweets_replies` set time='" +
                data.time +
                "' where link='" +
                links[i].split("/")[3] +
                "'"
            );
            if (inserted && updated) {
              con.query(
                "SELECT link,time,data, SUM(isnew) as unread FROM `tweets_replies` GROUP BY link ORDER by Date(time) desc;",
                async (error, results, fields) => {
                  if (error) console.log(error);
                  else {
                    console.log(results);
                    var io = require("./index").io;
                    io.emit("NEW_NOTIFICATION", { data: results });
                  }
                }
              );
            }
          }
        }
      }
    );
    if (links.length == i + 1) {
      console.log("close");
      await browser.close();
    }
  }
}

async function scrap(link) {
  let promise = await new Promise(async (resolve, reject) => {
    await page.goto(link, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".r-kzbkwu"); //
    const element = await page.waitForSelector(
      'section[aria-labelledby="accessible-list-0"]'
    ); //.r-kzbkwu
    const value = await element.evaluate((el) => el.innerHTML);
    var $ = cheerio.load(value);
    $(".r-kzbkwu").each(async function (ii, elm) {
      if (
        $(this).text().indexOf("Replying") != -1 &&
        linkDone.indexOf(link) == -1
      ) {
        let d = $(this).html();
        let $$ = cheerio.load(d);
        let replytolink = $$("time").parent().attr("href");
        let time = $$("time").attr("datetime");
        let message = $$('div [data-testid="tweetText"]').text();
        let replyto = $$(".r-4qtqp9").text();
        let name = $$(".r-zl2h9q")
          .text()
          .replace(replyto, "")
          .split("·")
          .slice(0, -1)[0];
        let data = {
          name: "@" + name.split("@")[1],
          message: Buffer.from(message).toString('base64'),
          replyto: replyto,
          replytolink: replytolink, //await mainTweet(replytolink, page),
          time: time,
        };
        console.log(data);
        linkDone.push(link);
        resolve(data);
      }
    });
  });
  let result = await promise;
  return result;
}
async function mainTweet(link, page) {
  let promise = await new Promise(async (resolve, reject) => {
    // value = "OK";
    console.log("https://twitter.com" + link);
    const page3 = await browser.newPage();
    await page3.goto(
      "https://twitter.com/gfx_evelyn/status/1615697093989117958"
    );
    const element = await page.waitForSelector('div[data-testid="tweetText"]'); //.r-kzbkwu
    const value = await element.evaluate((el) => el.textContent);
    resolve(value);
  });
  let result = await promise;
  return result;
}
main();
// cron.start();
