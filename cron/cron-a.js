const cheerio = require("cheerio");
const con = require("../db").db;
var CronJob = require("cron").CronJob;
const puppeteer = require("puppeteer");

const cron = new CronJob("*/3 * * * *", function () {
  main();
});
let linkDone = [];
async function main() {
  linkDone = [];
  const browser = await puppeteer.launch({ headless: true });
  var links = require("../urls/a").urls;
  var pag = [];
  for (let i = 0; i < links.length; i++) {
    let page = await browser.newPage();
    pag.push(await t(links[i],page))
    if(links.length==pag.length){
      setTimeout(async () => {
        for (let index = 0; index < pag.length; index++) {
          let data = await scrap(links[index],browser,pag[index]);
          console.log(data)
          if(data!='err'){
            await con.query(
              "SELECT * FROM `tweets_replies` where time='" +
                data.time +
                "' and link='" +
                links[index].split("/")[3] +
                "'",
              async (error, results, fields) => {
                if (error) console.log(error);
                else {
                  if (results.length == 0) {
                    let inserted = await con.query(
                      "insert into `tweets_replies` (time, link, data) values ('" +
                        data.time +
                        "', '" +
                        links[index].split("/")[3] +
                        "','" +
                        JSON.stringify(data) +
                        "')"
                    );
                    let updated = await con.query(
                      "update `tweets_replies` set time='" +
                        data.time +
                        "' where link='" +
                        links[index].split("/")[3] +
                        "'"
                    );
                    if (inserted && updated) {
                      con.query(
                        "SELECT link,time,data, SUM(isnew) as unread FROM `tweets_replies` GROUP BY link ORDER by Date(time) desc;",
                        async (error, results, fields) => {
                          if (error) console.log(error);
                          else {
                            console.log(results);
                            var io = require("../index").io;
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
          if (pag.length == index + 1) {
            console.log("close");
            await browser.close();
          }
        }
      }, 10000);
    }
  }
}
async function scrap(link,browser,pageg) {
  let promise = await new Promise(async (resolve, reject) => {
    try {
      await pageg.waitForSelector(".r-kzbkwu"); //
      const element = await pageg.waitForSelector(
        'section[aria-labelledby="accessible-list-0"]'
      );
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
      console.log("close");
      await browser.close();
      resolve('err');
      linkDone = []
    }
  });
  let result = await promise;
  return result;
}

async function t(link,page){
    let a = await new Promise(async (resolve, reject) => {
      await page.goto(link);
      resolve(page)
    })
    return await a;
}

cron.start();
