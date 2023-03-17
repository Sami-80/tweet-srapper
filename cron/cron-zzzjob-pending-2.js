const cheerio = require("cheerio");
const con = require("./db").db;
var CronJob = require("cron").CronJob;
const puppeteer = require("puppeteer");

const cron = new CronJob("* * * * *", function () {
  main();
});
let linkDone = [];
async function main() {
  linkDone = [];
  const browser = await puppeteer.launch({ headless: false });
  var links = [
    "https://twitter.com/BreitBrianna/with_replies",
    "https://twitter.com/AnneCreative/with_replies",
  ];
  let page = await browser.newPage();
  for (let i = 0; i < links.length; i++) {
    let data = await scrap(links[i],browser,page,linkDone);
    if(data!='err'){
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
    }
    if (links.length == i + 1) {
      console.log("close");
      await browser.close();
    }
  }
}
async function scrap(link,browser,page,linkDone) {
  let promise = await new Promise(async (resolve, reject) => {
    try {
      await page.goto(link, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".r-kzbkwu"); //
      const element = await page.waitForSelector(
        'section[aria-labelledby="accessible-list-0"]'
      ); //.r-kzbkwu
      const value = await element.evaluate((el) => el.innerHTML);
      var $ = cheerio.load(value);
      $(".r-kzbkwu").each(function (ii, elm) {
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
            replytolink: replytolink,
            time: time,
          };
          linkDone.push(link);
          resolve(data);
        }
      });
    } catch (error) {
      console.log('Internal Error')
      console.log("close");
      await browser.close();
      resolve('err');
      linkDone = []
    }
  });
  let result = await promise;
  return result;
}
// cron.start();
